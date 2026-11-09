// ==========================================
// FUNÇÃO DE LOGIN (login.html)
// ==========================================
const loginForm = document.getElementById('login-form');

if (loginForm) {
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
                // Login deu certo
                const nomeUsuario = result.username || username;
                localStorage.setItem('loggedUser', nomeUsuario);
                localStorage.setItem('username', nomeUsuario);
                window.location.href = '/dashboard.html';
            } else if (response.status === 404) {
                // Se o usuário não existir (404), redireciona para o registro
                alert('Usuário não encontrado! Redirecionando para a tela de cadastro...');
                window.location.href = '/register.html';
            } else {
                // Outros erros (ex: Senha incorreta)
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

        const username = document.getElementById('new-username').value;
        if (!username || username.includes(" ")) {
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
// PERSONALIZAÇÃO DO PAINEL (dashboard.html)
// ==========================================
const displayUsername = document.getElementById('display-username');

if (displayUsername) {
    const loggedUser = localStorage.getItem('loggedUser');

    if (loggedUser) {
        displayUsername.textContent = loggedUser;
    } else {
        window.location.href = '/login.html';
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            localStorage.removeItem('loggedUser');
            localStorage.removeItem('username');
        });
    }
}  

// ==========================================
// CARREGAMENTO DOS DADOS NO DASHBOARD (Leaderboard + Histórico Pessoal)
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {

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
                
                // Valida se foi Vitória ou Derrota (Morte) com cores dinâmicas
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