// ==========================================
// CONFIGURAÇÃO E UTILITÁRIOS DE SESSÃO
// ==========================================
const LIMITE_ABA_FECHADA_MS = 2 * 60 * 1000; // 2 minutos (120.000 ms)
const INTERVALO_HEARTBEAT_MS = 3000; // Verifica a cada 3 segundos se o servidor continua ativo
let sessaoEncerrando = false;

function isUsuarioAdmin(username) {
    if (!username || typeof username !== 'string') return false;
    const normalizado = username.trim().toLowerCase();
    return normalizado === 'overlord 1' || normalizado === 'overlord1';
}

function salvarSessao({ username, sessionToken, serverBootId }) {
    const agora = String(Date.now());
    localStorage.setItem('loggedUser', username);
    localStorage.setItem('username', username);
    localStorage.setItem('sessionToken', sessionToken);
    localStorage.setItem('serverBootId', serverBootId);
    localStorage.setItem('lastActiveAt', agora);
    localStorage.removeItem('tabClosedAt');
}

function limparSessaoLocal() {
    localStorage.removeItem('loggedUser');
    localStorage.removeItem('username');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('serverBootId');
    localStorage.removeItem('lastActiveAt');
    localStorage.removeItem('tabClosedAt');
}

// Verifica localmente se já passaram mais de 2 minutos desde que a aba foi fechada ou ficou sem atividade
function sessaoExpirouPorTempoLocal() {
    const agora = Date.now();
    const tabClosedAt = Number(localStorage.getItem('tabClosedAt') || 0);
    const lastActiveAt = Number(localStorage.getItem('lastActiveAt') || 0);
    const referencia = tabClosedAt || lastActiveAt;
    if (referencia > 0 && agora - referencia > LIMITE_ABA_FECHADA_MS) {
        return true;
    }
    return false;
}

// Bloqueia o jogo/painel imediatamente e exige novo login quando o servidor cai, reinicia ou expira 2 min
function forcarRelogin(mensagem, servidorOffline = false) {
    if (sessaoEncerrando) return;
    sessaoEncerrando = true;

    const sessionToken = localStorage.getItem('sessionToken');
    limparSessaoLocal();

    // Para o jogo Kaboom imediatamente caso esteja na página play.html
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.innerHTML = '';
    }

    if (!servidorOffline && sessionToken) {
        fetch('/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
        }).catch(() => {});
    }

    if (servidorOffline) {
        // Se o servidor foi fechado com a página aberta, trava a tela imediatamente
        // e redireciona para /login.html assim que o servidor voltar a responder
        document.body.innerHTML = `
            <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:100vh;padding:2rem;text-align:center;background:#0a0a0c;color:#e8d08b;font-family:'Cinzel',serif;">
                <div style="border:2px solid #c2a353;padding:2.5rem;max-width:520px;background:#161513;box-shadow:0 0 25px rgba(0,0,0,0.9);">
                    <h2 style="color:#ff6b6b;margin-bottom:1rem;">Servidor Encerrado / Desconectado</h2>
                    <p style="font-family:'Crimson Text',serif;font-size:1.2rem;color:#d3cbb8;margin-bottom:1.5rem;">
                        ${mensagem || 'A conexão com o servidor foi encerrada. Por segurança, sua sessão foi finalizada e será necessário fazer login novamente.'}
                    </p>
                    <p style="font-size:0.95rem;color:#8c8577;">Aguardando o servidor voltar para redirecionar à tela de login...</p>
                </div>
            </div>
        `;
        const tentarRedirecionar = setInterval(async () => {
            try {
                const resp = await fetch('/login.html', { cache: 'no-store' });
                if (resp.ok) {
                    clearInterval(tentarRedirecionar);
                    window.location.replace('/login.html');
                }
            } catch (_) {}
        }, 2000);
        return;
    }

    if (mensagem) {
        alert(mensagem);
    }
    window.location.replace('/login.html');
}

// Consulta o servidor para validar se a instância atual do servidor reconhece a sessão e se não expirou
async function validarSessaoComServidor() {
    const loggedUser = localStorage.getItem('loggedUser');
    const sessionToken = localStorage.getItem('sessionToken');
    const serverBootId = localStorage.getItem('serverBootId');

    if (!loggedUser || !sessionToken || !serverBootId) {
        return { valid: false, reason: 'NO_LOCAL_SESSION' };
    }

    if (sessaoExpirouPorTempoLocal()) {
        return {
            valid: false,
            reason: 'SESSION_EXPIRED',
            message: 'Sua sessão expirou após 2 minutos com a aba fechada. Faça login novamente.'
        };
    }

    try {
        const response = await fetch('/api/session/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({ sessionToken, serverBootId })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.valid) {
            return {
                valid: false,
                reason: data.reason || 'INVALID_SESSION',
                message: data.message || 'Sessão encerrada (o servidor foi reiniciado ou a sessão expirou). Faça login novamente.'
            };
        }

        localStorage.setItem('lastActiveAt', String(Date.now()));
        localStorage.removeItem('tabClosedAt');
        return { valid: true, username: data.username };
    } catch (error) {
        return {
            valid: false,
            reason: 'SERVER_OFFLINE',
            servidorOffline: true,
            message: 'O servidor foi fechado! Sua sessão foi encerrada e é necessário fazer login novamente.'
        };
    }
}

// Registra o fechamento da aba para iniciar a contagem de 2 minutos
function registrarEventosFechamentoAba() {
    const marcarFechamento = () => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken || sessaoEncerrando) return;
        const agora = String(Date.now());
        localStorage.setItem('tabClosedAt', agora);
        localStorage.setItem('lastActiveAt', agora);
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/session/tab-close', JSON.stringify({ sessionToken }));
        }
    };

    window.addEventListener('pagehide', marcarFechamento);
    window.addEventListener('beforeunload', marcarFechamento);
}

// ==========================================
// FUNÇÃO DE LOGIN (login.html)
// ==========================================
const loginForm = document.getElementById('login-form');

if (loginForm) {
    // Se o usuário fechou a aba e voltou em menos de 2 minutos (e o servidor não foi fechado),
    // entra direto no painel sem precisar digitar a senha de novo
    (async () => {
        if (localStorage.getItem('sessionToken')) {
            const check = await validarSessaoComServidor();
            if (check.valid) {
                window.location.replace('/dashboard.html');
            } else {
                limparSessaoLocal();
            }
        }
    })();

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });

            const result = await response.json();

            if (response.ok) {
                const nomeUsuario = result.username || username;
                salvarSessao({
                    username: nomeUsuario,
                    sessionToken: result.sessionToken,
                    serverBootId: result.serverBootId
                });
                window.location.href = '/dashboard.html';
            } else if (response.status === 404) {
                alert('Usuário não encontrado! Redirecionando para a tela de cadastro...');
                window.location.href = '/register.html';
            } else {
                alert(`Erro: ${result.message || 'Credenciais inválidas.'}`);
            }

        } catch (error) {
            console.error('Erro de conexão:', error);
            alert('Erro ao conectar com o servidor. O backend está rodando?');
        }
    });
}

// ==========================================
// FUNÇÃO DE CADASTRO (register.html)
// ==========================================
const registerForm = document.getElementById('register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('new-username').value.trim();
        if (!username || (username.includes(" ") && username.toLowerCase() !== "overlord 1")) {
            alert("Erro: Usuário inválido ou com espaços.");
            return;
        }

        const email = document.getElementById('new-email').value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Erro: Por favor, insira um e-mail válido.");
            return;
        }

        const password = document.getElementById('new-password').value;
        const userData = { username, email, password };

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Cadastro realizado com sucesso! Faça login agora.');
                window.location.href = '/login.html';
            } else {
                alert(`Erro no cadastro: ${result.message || 'Tente novamente.'}`);
            }

        } catch (error) {
            console.error('Erro de conexão com o servidor:', error);
            alert('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
        }
    });
}

// ==========================================
// PROTEÇÃO E MONITORAMENTO DE SESSÃO (dashboard.html e play.html)
// ==========================================
const displayUsername = document.getElementById('display-username');

if (displayUsername) {
    const loggedUser = localStorage.getItem('loggedUser');
    const sessionToken = localStorage.getItem('sessionToken');
    const serverBootId = localStorage.getItem('serverBootId');

    if (!loggedUser || !sessionToken || !serverBootId) {
        forcarRelogin('Acesso negado! Faça login para continuar.');
    } else if (sessaoExpirouPorTempoLocal()) {
        forcarRelogin('Sua sessão expirou após 2 minutos com a aba fechada. Faça login novamente.');
    } else {
        displayUsername.textContent = loggedUser;
        registrarEventosFechamentoAba();

        // Verifica imediatamente com o servidor ao abrir a página
        validarSessaoComServidor().then(status => {
            if (!status.valid) {
                forcarRelogin(status.message, Boolean(status.servidorOffline));
            }
        });

        // Monitora continuamente se o servidor foi fechado ou reiniciado
        setInterval(async () => {
            if (sessaoEncerrando) return;
            const status = await validarSessaoComServidor();
            if (!status.valid) {
                forcarRelogin(status.message, Boolean(status.servidorOffline));
            }
        }, INTERVALO_HEARTBEAT_MS);
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout && btnLogout.id === 'btn-logout') {
        btnLogout.addEventListener('click', function(event) {
            event.preventDefault();
            sessaoEncerrando = true;
            const token = localStorage.getItem('sessionToken');
            limparSessaoLocal();
            if (token) {
                fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionToken: token })
                }).finally(() => {
                    window.location.replace('/login.html');
                });
            } else {
                window.location.replace('/login.html');
            }
        });
    }
}

// ==========================================
// PAINEL DO ADMINISTRADOR (SOMENTE "overlord 1")
// ==========================================
async function carregarUsuariosAdmin() {
    const tbodyAdmin = document.getElementById('admin-users-tbody');
    const loggedUser = localStorage.getItem('loggedUser');
    const sessionToken = localStorage.getItem('sessionToken');

    if (!tbodyAdmin || !isUsuarioAdmin(loggedUser)) return;

    tbodyAdmin.innerHTML = `<tr><td colspan="6" style="text-align: center;">Carregando usuários cadastrados...</td></tr>`;

    try {
        const response = await fetch('/api/admin/users', {
            cache: 'no-store',
            headers: { 'x-session-token': sessionToken || '' }
        });

        if (response.status === 403) {
            tbodyAdmin.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ff6b6b;">Acesso negado: restrito ao administrador.</td></tr>`;
            return;
        }

        const usuarios = await response.json();

        tbodyAdmin.innerHTML = '';

        if (!Array.isArray(usuarios) || usuarios.length === 0) {
            tbodyAdmin.innerHTML = `<tr><td colspan="6" style="text-align: center;">Nenhum usuário cadastrado no banco.</td></tr>`;
            return;
        }

        usuarios.forEach(user => {
            const tr = document.createElement('tr');
            const dataCadastro = user.created_at ? new Date(user.created_at).toLocaleString('pt-BR') : '-';
            const senhaTexto = user.password_plain
                ? `<span style="color: #4CAF50; font-weight: bold;">${user.password_plain}</span>`
                : `<span style="color: #8c8577; font-style: italic;">(Atualiza no próximo login)</span>`;
            const hashCurto = user.password_hash
                ? `<code style="font-size: 0.85rem; color: #c2a353; word-break: break-all;">${user.password_hash}</code>`
                : '-';

            tr.innerHTML = `
                <td>#${user.id}</td>
                <td style="font-weight: bold; color: #e8d08b;">${user.username}</td>
                <td>${user.email}</td>
                <td>${senhaTexto}</td>
                <td>${hashCurto}</td>
                <td>${dataCadastro}</td>
            `;
            tbodyAdmin.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar usuários do admin:', error);
        tbodyAdmin.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ff6b6b;">Erro ao carregar lista de usuários.</td></tr>`;
    }
}

function configurarBotaoAdmin(idBotao) {
    const btnAdmin = document.getElementById(idBotao);
    const sectionAdmin = document.getElementById('admin-users-section');
    if (!btnAdmin || !sectionAdmin) return;

    const loggedUser = localStorage.getItem('loggedUser');

    // Exibe o botão apenas para o administrador "overlord 1"
    if (!isUsuarioAdmin(loggedUser)) {
        btnAdmin.style.display = 'none';
        sectionAdmin.style.display = 'none';
        sectionAdmin.remove();
        btnAdmin.remove();
        return;
    }

    btnAdmin.style.display = 'inline-block';

    btnAdmin.addEventListener('click', async () => {
        const estaOculto = sectionAdmin.style.display === 'none' || !sectionAdmin.style.display;
        if (estaOculto) {
            sectionAdmin.style.display = 'block';
            await carregarUsuariosAdmin();
            sectionAdmin.scrollIntoView({ behavior: 'smooth' });
        } else {
            sectionAdmin.style.display = 'none';
        }
    });
}

// ==========================================
// CARREGAMENTO DOS DADOS NO DASHBOARD (Leaderboard + Histórico Pessoal + Admin)
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    configurarBotaoAdmin('btn-toggle-admin');

    // 1. CARREGA O LEADERBOARD GLOBAL (Top 10 - Melhores Tempos)
    const tbodyLeaderboard = document.getElementById("leaderboard-tbody") || document.querySelector(".leaderboard-section .leaderboard-table tbody");
    if (tbodyLeaderboard) {
        try {
            const response = await fetch('/api/scores');
            const ranking = await response.json();

            tbodyLeaderboard.innerHTML = ""; 

            if (!Array.isArray(ranking) || ranking.length === 0) {
                tbodyLeaderboard.innerHTML = `<tr><td colspan="3" style="text-align: center;">Nenhum speedrun registrado ainda. Seja o primeiro!</td></tr>`;
            } else {
                ranking.forEach((partida, index) => {
                    const tr = document.createElement("tr");
                    
                    const minutos = Math.floor(partida.tempo_segundos / 60);
                    const segundos = partida.tempo_segundos % 60;
                    const tempoFormatado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

                    tr.innerHTML = `
                        <td>#${index + 1}</td>
                        <td>${partida.username}</td>
                        <td>${tempoFormatado}</td>
                    `;
                    tbodyLeaderboard.appendChild(tr);
                });
            }
        } catch (error) {
            console.error("Erro ao carregar o Leaderboard:", error);
            tbodyLeaderboard.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ff6b6b;">Erro ao carregar os tempos.</td></tr>`;
        }
    }

    // 2. CARREGA AS ÚLTIMAS 5 PARTIDAS DO USUÁRIO LOGADO (Com status de Vitória/Morte)
    const tbodyUserHistory = document.getElementById("user-history-tbody") || document.querySelector(".user-history-table tbody");
    const loggedUser = localStorage.getItem('loggedUser') || localStorage.getItem('username');

    if (tbodyUserHistory && loggedUser) {
        try {
            const response = await fetch(`/api/scores/user/${encodeURIComponent(loggedUser)}`);
            const historico = await response.json();

            tbodyUserHistory.innerHTML = "";

            if (!Array.isArray(historico) || historico.length === 0) {
                tbodyUserHistory.innerHTML = `<tr><td colspan="3" style="text-align: center;">Você ainda não jogou nenhuma partida. Jogue agora!</td></tr>`;
                return;
            }

            historico.forEach(partida => {
                const tr = document.createElement("tr");
                
                const minutos = Math.floor(partida.tempo_segundos / 60);
                const segundos = partida.tempo_segundos % 60;
                const tempoFormatado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
                
                const foiVitoria = partida.status === "VITORIA";
                const corStatus = foiVitoria ? "#4CAF50" : "#F44336";
                const textoStatus = foiVitoria ? "VITÓRIA" : "DERROTA (MORTE)";
                
                const dataFormatada = partida.criado_em ? new Date(partida.criado_em).toLocaleString('pt-BR') : '';

                tr.innerHTML = `
                    <td style="color: ${corStatus}; font-weight: bold;">${textoStatus}</td>
                    <td>${tempoFormatado}</td>
                    <td>${dataFormatada}</td>
                `;
                tbodyUserHistory.appendChild(tr);
            });

        } catch (error) {
            console.error("Erro ao carregar histórico pessoal:", error);
            tbodyUserHistory.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ff6b6b;">Erro ao carregar seu histórico.</td></tr>`;
        }
    }
});
