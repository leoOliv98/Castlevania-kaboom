# Resumo dos Prompts Utilizados no Desenvolvimento do Projeto (DEVES)

Este documento reúne e resume de forma cronológica os prompts utilizados durante o processo de desenvolvimento, integração e evolução do jogo **DEVES: O Despertar do Mago**, detalhando o objetivo de cada etapa e as implementações geradas.

---

## Prompt 1 — Registro de Tempo na Tela e Ranking Top 10 Global
> **Prompt utilizado:**  
> *"aplique a função de registrar o tempo do usuário e aparecer na tela. Verifique a funcionalidade de mostrar os 10 melhores tempo de todos os jogadores"*

### O que foi desenvolvido e corrigido:
1. **Cronômetro em Tempo Real na HUD (`frontend/js/cenas/game.js`)**:
   - Implementação do contador `tempoDecorridoSegundos` baseado em `dt()`, acumulando apenas durante o jogo ativo (pausando ao abrir o menu `ESC`).
   - Formatação em `MM:SS` (`TEMPO: 00:00`) posicionada na HUD sem sobrepor o slot de itens.
2. **Exibição e Registro do Tempo Final (`frontend/js/cenas/game.js` e `frontend/js/cenas/menu.js`)**:
   - Exibição de `TEMPO REGISTRADO: MM:SS` na tela ao derrotar o chefe final (`cenaVitoria`), ao morrer (`cenaMorte`) e no `cenaGameOver`.
   - Correção da leitura do usuário autenticado no `localStorage` (`loggedUser` / `username`) para envio via `POST /api/score`.
   - Restauração das colisões dos ataques do jogador (`ataqueJogador`, `ataqueBaixoJogador`, `bolaDeFogoJogador`) contra o chefe Lich.
3. **Correção do Top 10 Melhores Tempos (`server.js`, `dashboard.html` e `portal-auth.js`)**:
   - Ajuste da busca de ranking em `GET /api/scores` para filtrar apenas partidas vencidas (`status = 'VITORIA'`) e ordenar pelos menores tempos (`tempo_segundos ASC LIMIT 10`).
   - Resolução do conflito de seletores DOM entre a tabela de histórico pessoal (`#user-history-tbody`) e a tabela do Top 10 (`#leaderboard-tbody`).

---

## Prompt 2 — Resolução de Conflitos e Integração após `git pull`
> **Prompt utilizado:**  
> *"corrija os erros após o último git pull origin leonardo"*

### O que foi desenvolvido e corrigido:
1. **Unificação de Código e Resolução de Merge (`game.js`, `menu.js`, `jogador.js`)**:
   - Integração do novo sistema visual (`frontend/js/ui.js`) com fontes customizadas (`Gloock` e `Pixelify Sans`), partículas de brasas e textos flutuantes (`flutuar`, `rotulo`, `avisoCentral`).
   - Integração do subchefe **Guardião Mascarado** (`frontend/js/entidades/guardiao.js`), sistema de itens posicionados via Tiled (`frontend/js/itens.js`) e progressão da Fase 1 (Floresta com chave) para a Fase 2 (Caverna com o Lich) preservando o tempo acumulado da partida.

---

## Prompt 3 — Padronização da Identidade Visual para "DEVES"
> **Prompt utilizado:**  
> *"altere os arquivos html para o nome do jogo apareça como DEVES"*

### O que foi desenvolvido e corrigido:
1. **Atualização dos Títulos e Cabeçalhos Web (`web/pages/*.html`)**:
   - Alteração dos títulos (`<title>`), barras de navegação (`.nav-brand`) e cabeçalho principal (`<h1>`) nas páginas `dashboard.html`, `play.html`, `login.html` e `register.html` para **DEVES** / **DEVES: O Despertar do Mago**.

---

## Prompt 4 — Painel de Administração e Segurança de Sessão (Queda do Servidor e Timeout de 2 Minutos)
> **Prompt utilizado:**  
> *"faça uma opcao para o administrador poder ver os usuarios que tem cadastro como o email, senha, nome de usuario. Quando eu logeui no jogo e fechei o servidor e depois abri na mesma pagina que estava o server nao pediu para relogar e o jogo continuou normal. Fazer essa correção que após fehcar o servidor pedir para logar novamente. Se o usuario fechar a aba deixar um time de 2 minutos sem precisar logar, passou de 2 minutos o usuario terá que logar novamente"*

### O que foi desenvolvido e corrigido:
1. **Visualização de Usuários pelo Administrador (`GET /api/admin/users`)**:
   - Criação da listagem administrativa contendo ID, Nome de Usuário, E-mail, Senha (`password_plain`), Hash (`bcrypt`) e Data de Cadastro.
2. **Invalidação de Sessão ao Fechar/Reiniciar o Servidor (`server.js` e `portal-auth.js`)**:
   - Geração de `SERVER_BOOT_ID` único a cada inicialização do servidor e mapa de sessões em memória (`activeSessions`).
   - Heartbeat a cada 3 segundos (`POST /api/session/check`) em `dashboard.html` e `play.html`: se o servidor for fechado, o jogo é interrompido imediatamente e exige novo login assim que o servidor retorna.
3. **Tolerância de 2 Minutos com Aba Fechada (`POST /api/session/tab-close`)**:
   - Registro do fechamento da aba (`pagehide` / `beforeunload` + `navigator.sendBeacon`).
   - Reabertura em até 2 minutos mantém a sessão ativa; após 2 minutos (`120.000 ms`), a sessão expira e redireciona para `/login.html`.

---

## Prompt 5 — Restrição Exclusiva de Administrador ao Usuário `overlord 1`
> **Prompt utilizado:**  
> *"agora todos os usuarios estao como adminstradores, deixe somente o usuario: overlord 1 como administrador, os outros usuarios nao podem ter acesso a essas informacoes"*

### O que foi desenvolvido e corrigido:
1. **Controle de Acesso Baseado em Identidade (`isUsuarioAdmin`)**:
   - No backend (`server.js`), a rota `GET /api/admin/users` exige token de sessão válido pertencente exclusivamente ao usuário **`overlord 1`**, retornando `403 Forbidden` para qualquer outro jogador.
   - No frontend (`portal-auth.js`, `dashboard.html`, `login.html`), o botão e a tabela de administração são removidos do DOM para todos os usuários comuns.

---

## Prompt 6 — Modo de Teste (`godmod`) durante o Jogo
> **Prompt utilizado:**  
> *"se na tela do jogo o usuario digitar godmod exatamente assim o personagem não morre, e fica com o item asas ativo desde o inicio com tempo infinito. (é para conseguirmos testar as funções do jogo)"*

### O que foi desenvolvido e corrigido:
1. **Detector de Sequência `godmod` (`menu.js`, `game.js` e `jogador.js`)**:
   - Captura de teclado via `onCharInput` que reconhece a digitação exata de `godmod`.
   - Ativa imortalidade (`player.godMode = true`, ignorando danos de inimigos, chefes e abismos) e adiciona o item **Asas** com voo infinito (`player.ativarVoo(Infinity)`) desde o início e entre transições de fases.

---

## Prompt 7 — Implementação de ORM, Proteção no `.gitignore`, Slides e Relatório Técnico
> **Prompt utilizado:**  
> *"implemente o orm no projeto e insira no gitignore para não salvar no git os dados cadastrados relacionados ao usuário. e também faça um arquivo resumindo os prompts que utilizei durante o processo. Faça uma apresentação em slides focando nos principais pontos do codigo como linguagem utilizada, apis, estruturas do codigo. faça um relatório técnico do projeto"*

### O que foi desenvolvido e corrigido:
1. **Camada ORM (`database/orm.js` e `database/models/`)**:
   - Implementação do ORM mapeando os modelos [`User`](file:///d:/Projeto%20Game/Castlevania-kaboom/database/models/User.js) e [`Score`](file:///d:/Projeto%20Game/Castlevania-kaboom/database/models/Score.js) com sincronização automática de schema (`orm.sync()`) e métodos `create`, `findOne`, `findAll`, `update` e `destroy`.
   - Refatoração completa do `server.js` para utilizar os modelos do ORM em todas as rotas.
2. **Proteção de Dados no `.gitignore`**:
   - Inclusão de regras ignorando volumes de dados (`pgdata/`), dumps, bancos locais e arquivos de exportação de usuários.

---

## Prompt 8 — Itens Posicionados pelo Tiled, Chave e Fim de Fase
> **Prompt utilizado (resumo):**  
> *Pedido para que os itens (poção de vida, poção de mana, asas, chave) passassem a nascer nas posições marcadas no mapa do Tiled, e para que a fase só terminasse ao pegar a chave e chegar ao objeto `fim-level`.*

### O que foi desenvolvido e corrigido:
1. **Itens vindos do mapa (`frontend/js/itens.js`, `frontend/js/cenas/game.js`)**:
   - Leitura da camada de objetos do `.tmj` (`pocao-vida`, `pocao-mana`, `asas`, `chave`) e criação dos itens por `criarItem`.
2. **Chave e saída da fase (`levels.js`, `game.js`)**:
   - Flag `exigeChave` por fase e objeto `fim-level` que só libera a transição com a chave no inventário.

---

## Prompt 9 — Guardião Ganha o Ataque de Espada na Fase 2
> **Prompt utilizado:**  
> *"Que tal mexermos um pouco na mecânica do guardião? Na segunda fase dele, ele está apenas realizando o ataque de pulo, mas seria possível adicionar o ataque de espada normal nele também, caso o jogador esteja perto?"*

### O que foi desenvolvido e corrigido:
1. **Ataque de espada por proximidade (`frontend/js/entidades/guardiao.js`, `balanceamento.js`)**:
   - Na fase 2, além do salto, o Guardião passa a atacar com a espada quando o jogador está perto, com parâmetros em `BALANCEAMENTO.espada`.

---

## Prompt 10 — Escala dos Sprites do Ataque da Fase 2
> **Prompt utilizado:**  
> *"Temos ele atacando sem máscara agora... Só que a escala dos sprites, quando ele ataca na segunda fase, estão ficando muito pequenos, onde podemos mexer na escala?"*

### O que foi desenvolvido e corrigido:
1. **Correção de escala (`guardiao.js`, `balanceamento.js`, `main.js`)**:
   - Ajuste da escala do sprite `guardiao_ataque` na fase 2 e indicação do ponto do código onde o valor pode ser regulado.

---

## Prompt 11 — Sons ao Pegar e ao Usar Itens
> **Prompt utilizado:**  
> *"Seria possível adicionar sons para quando o jogador pega itens e para quando usa eles?"*

### O que foi desenvolvido e corrigido:
1. **Efeitos sonoros de itens (`main.js`, `game.js`, `itens.js`, `jogador.js`, `inventario.js`)**:
   - Carregamento de `item-pego.mp3` e `item-usado.mp3` e reprodução no momento da coleta e do uso.

---

## Prompt 12 — Nova Fase "level-2" (Caverna)
> **Prompt utilizado:**  
> *"A primeira fase está concluída! Agora, queremos adicionar uma nova fase "level-2"... Os arquivos seguem em anexo... Quais alterações precisamos fazer?"*

### O que foi desenvolvido e corrigido:
1. **Registro e carregamento da fase (`levels.js`, `mapa.js`, `main.js`)**:
   - Inclusão do mapa `level-2.tmj`, fundo da caverna e música própria.
   - Fase 1 (Floresta) com `exigeChave` e `proximoLevel: "level-2"`; fase 2 (Caverna) com `fimAoDerrotarLich`.
   - Spawns do Lich, esqueletos e corvos lidos do Tiled.

---

## Prompt 13 — Raios do Lich e Fluxo de Vitória
> **Prompt utilizado:**  
> *"Estamos com um problema com o Lich no mapa... Parece que os raios dele não estão indo até o chão... Muitas vezes eles batem "no ar" antes de chegar no jogador... Ao derrotar o lich neste level, primeiro, todos os esqueletos vão ser destruídos, e então o jogo vai encerrar... O jogo então entrega uma tela de vitória e depois retorna ao menu principal"*

### O que foi desenvolvido e corrigido:
1. **Raio que alcança o chão (`frontend/js/entidades/lich.js`)**:
   - Novo cálculo do ponto de impacto (`calcularRaio`) com sondagem do terreno, eliminando os raios que explodiam no ar.
2. **Final do jogo (`game.js`, `menu.js`, `main.js`)**:
   - Ao derrotar o Lich, os esqueletos são destruídos, o jogo encerra, a tela de vitória (`cenaVitoria`) é exibida e retorna ao menu principal após alguns segundos.

---

## Prompt 14 — Blocos Acima do Jogador Protegem do Raio
> **Prompt utilizado:**  
> *"ficou melhor! Mas o Lich ainda deveria continuar com aquela lógica de bater de que os raios podem bater num bloco acima do jogador (o jogador pode usar os blocos para se proteger)"*

### O que foi desenvolvido e corrigido:
1. **Proteção por cobertura (`lich.js`)**:
   - O raio passa a procurar o primeiro bloco a partir de cima: se houver bloco entre o Lich e o jogador, o raio explode nele; caso contrário, desce até o chão e acerta.

---

## Prompt 15 — Interface Temática, Menu, Telas Finais e Remoção do Level de Teste
> **Prompt utilizado:**  
> *"Conseguiria melhorar os menuzinhos que aparecem no jogo, melhorando as fontes (para que fiquem mais na temática do jogo (incluindo os textinhos de quando damos dano nos inimigos)), menu inicial, e tela final? Também pode remover já o level teste e deixar apenas os 2 que serão os oficiais? Não pode mais o jogador escolher o level pela tela inicial também, agora inicia pela primeira obrigatoriamente"*

### O que foi desenvolvido e corrigido:
1. **Módulo visual (`frontend/js/ui.js`)**:
   - Fontes `Gloock` e `Pixelify Sans`, paleta de cores, rótulos, textos flutuantes de dano (`flutuar`), avisos centrais, fundo temático e brasas.
2. **Telas (`menu.js`, `game.js`)**:
   - Menu inicial, pausa, morte, game over e vitória redesenhados.
3. **Fases (`levels.js`, `mapa.js`, `main.js`)**:
   - Remoção do `level-teste` e da seleção de fase; o jogo sempre inicia na `level-1`.

---

## Prompt 16 — Barra de Vida do Lich e Vida 80
> **Prompt utilizado:**  
> *"Ficou muito bom! Mas poderia melhorar a aparência da barra de vida do Lich também? Deixando-a parecida com a do Guardião? Também queríamos que aumentar a vida do Lich para 80"*

### O que foi desenvolvido e corrigido:
1. **Barra unificada de chefes (`ui.js`, `lich.js`, `guardiao.js`)**:
   - Função `criarBarraChefe` usada pelo Lich e pelo Guardião, com nome do chefe, fundo e marcações.
2. **Balanceamento (`balanceamento.js`)**:
   - `vida.lich` passou para 80.

---

## Prompt 17 — Executar o Projeto com o Backend (Docker e PostgreSQL)
> **Prompt utilizado:**  
> *"Meu amigo fez o "backend" do projeto, onde vamos poder salvar informações no Postgres e existem usuários, administradores, e coisas afins, como uma página de internet... Dei um merge do git da branch dele, mas parece que vou ter que fazer algumas coisas que talvez minha máquina não tenha ainda... por exemplo, baixar o Docker. O que devo fazer para conseguir executar agora o projeto e jogar o jogo?"*

### O que foi desenvolvido e corrigido:
1. **Passo a passo de execução**:
   - Instalar o Docker Desktop, subir o banco com `docker compose up -d` na pasta `database/`, rodar `npm install` e `npm start` na raiz do projeto e abrir `http://localhost:3000`.
2. **Erro de autenticação do Postgres**:
   - Recriação do volume (`docker compose down -v`) e mudança da porta do banco para **5433** (`docker-compose.yml` e `database/models/index.js`), evitando conflito com outro Postgres na porta 5432.

---

## Prompt 18 — Correção do Erro de Merge no `server.js`
> **Prompt utilizado:**  
> *Erro ao iniciar o servidor: `SyntaxError: Identifier 'inicializarBanco' has already been declared`.*

### O que foi desenvolvido e corrigido:
1. **Remoção do bloco duplicado (`server.js`)**:
   - O merge manteve a conexão antiga com `Pool` junto da nova camada ORM; o bloco antigo foi removido e a conexão ficou apenas em `database/models`.

---

## Prompt 19 — Horário das Partidas Errado no Painel
> **Prompt utilizado:**  
> *Relato de que, em "suas últimas 5 partidas", os horários apareciam 3 horas adiantados.*

### O que foi desenvolvido e corrigido:
1. **Correção de fuso horário (`database/models/index.js`)**:
   - O Postgres grava `CURRENT_TIMESTAMP` em UTC em colunas `TIMESTAMP` sem fuso; foi registrado um *type parser* que trata esses valores como UTC, e o navegador converte para o fuso local do usuário.

---

## Prompt 20 — Jogar de Outra Máquina com ngrok
> **Prompt utilizado:**  
> *"vimos que talvez seja possível colocar o jogo para poder ser acessado em outra máquina e em outra rede usando o ngrok... É possível, como fazer?"*

### O que foi desenvolvido e corrigido:
1. **Acesso remoto**:
   - Como o servidor Express serve portal e jogo na porta 3000, basta um túnel: `ngrok config add-authtoken <token>` e `ngrok http 3000`; o endereço `https://...ngrok-free.dev` é compartilhado com outros jogadores.
2. **Pontos de atenção levantados**:
   - Administrador (`overlord1`) precisa ser recadastrado em um banco novo, a coluna `password_plain` guarda senha em texto puro e o jogo tem cerca de 30 MB de assets, o que pode deixar o carregamento lento pelo túnel.

---
