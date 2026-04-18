import { configService } from "../services/ConfigService.js";
import { ToastNotification } from "./ToastNotification.js";
import { storageService } from "../services/StorageService.js";
import { conversationService } from "../services/ConversationService.js";

const MODELOS_DISPONIBLES = [
    { key: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { key: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", label: "Together AI (Llama 3.1 8B)" },
    { key: "llama-3.3-70b-versatile", label: "Groq (Llama 3.3 70B)" },
    { key: "mistral-small", label: "Mistral Small" }
];

const templateConfig = document.createElement("template");
templateConfig.innerHTML = `
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
        
        .modal-wrapper {
            display: flex;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            width: 90%;
            max-width: 950px;
            max-height: 90vh;
            overflow: hidden;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn { 
            from { opacity: 0; transform: translateY(-20px); } 
            to { opacity: 1; transform: translateY(0); }
        }
        
        .main-content {
            flex: 1;
            padding: 1.5rem;
            overflow-y: auto;
            min-width: 0;
        }
        
        .aside {
            width: 380px;
            background: #f8f9fa;
            border-left: 1px solid #e9ecef;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
        }
        
        h2 { 
            margin: 0 0 0.5rem; 
            color: #333; 
            font-size: 1.4rem;
        }
        
        h3 {
            margin: 1.5rem 0 1rem;
            color: #555;
            font-size: 0.95rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        h3:first-of-type {
            margin-top: 0;
        }
        
        .section-divider {
            height: 1px;
            background: #e9ecef;
            margin: 1.5rem 0;
        }
        
        .form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }
        
        .form-row {
            display: flex;
            gap: 1rem;
        }
        
        .form-row .form-group {
            flex: 1;
        }
        
        label { 
            font-weight: 600; 
            color: #555;
            font-size: 0.85rem;
        }
        
        span.hint {
            font-size: 0.75rem;
            color: #888;
            line-height: 1.3;
        }
        
        select, input, textarea {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 0.9rem;
            transition: border-color 0.2s;
            font-family: inherit;
        }
        
        select:focus, input:focus, textarea:focus {
            outline: none;
            border-color: #007bff;
        }
        
        input:disabled, textarea:disabled {
            background-color: #f5f5f5;
            color: #999;
            cursor: not-allowed;
        }
        
        textarea {
            resize: vertical;
            min-height: 80px;
        }
        
        .number-input {
            width: 100px;
        }
        
        .actions { 
            display: flex; 
            flex-direction: column; 
            gap: 10px; 
            margin-top: 1.5rem;
        }
        
        button { 
            cursor: pointer; 
            padding: 12px; 
            border-radius: 8px; 
            border: none; 
            font-weight: bold; 
            transition: all 0.2s;
            font-size: 0.9rem;
        }
        
        #btn-save { 
            background: #007bff; 
            color: white; 
        }
        
        #btn-save:hover { 
            background: #0056b3; 
            transform: translateY(-1px);
        }
        
        #btn-save:active {
            transform: translateY(0);
        }
        
        #btn-cancel { 
            background: transparent; 
            color: #888; 
            border: 1px solid #ddd;
        }
        
        #btn-cancel:hover { 
            background: #f5f5f5;
            color: #666;
        }
        
        /* Aside - Keys Table */
        .keys-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }
        
        .keys-table-container {
            flex: 1;
            overflow-y: auto;
        }
        
        .keys-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.75rem;
            table-layout: fixed;
        }
        
        .keys-table thead {
            position: sticky;
            top: 0;
            background: #f8f9fa;
            z-index: 1;
        }
        
        .keys-table th {
            text-align: left;
            padding: 10px 8px;
            color: #666;
            font-weight: 600;
            border-bottom: 2px solid #dee2e6;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .keys-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: middle;
        }
        
        .keys-table tbody tr:hover {
            background: #e9ecef;
        }
        
        .keys-table .model-name {
            font-weight: 500;
            color: #333;
            font-size: 0.8rem;
        }
        
        .keys-table .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #28a745;
            display: inline-block;
            vertical-align: middle;
            margin-right: 4px;
        }
        
        .key-actions {
            display: inline-flex;
            gap: 4px;
            float: right;
        }
        
        .key-actions button {
            padding: 2px 6px;
            font-size: 11px;
            border-radius: 3px;
            line-height: 1;
            cursor: pointer;
        }
        
        .btn-edit-key {
            background: #6c757d;
            color: white;
        }
        
        .btn-edit-key:hover {
            background: #5a6268;
        }
        
        .btn-remove-key {
            background: #dc3545;
            color: white;
        }
        
        .btn-remove-key:hover {
            background: #c82333;
        }
        
        .empty-keys {
            color: #999;
            font-size: 0.8rem;
            text-align: center;
            padding: 1rem;
        }
        
        /* Checkbox styling */
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .checkbox-group input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }
        
        .checkbox-group label {
            cursor: pointer;
            font-weight: normal;
        }
        
        /* Modal para editar key */
        .edit-key-modal {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .edit-key-form {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            width: 90%;
            max-width: 400px;
        }
        
        .edit-key-form h4 {
            margin: 0 0 1rem;
            color: #333;
        }
        
        .edit-key-form input, .edit-key-form textarea {
            width: 100%;
            margin-bottom: 1rem;
        }
        
        .edit-key-form .edit-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        
        .edit-key-form button {
            padding: 8px 16px;
        }
        
        .btn-confirm {
            background: #007bff;
            color: white;
        }
        
        .btn-cancel-edit {
            background: #6c757d;
            color: white;
        }
    </style>
    
    <div class="modal-wrapper">
        <div class="main-content">
            <h2>⚙️ Configuraciones</h2>
            
            <h3>Configuración de Modelos</h3>
            <form class="form">
                <div class="form-group">
                    <label for="model-list">🤖 Modelo:</label>
                    <span class="hint">Selecciona el motor de procesamiento de datos</span>
                    <select id="model-list" name="model-list">
                        <option value="">-- Seleccionar --</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="api-key">🔑 API Key:</label>
                    <span class="hint">Las keys de los modelos las puedes obtener desde las plataformas del modelo elegido</span>
                    <input type="password" id="api-key" name="api-key" disabled placeholder="Selecciona un modelo primero">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="max-tokens">📊 Tokens:</label>
                        <span class="hint">Cantidad máxima de contexto</span>
                        <input type="number" id="max-tokens" name="max-tokens" placeholder="1000" min="100" max="1000000" class="number-input">
                    </div>
                    
                    <div class="form-group">
                        <label for="temperature">🌡️ Temperatura:</label>
                        <span class="hint">0.0 = exacto, 1.0 = creativo</span>
                        <input type="number" id="temperature" name="temperature" placeholder="0.7" min="0" max="1" step="0.1" class="number-input">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="system-prompt">📝 System Prompt:</label>
                    <span class="hint">Instrucciones especiales que se enviarán en cada consulta (opcional)</span>
                    <textarea id="system-prompt" name="system-prompt" placeholder="Ej: Eres un asistente especializado en programación..." rows="3"></textarea>
                </div>
            </form>
            
            <div class="section-divider"></div>
            
            <h3>Configuración de Interfaz</h3>
            <form class="form">
                <div class="form-group">
                    <div class="checkbox-group">
                        <input type="checkbox" id="show-title" name="show-title" checked>
                        <label for="show-title">Mostrar título de conversación</label>
                    </div>
                    <span class="hint">Al habilitar, se generará un título automáticamente después de la primera consulta</span>
                </div>
                
                <div class="form-group">
                    <label for="stream-speed">⚡ Velocidad del efecto typing:</label>
                    <span class="hint">Velocidad de aparición del texto (ms) - menor es más rápido</span>
                    <input type="number" id="stream-speed" name="stream-speed" placeholder="8" min="1" max="100" class="number-input">
                </div>
            </form>
            
            <div class="section-divider"></div>
            
            <h3>📂 Gestionar Conversaciones</h3>
            <div class="form">
                <div id="conversation-manager" style="display: none;">
                    <div class="conversation-list-container">
                        <div style="margin-bottom: 10px;">
                            <label style="font-size: 0.8rem; color: #666;">
                                <input type="checkbox" id="select-all-convs"> Seleccionar todas
                            </label>
                        </div>
                        <div id="conversation-list" style="max-height: 150px; overflow-y: auto; border: 1px solid #ddd; border-radius: 6px; padding: 8px;">
                        </div>
                    </div>
                    <div class="actions" style="flex-direction: row; gap: 10px; margin-top: 10px;">
                        <button type="button" id="btn-archive-selected" class="btn-action-convs" style="background: #17a2b8; color: white; padding: 8px 12px; font-size: 0.8rem;">📦 Archivar</button>
                        <button type="button" id="btn-delete-selected" class="btn-action-convs" style="background: #dc3545; color: white; padding: 8px 12px; font-size: 0.8rem;">🗑️ Eliminar</button>
                    </div>
                </div>
                <div id="no-conversations-msg" class="empty-keys" style="color: #999; font-size: 0.85rem; padding: 10px;">
                    Carga las conversaciones desde el panel principal
                </div>
            </div>
            
            <div class="actions">
                <button type="button" id="btn-save">💾 Guardar</button>
                <button type="button" id="btn-cancel">❌ Cancelar</button>
            </div>
        </div>
        
        <aside class="aside">
            <div class="keys-section">
                <h3>🔐 Keys Guardadas</h3>
                <div class="keys-table-container">
                    <table class="keys-table">
                        <thead>
                            <tr>
                                <th style="width: 140px;">Modelo</th>
                                <th style="width: 60px; text-align: center;">Estado</th>
                                <th style="width: 70px; text-align: right;">Acción</th>
                            </tr>
                        </thead>
                        <tbody id="keys-tbody">
                        </tbody>
                    </table>
                    <div id="empty-keys-msg" class="empty-keys">No hay keys guardadas aún</div>
                </div>
            </div>
        </aside>
    </div>
`;

export class ConfigChatModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.configChat = null;
    }

    connectedCallback() {
        this.loadSavedConfig();
        this.render();
    }

    loadSavedConfig() {
        this.configChat = configService.getCurrent();
        this.globalConfig = configService.getGlobal();
        this.conversations = [];
    }

    getProviderFromModel(model) {
        const providers = {
            'gemini-2.5-flash': 'google',
            'mistral-small': 'mistral',
            'llama-3.3-70b-versatile': 'groq',
            'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': 'groq'
        };
        return providers[model] || 'google';
    }

    async loadConversationsFromAPI() {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        
        try {
            this.conversations = await storageService.getConversations();
        } catch (error) {
            console.error("Error cargando conversaciones:", error);
            this.conversations = [];
        }
    }

    renderConversationsManager() {
        const manager = this.shadowRoot.querySelector("#conversation-manager");
        const noConvsMsg = this.shadowRoot.querySelector("#no-conversations-msg");
        const convList = this.shadowRoot.querySelector("#conversation-list");
        const selectAll = this.shadowRoot.querySelector("#select-all-convs");
        
        if (!this.conversations || this.conversations.length === 0) {
            if (manager) manager.style.display = "none";
            if (noConvsMsg) noConvsMsg.style.display = "block";
            return;
        }
        
        if (manager) manager.style.display = "block";
        if (noConvsMsg) noConvsMsg.style.display = "none";
        
        convList.innerHTML = "";
        
        this.conversations.forEach(conv => {
            const div = document.createElement("div");
            div.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 6px; border-bottom: 1px solid #eee;";
            div.innerHTML = `
                <input type="checkbox" class="conv-checkbox" value="${conv.id}" style="cursor: pointer;">
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem;">${conv.title || 'Sin título'}</span>
            `;
            convList.appendChild(div);
        });
        
        selectAll?.addEventListener("change", (e) => {
            const checkboxes = convList.querySelectorAll(".conv-checkbox");
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });
        
        this.shadowRoot.querySelector("#btn-archive-selected")?.addEventListener("click", () => this.archiveSelectedConversations());
        this.shadowRoot.querySelector("#btn-delete-selected")?.addEventListener("click", () => this.deleteSelectedConversations());
    }

    async archiveSelectedConversations() {
        const checkboxes = this.shadowRoot.querySelectorAll(".conv-checkbox:checked");
        const ids = Array.from(checkboxes).map(cb => cb.value);
        
        if (ids.length === 0) {
            ToastNotification.warning("Selecciona al menos una conversación");
            return;
        }
        
        try {
            await fetch('/api/conversations/archive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ conversationIds: ids })
            });
            
            this.conversations = this.conversations.filter(c => !ids.includes(c.id));
            this.renderConversationsManager();
            
            const convService = window.chatApp?.conversationService;
            if (convService) {
                convService.load();
                window.chatApp?.sidebarRenderer?.render(convService.getAll());
            }
            
            ToastNotification.success(`${ids.length} conversación(es) archivada(s)`);
        } catch (error) {
            console.error("Error archivando:", error);
            ToastNotification.error("Error al archivar conversaciones");
        }
    }

    async deleteSelectedConversations() {
        const checkboxes = this.shadowRoot.querySelectorAll(".conv-checkbox:checked");
        const ids = Array.from(checkboxes).map(cb => cb.value);
        
        if (ids.length === 0) {
            ToastNotification.warning("Selecciona al menos una conversación");
            return;
        }
        
        try {
            await fetch('/api/conversations/delete/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ conversationIds: ids })
            });
            
            this.conversations = this.conversations.filter(c => !ids.includes(c.id));
            this.renderConversationsManager();
            
            const convService = window.chatApp?.conversationService;
            if (convService) {
                convService.load();
                window.chatApp?.sidebarRenderer?.render(convService.getAll());
            }
            
            ToastNotification.success(`${ids.length} conversación(es) eliminada(s)`);
        } catch (error) {
            console.error("Error eliminando:", error);
            ToastNotification.error("Error al eliminar conversaciones");
        }
    }

render() {
        this.shadowRoot.innerHTML = "";
        this.shadowRoot.appendChild(templateConfig.content.cloneNode(true));
        
        this.populateModelSelect();
        this.loadSavedValues();
        this.renderKeysTable();
        this.setupConfigEvents();

        this.loadConversationsFromAPI().then(() => {
            this.renderConversationsManager();
        });

        const showTitleInput = this.shadowRoot.querySelector("#show-title");
        const globalConfig = configService.getGlobal();
        if (showTitleInput) {
            showTitleInput.checked = globalConfig.showTitle !== false;
        }
    }

    populateModelSelect() {
        const select = this.shadowRoot.querySelector("#model-list");
        MODELOS_DISPONIBLES.forEach(m => {
            const option = document.createElement("option");
            option.value = m.key;
            option.textContent = m.label;
            select.appendChild(option);
        });
    }

    loadSavedValues() {
        const modelSelect = this.shadowRoot.querySelector("#model-list");
        const maxTokensInput = this.shadowRoot.querySelector("#max-tokens");
        const apiKeyInput = this.shadowRoot.querySelector("#api-key");
        const temperatureInput = this.shadowRoot.querySelector("#temperature");
        const systemPromptInput = this.shadowRoot.querySelector("#system-prompt");
        const showTitleInput = this.shadowRoot.querySelector("#show-title");
        const streamSpeedInput = this.shadowRoot.querySelector("#stream-speed");
        
        const currentModel = configService.getCurrentModel();
        const chatConfig = configService.getAll();
        const globalConfig = configService.getGlobal();
        
        console.log("🔍 Cargando valores. showTitle en servicio:", globalConfig.showTitle);

        if (currentModel && chatConfig[currentModel]) {
            modelSelect.value = currentModel;
            const currentChatConfig = chatConfig[currentModel];
            maxTokensInput.value = currentChatConfig.maxTokens || 1000;
            temperatureInput.value = currentChatConfig.temperature !== undefined ? currentChatConfig.temperature : 0.7;
            systemPromptInput.value = currentChatConfig.systemPrompt || "";
            
            if (currentChatConfig.apiKey) {
                apiKeyInput.disabled = false;
                apiKeyInput.placeholder = "🔐 API key ya guardada";
            }
        } else {
            modelSelect.value = "";
            maxTokensInput.value = 1000;
            temperatureInput.value = 0.7;
        }
        
        // CORRECCIÓN RADICAL PARA EL CHECKBOX
        if (showTitleInput) {
            // Si el valor es null o undefined (primer inicio), forzamos true
            const shouldBeChecked = globalConfig.showTitle !== false;
            
            // Forzamos tanto la propiedad como el atributo visual
            showTitleInput.checked = shouldBeChecked;
            if (shouldBeChecked) {
                showTitleInput.setAttribute("checked", "");
            } else {
                showTitleInput.removeAttribute("checked");
            }
            
            console.log("✅ Checkbox de título establecido a:", shouldBeChecked);
        }

        if (streamSpeedInput) {
            streamSpeedInput.value = globalConfig.streamSpeed || 8;
        }
    }

    renderKeysTable() {
        const tbody = this.shadowRoot.querySelector("#keys-tbody");
        const emptyMsg = this.shadowRoot.querySelector("#empty-keys-msg");
        const modelsWithKeys = configService.getModelsWithKeys();
        
        if (modelsWithKeys.length === 0) {
            emptyMsg.style.display = "block";
            tbody.innerHTML = "";
            return;
        }
        
        emptyMsg.style.display = "none";
        tbody.innerHTML = "";
        
        modelsWithKeys.forEach(item => {
            const modelLabel = MODELOS_DISPONIBLES.find(m => m.key === item.model)?.label || item.model;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${modelLabel}</td>
                <td style="width: 60px; text-align: center;">
                    <span class="status-dot"></span> OK
                </td>
                <td style="width: 70px; text-align: right;">
                    <button class="btn-edit-key" data-model="${item.model}" title="Editar">✏️</button>
                    <button class="btn-remove-key" data-model="${item.model}" title="Eliminar">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        tbody.querySelectorAll(".btn-edit-key").forEach(btn => {
            btn.addEventListener("click", (e) => this.showEditKeyModal(e.target.dataset.model));
        });
        
        tbody.querySelectorAll(".btn-remove-key").forEach(btn => {
            btn.addEventListener("click", (e) => this.removeKey(e.target.dataset.model));
        });
    }

    showEditKeyModal(modelKey) {
        const modelConfig = configService.getByModel(modelKey);
        const modelLabel = MODELOS_DISPONIBLES.find(m => m.key === modelKey)?.label || modelKey;
        
        const modal = document.createElement("div");
        modal.className = "edit-key-modal";
        modal.innerHTML = `
            <div class="edit-key-form">
                <h4>Editar: ${modelLabel}</h4>
                <input type="password" id="new-api-key" placeholder="Nueva API Key">
                <input type="number" id="new-max-tokens" placeholder="Tokens" value="${modelConfig?.maxTokens || 1000}" step="100" min="100" max="1000000">
                <input type="number" id="new-temperature" placeholder="Temperatura" value="${modelConfig?.temperature || 0.7}" step="0.1" min="0" max="1">
                <textarea id="new-system-prompt" placeholder="System Prompt (opcional)" rows="3">${modelConfig?.systemPrompt || ''}</textarea>
                <div class="edit-actions">
                    <button class="btn-cancel-edit">Cancelar</button>
                    <button class="btn-confirm">Guardar</button>
                </div>
            </div>
        `;
        
        modal.querySelector(".btn-cancel-edit").addEventListener("click", () => modal.remove());
        modal.querySelector(".btn-confirm").addEventListener("click", () => {
            const newKey = modal.querySelector("#new-api-key").value;
            const newTokens = parseInt(modal.querySelector("#new-max-tokens").value) || 1000;
            const newTemp = parseFloat(modal.querySelector("#new-temperature").value) || 0.7;
            const newPrompt = modal.querySelector("#new-system-prompt").value;
            
            if (!newKey) {
                ToastNotification.warning("Debes ingresar una API key");
                return;
            }
            
            configService.add(modelKey, {
                apiKey: newKey,
                maxTokens: newTokens,
                temperature: newTemp,
                systemPrompt: newPrompt
            });
            
            this.renderKeysTable();
            modal.remove();
            ToastNotification.success("Configuración actualizada correctamente");
        });
        
        this.shadowRoot.appendChild(modal);
    }

    removeKey(modelKey) {
        configService.removeKey(modelKey);
        this.renderKeysTable();
        
        const currentModel = this.shadowRoot.querySelector("#model-list").value;
        if (currentModel === modelKey) {
            const apiKeyInput = this.shadowRoot.querySelector("#api-key");
            apiKeyInput.value = "";
            apiKeyInput.placeholder = "Selecciona un modelo primero";
            apiKeyInput.disabled = true;
            
            this.shadowRoot.querySelector("#max-tokens").value = 1000;
            this.shadowRoot.querySelector("#temperature").value = 0.7;
            this.shadowRoot.querySelector("#system-prompt").value = "";
        }
        
        ToastNotification.info("Configuración eliminada");
        this.remove();
    }

    setupConfigEvents() {
        const modelSelect = this.shadowRoot.querySelector("#model-list");
        const apiKeyInput = this.shadowRoot.querySelector("#api-key");
        const saveButton = this.shadowRoot.querySelector("#btn-save");
        const cancelButton = this.shadowRoot.querySelector("#btn-cancel");

        modelSelect?.addEventListener("change", (event) => {
            const selectedModel = event.target.value;
            const maxTokensInput = this.shadowRoot.querySelector("#max-tokens");
            const temperatureInput = this.shadowRoot.querySelector("#temperature");
            const systemPromptInput = this.shadowRoot.querySelector("#system-prompt");
            const apiKeyInput = this.shadowRoot.querySelector("#api-key");

            if (selectedModel) {
                const modelConfig = configService.getByModel(selectedModel);
                apiKeyInput.disabled = false;
                
                if (modelConfig && modelConfig.apiKey) {
                    apiKeyInput.placeholder = "🔐 API key ya guardada (escribe solo si quieres cambiarla)";
                } else {
                    const modelLabel = MODELOS_DISPONIBLES.find(m => m.key === selectedModel)?.label || selectedModel;
                    apiKeyInput.placeholder = `🔑 Ingresa tu API key para ${modelLabel}`;
                    apiKeyInput.value = "";
                }
                apiKeyInput.type = "password";
                
                if (modelConfig) {
                    maxTokensInput.value = modelConfig.maxTokens || 1000;
                    temperatureInput.value = modelConfig.temperature !== undefined ? modelConfig.temperature : 0.7;
                    systemPromptInput.value = modelConfig.systemPrompt || "";
                } else {
                    maxTokensInput.value = 1000;
                    temperatureInput.value = 0.7;
                    systemPromptInput.value = "";
                }
            } else {
                apiKeyInput.disabled = true;
                apiKeyInput.value = "";
                apiKeyInput.placeholder = "Selecciona un modelo primero";
                maxTokensInput.value = "";
                temperatureInput.value = "";
                systemPromptInput.value = "";
            }
        });

        saveButton?.addEventListener("click", async () => {
            const model = modelSelect?.value;
            const apiKey = apiKeyInput?.value;
            const maxTokens = this.shadowRoot.querySelector("#max-tokens")?.value;
            const temperature = this.shadowRoot.querySelector("#temperature")?.value;
            const systemPrompt = this.shadowRoot.querySelector("#system-prompt")?.value;
            const showTitle = this.shadowRoot.querySelector("#show-title")?.checked;
            const streamSpeed = this.shadowRoot.querySelector("#stream-speed")?.value;

            if (!model) {
                ToastNotification.warning("Debes seleccionar un modelo");
                return;
            }

            let finalApiKey = apiKey;
            if (!apiKey && this.configChat && this.configChat.model === model && this.configChat.apiKey) {
                finalApiKey = this.configChat.apiKey;
            } else if (!apiKey) {
                ToastNotification.warning("Debes ingresar tu API key");
                return;
            }

            const isAuthenticated = !!localStorage.getItem('authToken');

            if (isAuthenticated) {
                try {
                    await storageService.addModel({
                        modelId: model,
                        provider: this.getProviderFromModel(model),
                        apiKey: finalApiKey,
                        maxTokens: maxTokens ? parseInt(maxTokens) : 1000,
                        temperature: temperature ? parseFloat(temperature) : 0.7,
                        systemPrompt: systemPrompt || ""
                    });
                } catch (error) {
                    console.error("Error sincronizando modelo con API:", error);
                }

                try {
                    await storageService.updateConfig({
                        theme: this.globalConfig.theme || 'system',
                        activeModelId: model,
                        streamSpeed: streamSpeed ? parseInt(streamSpeed) : 8,
                        showTitle: showTitle !== false
                    });
                } catch (error) {
                    console.error("Error sincronizando config con API:", error);
                }
            }

            configService.add(model, {
                apiKey: finalApiKey,
                maxTokens: maxTokens ? parseInt(maxTokens) : 1000,
                temperature: temperature ? parseFloat(temperature) : 0.7,
                systemPrompt: systemPrompt || ""
            });
            
            configService.setCurrentModel(model);
            
            configService.updateGlobal({
                showTitle: showTitle !== false,
                streamSpeed: streamSpeed ? parseInt(streamSpeed) : 8
            });
            
            console.log("📦 Datos guardados:", {
                model,
                maxTokens,
                temperature,
                systemPrompt: systemPrompt ? "[presente]" : "[vacío]",
                showTitle,
                streamSpeed
            });

            apiKeyInput.value = "";
            this.configChat = configService.getCurrent();
            this.globalConfig = configService.getGlobal();
            
            this.renderKeysTable();
            
            this.dispatchEvent(new CustomEvent('config-saved', { 
                detail: { model, maxTokens, temperature, systemPrompt, showTitle, streamSpeed },
                bubbles: true 
            }));

            ToastNotification.success("Configuración guardada correctamente");
            
            setTimeout(() => this.remove(), 1500);
        });

        cancelButton?.addEventListener("click", () => {
            this.remove();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isConnected) {
                this.remove();
            }
        });
    }
}

if (!customElements.get("config-modal")) {
    customElements.define("config-modal", ConfigChatModal);
}