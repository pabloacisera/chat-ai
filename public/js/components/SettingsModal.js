import { configService } from "../services/ConfigService.js";
import { storageService } from "../services/StorageService.js";
import { ToastNotification } from "./ToastNotification.js";

const template = document.createElement("template");
template.innerHTML = `
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
        .modal {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            width: 90%;
            max-width: 480px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        h2 { margin: 0 0 1.5rem; color: #333; font-size: 1.3rem; }
        .section { margin-bottom: 1.5rem; }
        .section-title { font-size: 0.8rem; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.8rem; }
        .field { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0; }
        .field label { color: #444; font-size: 0.9rem; }
        .field select, .field input[type="number"] { padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.85rem; }
        .checkbox-group { display: flex; align-items: center; gap: 8px; }
        .checkbox-group input { width: 18px; height: 18px; cursor: pointer; }
        .actions { display: flex; gap: 10px; margin-top: 1.5rem; }
        button { cursor: pointer; padding: 10px 20px; border-radius: 8px; border: none; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; }
        #btn-close { background: transparent; color: #888; border: 1px solid #ddd; flex: 1; }
        #btn-close:hover { background: #f5f5f5; }
        #btn-reset { background: #dc3545; color: white; }
        #btn-reset:hover { background: #c82333; }
        .divider { height: 1px; background: #eee; margin: 1rem 0; }
    </style>
    <div class="modal">
        <h2>Ajustes de Interfaz</h2>

        <div class="section">
            <div class="section-title">Apariencia</div>
            <div class="field">
                <label for="theme-select">Tema visual</label>
                <select id="theme-select">
                    <option value="system">Sistema</option>
                    <option value="light">Claro</option>
                    <option value="dark">Oscuro</option>
                </select>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Comportamiento</div>
            <div class="field">
                <label for="stream-speed">Velocidad del stream (ms)</label>
                <input type="number" id="stream-speed" min="1" max="100" value="8">
            </div>
            <div class="field">
                <div class="checkbox-group">
                    <input type="checkbox" id="show-title">
                    <label for="show-title">Título automático de conversaciones</label>
                </div>
            </div>
            <div class="field">
                <div class="checkbox-group">
                    <input type="checkbox" id="notif-sound">
                    <label for="notif-sound">Sonido al recibir respuesta (en segundo plano)</label>
                </div>
            </div>
        </div>

        <div class="divider"></div>

        <div class="section">
            <div class="section-title">Mantenimiento</div>
            <div class="field">
                <label for="auto-delete-days">Auto-eliminar tras (días)</label>
                <input type="number" id="auto-delete-days" min="0" max="365" placeholder="Nunca">
            </div>
            <div class="field">
                <span style="color: #444; font-size: 0.9rem;">Restablecer datos locales</span>
                <button id="btn-reset">Reset</button>
            </div>
        </div>

        <div class="actions">
            <button id="btn-close">Cerrar</button>
        </div>
    </div>
`;

export class SettingsModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.loadValues();
        this.bindEvents();
    }

    async loadValues() {
        const cfg = configService.getGlobal();
        this.shadowRoot.querySelector("#theme-select").value = cfg.theme || "system";
        this.shadowRoot.querySelector("#stream-speed").value = cfg.streamSpeed || 8;
        this.shadowRoot.querySelector("#show-title").checked = cfg.showTitle !== false;

        const config = await storageService.getConfig();
        if (config?.autoDeleteDays) {
            this.shadowRoot.querySelector("#auto-delete-days").value = config.autoDeleteDays;
        }

        this.shadowRoot.querySelector("#notif-sound").checked = cfg.notificationSound !== false;
    }

    bindEvents() {
        this.shadowRoot.querySelector("#theme-select").addEventListener("change", (e) => {
            const theme = e.target.value;
            configService.updateGlobal({ theme });
            const root = document.documentElement;
            if (theme === "dark") {
                root.classList.add("dark");
            } else if (theme === "light") {
                root.classList.remove("dark");
            } else {
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                root.classList.toggle("dark", prefersDark);
            }
        });

        this.shadowRoot.querySelector("#stream-speed").addEventListener("change", (e) => {
            configService.updateGlobal({ streamSpeed: parseInt(e.target.value) || 8 });
        });

        this.shadowRoot.querySelector("#show-title").addEventListener("change", (e) => {
            configService.updateGlobal({ showTitle: e.target.checked });
        });

        this.shadowRoot.querySelector("#notif-sound").addEventListener("change", (e) => {
            configService.updateGlobal({ notificationSound: e.target.checked });
        });

        this.shadowRoot.querySelector("#auto-delete-days").addEventListener("change", (e) => {
            const days = parseInt(e.target.value);
            const value = days > 0 ? days : null;
            storageService.updateConfig({ autoDeleteDays: value });
            ToastNotification.show(value ? `Conversaciones se eliminarán tras ${value} días` : "Auto-eliminación desactivada", "info");
        });

        this.shadowRoot.querySelector("#btn-reset").addEventListener("click", () => {
            if (confirm("¿Estás seguro? Se borrarán todos los datos locales (conversaciones, configuraciones). Esta acción no se puede deshacer.")) {
                configService.clear();
                localStorage.removeItem("msjData");
                localStorage.removeItem("user-info");
                localStorage.removeItem("authToken");
                localStorage.removeItem("anonSessionId");
                localStorage.removeItem("currentConvId");
                localStorage.removeItem("conversations:cache");
                window.location.reload();
            }
        });

        this.shadowRoot.querySelector("#btn-close").addEventListener("click", () => this.remove());
        this.addEventListener("keydown", (e) => { if (e.key === "Escape") this.remove(); });
    }
}

if (!customElements.get("settings-modal")) {
    customElements.define("settings-modal", SettingsModal);
}
