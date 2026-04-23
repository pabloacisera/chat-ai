import { userService } from "../services/UserInfo.js";
import { storageService } from "../services/StorageService.js";

// 1. Template para cuando NO hay usuario (Identificación)
const templateSingIn = document.createElement("template");
templateSingIn.innerHTML = `
    <style>
        :host {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: 'Segoe UI', Roboto, sans-serif;
        }
        .container { 
            background: white; 
            padding: 2rem; 
            border-radius: 12px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            text-align: center;
            width: 90%;
            max-width: 400px;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-20px); } }
        
        h2 { margin: 0 0 1rem; color: #333; }
        p { color: #666; margin-bottom: 2rem; }
        
        .form-group { margin-bottom: 1rem; text-align: left; }
        .form-group label { display: block; margin-bottom: 0.5rem; color: #555; font-size: 0.9rem; }
        .form-group input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
        
        .actions { display: flex; flex-direction: column; gap: 10px; margin-top: 1.5rem; }
        
        button { 
            cursor: pointer; padding: 12px; border-radius: 8px; border: none; font-weight: bold; 
        }
        #btn-login { background: #007bff; color: white; transition: background 0.2s; }
        #btn-login:hover { background: #0056b3; }
        #btn-register { background: #28a745; color: white; }
        #btn-register:hover { background: #218838; }
        #btn-close { background: transparent; color: #888; }
        
        .tabs { display: flex; margin-bottom: 1.5rem; border-bottom: 2px solid #eee; }
        .tab { flex: 1; padding: 10px; cursor: pointer; color: #888; border-bottom: 2px solid transparent; margin-bottom: -2px; }
        .tab.active { color: #007bff; border-bottom-color: #007bff; }
        
        .error { color: #dc3545; font-size: 0.9rem; margin-top: 0.5rem; }
        .loading { opacity: 0.6; pointer-events: none; }
        
        .divider { display: flex; align-items: center; margin: 1.5rem 0; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #ddd; }
        .divider span { padding: 0 10px; color: #888; font-size: 0.85rem; }
        
        #google-btn { 
            background: white; color: #333; border: 1px solid #ddd; display: flex; 
            align-items: center; justify-content: center; gap: 10px; padding: 12px;
        }
        #google-btn:hover { background: #f5f5f5; }
        #google-btn img { width: 18px; height: 18px; }
    </style>
    <div class="container">
        <h2>Identificación</h2>
        <div class="tabs">
            <div class="tab active" data-tab="login">Iniciar Sesión</div>
            <div class="tab" data-tab="register">Registrarse</div>
        </div>
        <p id="info-text">Ingresa tus credenciales para continuar</p>
        
        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="tu@email.com">
        </div>
        <div class="form-group">
            <label for="password">Contraseña</label>
            <input type="password" id="password" placeholder="••••••••">
        </div>
        <div id="name-group" class="form-group" style="display: none;">
            <label for="name">Nombre</label>
            <input type="text" id="name" placeholder="Tu nombre">
        </div>
        
        <div id="error-msg" class="error"></div>
        
        <div class="actions">
            <button id="btn-action">INICIAR SESIÓN</button>
            <div class="divider"><span>o</span></div>
            <button id="google-btn">
                <img src="https://www.google.com/favicon.ico" alt="Google">
                Iniciar con Google
            </button>
            <button id="btn-close">Cancelar</button>
        </div>
    </div>
`;

// 2. Template para cuando SÍ hay usuario (Perfil)
const templateDataUser = document.createElement("template");
templateDataUser.innerHTML = `
    <style>
        :host {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: 'Segoe UI', Roboto, sans-serif;
        }
        .container { 
            background: white; 
            padding: 2rem; 
            border-radius: 12px; 
            width: 90%;
            max-width: 450px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        h2 { margin-top: 0; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
        .user-card { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        
        .footer-actions { display: flex; justify-content: space-between; margin-top: 20px; }
        
        button { cursor: pointer; padding: 10px 20px; border-radius: 6px; border: none; font-weight: bold; }
        #btn-clear { background: #dc3545; color: white; }
        #btn-exit { background: #6c757d; color: white; }
    </style>
    <div class="container">
        <h2>Perfil de Usuario</h2>
        <div id="user-list" class="user-card"></div>
        <div class="footer-actions">
            <button id="btn-clear">Cerrar Sesión</button>
            <button id="btn-exit">Cerrar Ventana</button>
        </div>
    </div>
`;

export class UserModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.dataUser = [];
        this.currentTab = 'login';
    }

    connectedCallback() {
        this.refreshData();
        this.render();
    }

    refreshData() {
        this.dataUser = userService.getAll();
    }

    render() {
        this.shadowRoot.innerHTML = "";

        if (this.dataUser.length < 1) {
            this.shadowRoot.appendChild(templateSingIn.content.cloneNode(true));
            this.setupSignInEvents();
        } else {
            this.shadowRoot.appendChild(templateDataUser.content.cloneNode(true));
            this.renderUserData();
            this.setupDataUserEvents();
        }
    }

    // --- EVENTOS ---

    setupSignInEvents() {
        const tabs = this.shadowRoot.querySelectorAll('.tab');
        const btnAction = this.shadowRoot.querySelector('#btn-action');
        const btnClose = this.shadowRoot.querySelector('#btn-close');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentTab = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const infoText = this.shadowRoot.querySelector('#info-text');
                const btnText = this.currentTab === 'login' 
                    ? 'INICIAR SESIÓN' 
                    : 'CREAR CUENTA';
                const nameGroup = this.shadowRoot.querySelector('#name-group');
                
                if (infoText) {
                    infoText.textContent = this.currentTab === 'login'
                        ? 'Ingresa tus credenciales para continuar'
                        : 'Crea una cuenta para guardar tus conversaciones';
                }
                if (btnAction) btnAction.textContent = btnText;
                if (nameGroup) nameGroup.style.display = this.currentTab === 'register' ? 'block' : 'none';
            });
        });

        btnAction?.addEventListener('click', async () => {
            const email = this.shadowRoot.querySelector('#email')?.value.trim();
            const password = this.shadowRoot.querySelector('#password')?.value;
            const name = this.shadowRoot.querySelector('#name')?.value.trim();
            const errorMsg = this.shadowRoot.querySelector('#error-msg');
            
            if (!email || !password) {
                if (errorMsg) errorMsg.textContent = 'Por favor completa todos los campos';
                return;
            }

            btnAction.classList.add('loading');
            btnAction.disabled = true;
            if (errorMsg) errorMsg.textContent = '';

            try {
                if (this.currentTab === 'login') {
                    await userService.login(email, password);
                } else {
                    await userService.register(email, password, name);
                }
                
                const anonSessionId = localStorage.getItem('anonSessionId');
                if (anonSessionId) {
                    await storageService.migrateAnonData(anonSessionId);
                    localStorage.removeItem('anonSessionId');
                }
                
                localStorage.removeItem('currentConvId');
                window.location.reload();
            } catch (error) {
                if (errorMsg) errorMsg.textContent = error.message || 'Error al iniciar sesión';
            } finally {
                btnAction.classList.remove('loading');
                btnAction.disabled = false;
            }
        });

        btnClose?.addEventListener('click', () => {
            this.remove();
        });

        const googleBtn = this.shadowRoot.querySelector('#google-btn');
        googleBtn?.addEventListener('click', () => this.initGoogleLogin());
    }

    initGoogleLogin() {
        const clientId = "502816338740-3g1fi4mle29u03u8h267te1tv0lnthkl.apps.googleusercontent.com";
        
        const btnGoogle = this.shadowRoot.querySelector('#google-btn');
        if (btnGoogle) btnGoogle.classList.add('loading');

        window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'email profile openid',
            callback: async (response) => {
                if (response.access_token) {
                    try {
                        await userService.googleLogin(response.access_token);
                        
                        const anonSessionId = localStorage.getItem('anonSessionId');
                        if (anonSessionId) {
                            await storageService.migrateAnonData(anonSessionId);
                            localStorage.removeItem('anonSessionId');
                        }
                        
                        localStorage.removeItem('currentConvId');
                        window.location.reload();
                    } catch (error) {
                        const errorMsg = this.shadowRoot.querySelector('#error-msg');
                        if (errorMsg) errorMsg.textContent = error.message || 'Error con Google';
                    } finally {
                        if (btnGoogle) btnGoogle.classList.remove('loading');
                    }
                }
            }
        }).requestAccessToken();
    }

    setupDataUserEvents() {
        this.shadowRoot.querySelector("#btn-clear")?.addEventListener("click", async () => {
            await userService.logout();
            storageService.clearAuth();
            localStorage.removeItem('anonSessionId');
            localStorage.removeItem('conversations:cache');
            window.location.reload();
        });

        this.shadowRoot.querySelector("#btn-exit")?.addEventListener("click", () => {
            this.remove();
        });
    }

    renderUserData() {
        const container = this.shadowRoot.querySelector("#user-list");
        if (!container) return;

        this.dataUser.forEach(user => {
            const div = document.createElement("div");
            div.innerHTML = `
                <p><strong>Email:</strong> ${user.email || user.name}</p>
                <p><small>Sesión iniciada: ${user.lastLogin || new Date().toLocaleString()}</small></p>
            `;
            container.appendChild(div);
        });
    }
}

// Registro global
if (!customElements.get("user-modal")) {
    customElements.define("user-modal", UserModal);
}