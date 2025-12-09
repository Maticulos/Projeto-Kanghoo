/**
 * Gerencia o estado do cabeçalho baseado na autenticação
 * Substitui botões de Login/Cadastro pelo perfil do usuário
 */
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderAuth();
});

function updateHeaderAuth() {
    const token = localStorage.getItem('authToken');
    const userDataStr = localStorage.getItem('userData');
    
    if (!token || !userDataStr) return;

    try {
        const user = JSON.parse(userDataStr);
        const authButtons = document.querySelector('.auth-buttons');
        
        if (!authButtons) return;

        // Determinar URL do painel baseado no tipo
        let dashboardPage = 'dashboard.html';
        switch(user.tipo) {
            case 'motorista_escolar': 
                dashboardPage = 'area-motorista-escolar.html'; 
                break;
            case 'motorista_escolar_premium': 
                dashboardPage = 'area-motorista-escolar-premium.html'; 
                break;
            case 'motorista_excursao': 
                dashboardPage = 'area-motorista-excursao.html'; 
                break;
            case 'responsavel': 
                dashboardPage = 'area-responsavel.html'; 
                break;
            case 'usuario_comum': 
                dashboardPage = 'area-usuario.html'; 
                break;
            default:
                dashboardPage = 'dashboard.html';
        }

        // Usar caminho absoluto a partir da raiz do servidor para garantir funcionamento em qualquer página
        const dashboardUrl = `/auth/${dashboardPage}`;

        // HTML do perfil
        const profileHtml = `
            <div class="user-profile-dropdown" style="position: relative; display: inline-block;">
                <button id="user-menu-btn" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 10px; padding: 5px;">
                    <div style="text-align: right; display: none;">
                        <span style="display: block; font-weight: 600; color: var(--text-color, #333); font-size: 0.9rem;">${user.nome.split(' ')[0]}</span>
                    </div>
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-color, #004AAD); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; overflow: hidden; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        ${user.foto ? `<img src="${user.foto}" style="width: 100%; height: 100%; object-fit: cover;">` : user.nome.charAt(0).toUpperCase()}
                    </div>
                </button>
                
                <div id="user-dropdown" style="display: none; position: absolute; right: 0; top: 110%; background: white; min-width: 220px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border-radius: 12px; padding: 0.5rem 0; z-index: 1000; border: 1px solid #eee;">
                    <div style="padding: 1rem; border-bottom: 1px solid #eee;">
                        <strong style="display: block; color: #333;">${user.nome}</strong>
                        <small style="color: #666;">${user.email}</small>
                    </div>
                    <a href="${dashboardUrl}" style="display: flex; align-items: center; gap: 10px; padding: 0.8rem 1rem; color: #333; text-decoration: none; transition: background 0.2s;">
                        <span>📊</span> Meu Painel
                    </a>
                    <a href="#" id="header-logout-btn" style="display: flex; align-items: center; gap: 10px; padding: 0.8rem 1rem; color: #dc3545; text-decoration: none; transition: background 0.2s;">
                        <span>🚪</span> Sair
                    </a>
                </div>
            </div>
        `;

        authButtons.innerHTML = profileHtml;

        // Estilo para mostrar nome em telas maiores
        const style = document.createElement('style');
        style.textContent = `
            @media(min-width: 768px) {
                #user-menu-btn div:first-child { display: block !important; }
            }
            #user-dropdown a:hover { background-color: #f8f9fa; }
        `;
        document.head.appendChild(style);

        // Event Listeners
        const btn = document.getElementById('user-menu-btn');
        const dropdown = document.getElementById('user-dropdown');
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });

        document.getElementById('header-logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.reload();
        });

    } catch (e) {
        console.error('Erro ao renderizar header auth:', e);
        localStorage.removeItem('userData'); // Limpar dados corrompidos
    }
}
