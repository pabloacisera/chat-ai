import { userService } from "../services/UserInfo.js";

// 1. Template para cuando NO hay usuario (Identificación)
const templateSingIn = document.createElement("template");
templateSingIn.innerHTML = `
    <style>
        :host {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.6); /* Overlay oscuro */
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
        
        .actions { display: flex; flex-direction: column; gap: 10px; }
        
        button { 
            cursor: pointer; padding: 12px; border-radius: 8px; border: none; font-weight: bold; 
        }
        #btn-login { background: #007bff; color: white; transition: background 0.2s; }
        #btn-login:hover { background: #0056b3; }
        #btn-close { background: transparent; color: #888; }
    </style>
    <div class="container">
        <h2>Identificación</h2>
        <p>No se encontró información de usuario en el sistema.</p>
        <div class="actions">
            <button id="btn-login">SIMULAR INICIO DE SESIÓN</button>
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
        // Botón Login
        this.shadowRoot.querySelector("#btn-login")?.addEventListener("click", () => {
            userService.add({ 
                name: "Admin User", 
                role: "Administrator",
                lastLogin: new Date().toLocaleString() 
            });
            this.refreshData();
            this.render();
        });

        // Botón Cancelar/Cerrar
        this.shadowRoot.querySelector("#btn-close")?.addEventListener("click", () => {
            this.remove();
        });
    }

    setupDataUserEvents() {
        // Botón Borrar Sesión
        this.shadowRoot.querySelector("#btn-clear")?.addEventListener("click", () => {
            userService.clear();
            this.refreshData();
            this.render();
        });

        // Botón Salir
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
                <p><strong>Nombre:</strong> ${user.name}</p>
                <p><strong>Rol:</strong> ${user.role}</p>
                <p><small>Sesión iniciada: ${user.lastLogin}</small></p>
            `;
            container.appendChild(div);
        });
    }
}

// Registro global
if (!customElements.get("user-modal")) {
    customElements.define("user-modal", UserModal);
}