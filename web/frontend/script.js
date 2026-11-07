// ==========================================
// FUNÇÃO DE LOGIN (index.html)
// ==========================================
const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });

            const result = await response.json();

            if (response.ok) {
                // Login deu certo
                localStorage.setItem('loggedUser', username);
                window.location.href = 'main.html';
            } else if (response.status === 404) {
                // NOVO: Se o usuário não existir (404), redireciona para o registro
                alert('Usuário não encontrado! Redirecionando para a tela de cadastro...');
                window.location.href = 'register.html';
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
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Cadastro realizado com sucesso! Faça login agora.');
                window.location.href = 'index.html'; // Manda para o login após cadastrar
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
// PERSONALIZAÇÃO DA TELA MAIN (main.html)
// ==========================================
const displayUsername = document.getElementById('display-username');

if (displayUsername) {
    const loggedUser = localStorage.getItem('loggedUser');
    
    if (loggedUser) {
        displayUsername.textContent = loggedUser;
    } else {
        window.location.href = 'index.html';
    }

    document.getElementById('btn-logout').addEventListener('click', function() {
        localStorage.removeItem('loggedUser');
    });
}