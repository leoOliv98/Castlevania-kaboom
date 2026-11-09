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
