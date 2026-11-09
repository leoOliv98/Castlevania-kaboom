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
3. **Documentação e Apresentação**:
   - Criação deste resumo de prompts (`docs/resumo-prompts.md`), da apresentação em slides (`docs/apresentacao-slides.html` e `docs/apresentacao-slides.md`) e do Relatório Técnico (`docs/relatorio-tecnico.md`).
