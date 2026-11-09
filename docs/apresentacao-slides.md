# Apresentação em Slides — Projeto DEVES: O Despertar do Mago

> **Dica:** Você também pode abrir o arquivo interativo [`docs/apresentacao-slides.html`](file:///d:/Projeto%20Game/Castlevania-kaboom/docs/apresentacao-slides.html) no navegador e navegar pelos slides usando as setas `←` e `→` do teclado.

---

## Slide 1: Capa — DEVES: O Despertar do Mago
- **Projeto:** Jogo 2D de Ação e Plataforma Dark Fantasy integrado a Portal Web Full-Stack
- **Foco Técnico:** Linguagens, Arquitetura Modular, APIs RESTful, ORM, Segurança de Sessão e Motor de Jogo
- **Equipe / Repositório:** `Castlevania-kaboom` (`DEVES`)

---

## Slide 2: Linguagens e Tecnologias Utilizadas (Tech Stack)
- **JavaScript (ES6+ / Node.js):**
  - **Frontend do Jogo (ES Modules):** Lógica de cenas, física 2D, inteligência artificial dos inimigos e HUD.
  - **Frontend do Portal Web:** Autenticação, consumo assíncrono de APIs (`fetch`), controle de sessão e painéis dinâmicos.
  - **Backend (CommonJS / Node.js):** Servidor unificado com **Express 5**.
- **HTML5 & CSS3:**
  - Interfaces temáticas estilo RPG Dark Fantasy (`login.html`, `register.html`, `dashboard.html`, `play.html`).
- **SQL / PostgreSQL 15 (Docker):**
  - Persistência relacional de usuários e histórico de partidas/speedruns, abstraída por camada **ORM**.
- **Bibliotecas Principais:**
  - **Kaboom.js (v3000):** Motor de jogo 2D (colisões, spritesheets, áudio, câmera e partículas).
  - **Tiled Map Editor (.tmj):** Construção de fases, camadas de colisão, rampas e spawns.
  - **Bcrypt:** Criptografia de senhas com *salt rounds*.

---

## Slide 3: Arquitetura e Estrutura do Código
```text
Castlevania-kaboom/
├── server.js                  # Servidor Express + Rotas da API + Controle de Sessão
├── database/
│   ├── docker-compose.yml     # Container PostgreSQL 15
│   ├── orm.js                 # Motor ORM (Model, DataTypes, Op, Query Builder)
│   └── models/                # Modelos relacionais (User.js, Score.js, index.js)
├── web/
│   ├── pages/                 # Telas do Portal (login, register, dashboard, play)
│   ├── js/portal-auth.js      # Cliente HTTP, Heartbeat de Sessão, Ranking e Admin
│   └── css/                   # Estilização RPG (portal.css, game-container.css)
└── frontend/
    ├── assets/                # Spritesheets, Tilesets (.tmj), Áudios e Fontes
    └── js/
        ├── main.js            # Bootstrap do Kaboom.js e carregamento de assets
        ├── levels.js / mapa.js# Configuração de fases, chunks visuais e rampas
        ├── balanceamento.js   # Parâmetros centralizados de combate e física
        ├── itens.js / ui.js   # Catálogo de itens e componentes visuais de texto
        ├── cenas/             # Cenas do jogo (menu.js, game.js, inventario.js)
        └── entidades/         # Jogador, Esqueletos, Lobo, Corvos, Guardião e Lich
```

---

## Slide 4: Camada ORM e Persistência de Dados
- **Objetivo do ORM (`database/orm.js` + `database/models/`):**
  - Desacoplar as rotas da API do SQL bruto, mapeando tabelas para classes JavaScript.
  - Prevenir *SQL Injection* com *queries* parametrizadas automáticas (`$1, $2...`).
  - Sincronizar automaticamente o esquema na inicialização (`orm.sync()`).
- **Modelos Implementados:**
  - **`User` (`database/models/User.js`):** `id`, `username`, `email`, `password_hash`, `password_plain`, `created_at`.
  - **`Score` (`database/models/Score.js`):** `id`, `username`, `status` (`VITORIA` / `DERROTA`), `tempo_segundos`, `criado_em`.
- **Privacidade no Git (`.gitignore`):**
  - Volumes (`pgdata/`), dumps, arquivos `.env` e exportações de usuários são ignorados no versionamento.

---

## Slide 5: APIs RESTful do Servidor (`server.js`)
| Método | Rota | Descrição | Modelo ORM |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/register` | Cadastra novo usuário com hash `bcrypt` | `User.findOne` / `User.create` |
| `POST` | `/api/login` | Autentica credenciais e gera `sessionToken` + `serverBootId` | `User.findOne` / `user.update` |
| `POST` | `/api/session/check` | Valida se o servidor não reiniciou e se a sessão (< 2 min) está ativa | Memória (`activeSessions`) |
| `POST` | `/api/session/tab-close` | Registra o fechamento da aba (`sendBeacon`) para janela de 2 min | Memória (`activeSessions`) |
| `POST` | `/api/score` | Registra o tempo e o resultado (`VITORIA` ou `DERROTA`) da partida | `Score.create` |
| `GET` | `/api/scores` | Retorna o **Top 10 Melhores Tempos** globais (`VITORIA`, menor tempo) | `Score.findAll` |
| `GET` | `/api/scores/user/:user` | Retorna o histórico das últimas 5 partidas do jogador logado | `Score.findAll` |
| `GET` | `/api/admin/users` | Lista dados cadastrais (exclusivo para o admin `overlord 1`) | `User.findAll` |

---

## Slide 6: Controle de Sessão e Segurança
- **Detecção de Queda ou Reinício do Servidor:**
  - Cada execução do `server.js` gera um `SERVER_BOOT_ID` único (`crypto.randomUUID()`).
  - O cliente executa um *heartbeat* a cada 3 segundos (`POST /api/session/check`). Se o servidor for fechado, o jogo é interrompido imediatamente e exige novo login ao retornar.
- **Janela de Tolerância de 2 Minutos ao Fechar a Aba:**
  - Eventos `pagehide` / `beforeunload` marcam `tabClosedAt`.
  - Se o jogador reabrir em **até 2 minutos**, continua logado; **após 2 minutos**, a sessão expira no cliente e no servidor.
- **Controle de Acesso Administrativo (RBAC):**
  - Somente o usuário **`overlord 1`** possui permissão (validada por token no backend e ocultada no DOM para os demais) para visualizar a tabela de usuários cadastrados.

---

## Slide 7: Engenharia do Motor de Jogo (`frontend/js/`)
- **Renderização Otimizada de Mapas (`mapa.js`):**
  - Mapas do Tiled (`.tmj`) são pré-renderizados em *chunks* de `1024x1024 px` no Canvas e mesclados em retângulos de colisão (`mesclarSolidos`) e rampas poligonais (`extrairRampas` com algoritmo Douglas-Peucker).
- **Entidades e Chefes Modulares (`entidades/`):**
  - **Jogador (`jogador.js`):** Ataque lateral, golpe aéreo para baixo (pogo jump), bola de fogo com custo de mana, voo com asas e modo de teste **`godmod`** (imortalidade + asas infinitas).
  - **Inimigos:** Esqueletos (com mecânica de pilha de ossos e ressurreição em 10s), Lobos e Spawner de Corvos senoidais.
  - **Chefes:** **Guardião Mascarado** (2 fases: espadada e salto com impacto sísmico ao perder a máscara em 50% de HP) e **Lich** (chefe final com projéteis teleguiados e feixes de raio).

---

## Slide 8: Tiled Map Editor — O Level Design Fora do Código
- **Mapas finitos de tiles 8×8 px**, salvos em `.tmj` (JSON) com o tileset incorporado:
  - `level-1` (Floresta): 1000 × 200 tiles = **8000 × 1600 px**.
  - `level-2` (Caverna): 500 × 200 tiles = **4000 × 1600 px**.
- **Três tipos de camada, cada uma com uma função:**
  - **Camadas visuais** (`Camada de Blocos 1`, `decoracao`): só desenho, vão para o canvas.
  - **Camada `solidos`:** só colisão, **nunca é desenhada**. Pintar um tile ali cria chão, parede ou rampa.
  - **Camada de objetos** (`Camada de Objetos 1`): pontos e retângulos com **nome**, lidos pelo jogo.
- **Objetos nomeados controlam o jogo sem mexer no código:**

| Objeto no Tiled | Tipo | O que o jogo faz |
| :--- | :--- | :--- |
| `player-spawn` | ponto | posição inicial do jogador |
| `esqueleto-spawn`, `lobo-spawn` | ponto | um inimigo para cada ponto (a Caverna tem 21 esqueletos) |
| `guardiao-spawn`, `lich-spawn` | ponto | posição dos chefes |
| `pocao-vida`, `pocao-mana`, `asas`, `chave` | ponto | item coletável (nome = chave da tabela de `itens.js`) |
| `corvo-spawn` + `corvo-fim` | retângulo | zonas de entrada e saída dos corvos (precisa das duas) |
| `fim-level` | retângulo | saída da fase (pode exigir a chave) |

---

## Slide 9: Do `.tmj` ao Jogo — Pipeline de Carregamento (`mapa.js`)
```text
fetch(level.arquivo)  →  JSON do Tiled
 ├─ VISUAL    camadas visíveis ≠ "solidos"
 │            → decodifica o GID (ID + flags de espelhamento)
 │            → desenha em canvas de 1024×1024 px → loadSprite() de cada chunk
 ├─ COLISÃO   camada "solidos" → máscara 0/1
 │            → extrairRampas()  (escadas viram polígonos inclinados)
 │            → mesclarSolidos() (o resto vira retângulos grandes)
 │            → corpos estáticos com a tag "ground"
 └─ OBJETOS   lerObjetos() → spawns, itens, zonas de corvo e fim-level
```
- **GID do Tiled:** o ID real é `gidBruto & 0x1FFFFFFF`; os 3 bits mais altos guardam os espelhamentos **horizontal, vertical e diagonal**, aplicados no canvas com `scale()` e `transform()`.
- **Mesclagem de retângulos:** varre linha por linha juntando tiles vizinhos; blocos iguais na linha seguinte só aumentam a altura. Um chão de 1000×2 tiles vira **1 retângulo em vez de 2000 objetos**.
- **Chunks de 1024 px:** respeitam o limite do atlas do Kaboom (2048 px) e mantêm a taxa de quadros alta.
- **Cache por level:** visual e colisão são montados uma vez, mesmo que a cena reinicie (morte, menu).

---

## Slide 10: Modelo Matemático das Rampas (1/2) — Detectando Escadas
O Tiled só pinta quadrados, mas o personagem deve subir inclinações suavemente. A colisão em "escada" é convertida em rampa por um modelo geométrico:

1. **Perfil do terreno:** para cada coluna `c`, `topo[c]` = primeira linha sólida (de cima para baixo).
2. **Degrau:** duas colunas vizinhas formam um degrau quando
   `0 < |topo[c] − topo[c−1]| ≤ D`, com `D = ⌊maxDegrau / tileH⌋ = ⌊16 / 8⌋ = 2 tiles`.
   As colunas dos dois lados são marcadas; sequências marcadas contíguas formam uma **região de rampa**.
3. **Vértices:** cada **patamar** (colunas seguidas com o mesmo `topo`) gera dois pontos `(x_início, y)` e `(x_fim, y)`. Nas junções, as pontas recuam `tileW/2` (limitado ao meio do patamar), o que transforma a quina em um trecho diagonal.
4. O resultado é uma **polilinha** `P₀, P₁, …, Pₙ` que acompanha a escada. Degraus maiores que `D` continuam como parede de verdade.

Configuração por level: `rampas: { maxDegrau: 16 }` em `levels.js` (ausente = escada normal).

---

## Slide 11: Modelo Matemático das Rampas (2/2) — Simplificação e Colisão
- **Algoritmo de Douglas-Peucker** reduz a polilinha. Para cada ponto `Pₖ` entre o primeiro `(x₁,y₁)` e o último `(x₂,y₂)`:

```text
          | Δy·(xₖ − x₁) − Δx·(yₖ − y₁) |
   dₖ  =  ───────────────────────────────      Δx = x₂ − x₁ ,  Δy = y₂ − y₁
                   √(Δx² + Δy²)
```
  - Se `max dₖ ≤ ε`, com `ε = tileH / 2 = 4 px`, todos os pontos viram **um único segmento reto**.
  - Senão, divide no ponto mais distante e repete (recursão) nos dois lados.
- **Cada segmento vira um trapézio convexo:** `(0, yₐ)`, `(Δx, y_b)`, `(Δx, fundo)`, `(0, fundo)`, com `fundo = max(yₐ, y_b) + 2·tileH` (ou o fim real da coluna). A superfície tem **inclinação `m = (y_b − yₐ) / (x_b − xₐ)`**.
- **Efeito no jogo:** o polígono é um corpo estático do Kaboom (`area({ shape: new Polygon(...) })`) com a tag `ground`, igual ao chão comum: esqueletos, Lich e jogador reagem a ele sem código extra.
- **`hitboxEstreita`:** o jogador usa tronco largo e pés estreitos, para não ficar "no ar" pela quina da caixa nas rampas.
- As colunas que viraram rampa **saem da máscara** antes da mesclagem, para não haver colisão duplicada.

---

## Slide 12: Mecânicas do Jogador e Itens (`balanceamento.js`)
| Mecânica | Valor / Regra |
| :--- | :--- |
| Velocidade de caminhada | 200 px/s |
| Espada (lateral e golpe para baixo / *pogo jump*) | dano 5 |
| Bola de fogo | dano 3 · custo 5 de mana · 560 px/s · alcance 900 px |
| Mana máxima | 100 → **20 bolas de fogo** até esvaziar |
| Poção de vida / Poção de mana | restauram vida / mana (item usado com a tecla `S`) |
| Asas | voo por tempo limitado (infinito no modo `godmod`) |
| Chave | obrigatória para abrir a saída da Floresta |
| Cronômetro (HUD) | conta só o tempo ativo (pausa no `ESC`) e vai para o ranking |

- **Itens por dados:** `itens.js` é uma tabela `nome → { tipo, sprite, escala }`; para criar um item novo basta carregar o sprite e acrescentar uma linha.
- **Inventário** com seleção e **sons de coleta e de uso**.
- **Todos os números de combate ficam em `balanceamento.js`**, para ajustar o equilíbrio sem caçar valores pelo código.

---

## Slide 13: Inimigos Comuns e Inteligência Artificial
- **Esqueletos** (vida 5): patrulham e **sondam o chão à frente** para não caírem em buracos. A espada derruba com 1 golpe (a bola de fogo, com 2); viram **pilha de ossos** e **ressuscitam** depois de um tempo.
- **Lobos** (vida 5): correm atrás do jogador, com som próprio de ataque e morte.
- **Corvos** (dano 20 ao explodir contra o jogador): voam em **onda senoidal**

```text
   y(x) = y₀ + A · sen( 2π · x / λ )      A = 110 px,  λ = 480 px,  v = 150 px/s
   período no tempo:  T = λ / v = 480 / 150 = 3,2 s
```
  - Nascem na zona `corvo-spawn` e somem na `corvo-fim` (retângulos do Tiled), a cada **1 a 3 s**, com **no máximo 6** ao mesmo tempo.
  - Passam **atrás da folhagem** (profundidade `z = -55`, atrás do mapa em `-50`) e surgem por *fade*; durante a entrada não causam dano.

---

## Slide 14: Chefes — Guardião Mascarado e Lich
- **Guardião Mascarado** (vida 60, o dobro da altura do jogador):
  - **Fase 1:** corre a 170 px/s (o jogador anda a 200) e acorda a 520 px de distância; espadada de dano 30.
  - **Fase 2** (a 50% da vida = 30 de HP): perde a máscara, fica mais rápido (235 px/s) e combina **espadada** (jogador a menos de 160 px) com **salto**.
  - **Salto:** agacha 0,4 s como aviso; a altura vem da física, `h = F² / (2g) = 1160² / (2 · 2400) ≈ 280 px`; o pouso causa dano 40, tremor de tela e área de impacto em volta dos pés.
- **Lich** (chefe final, vida 80 = 16 golpes de espada):
  - Dispara **projéteis teleguiados** e **raios** com aviso visual antes do impacto.
  - O raio parte do alto e **para no primeiro bloco acima do jogador**: as plataformas servem de abrigo; sem bloco, o raio chega ao chão e acerta.
  - Ao morrer, **todos os esqueletos são destruídos**, o jogo encerra e a **tela de vitória** leva de volta ao menu.
- Ambos usam a mesma **barra de vida de chefe** (`criarBarraChefe` em `ui.js`).

---

## Slide 15: Progressão das Fases e Configuração por Dados
```text
 Menu → level-1 (Floresta) → pega a chave → entra em "fim-level" → level-2 (Caverna)
                                                                       │
        Menu ← tela de vitória ← esqueletos destruídos ← derrota o Lich ┘
```
- **`levels.js` descreve cada fase por campos**, sem código novo: `arquivo`, `camadasSolidas`, `musica`, `fundo`, `rampas`, `hitboxEstreita`, `exigeChave`, `proximoLevel`, `fimAoDerrotarLich`.
- **Adicionar uma fase** = salvar o `.tmj` + uma entrada em `LEVELS`. O jogo sempre começa em `LEVEL_PADRAO` e segue a cadeia de `proximoLevel`.
- **Tempo acumulado** passa de uma fase para a outra e, ao fim da partida, é enviado a `POST /api/score` para o ranking Top 10.
- **Interface temática** (`ui.js`): fontes *Gloock* e *Pixelify Sans*, textos flutuantes de dano, brasas, menu, pausa, morte, game over e vitória.
- **Modo teste `godmod`:** imortalidade e voo infinito para testar as fases.
