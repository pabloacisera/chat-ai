import { DeleteConversation } from "./components/DeleteConversation.js";
import { UserModal } from "./components/UserModal.js";
import { ConfigChatModal } from "./components/ConfigChatModal.js";
import { Request } from "./helpers/Request.js";
import { ConversationService } from "./services/ConversationService.js";
import { SidebarRenderer } from "./services/SidebarRenderer.js";
import { ChatRenderer } from "./services/ChatRenderer.js";
import { formatDateFriendly, generateId } from "./utils/date.js";
import { configService } from "./services/ConfigService.js";
import { ToastNotification } from "./components/ToastNotification.js";
import { storageService } from "./services/StorageService.js";

class ChatApp {
    constructor() {
        this.conversationService = new ConversationService();
        this.sidebarRenderer = null;
        this.chatRenderer = null;
        
        this.currentStream = null;
        this.currentRequest = null;
        this.isWaitingForResponse = false;
        this.isAuthenticated = false;
    }

    async init() {
        console.log("🚀 Inicializando App...");
        
        const sidebarContainer = document.querySelector(".list-conversations");
        const chatContainer = document.getElementById("messages-container");
        
        if (!sidebarContainer || !chatContainer) {
            console.error("Contenedores no encontrados");
            return;
        }

        const currentId = this.conversationService.getCurrentId();
        this.sidebarRenderer = new SidebarRenderer(sidebarContainer, currentId);
        this.chatRenderer = new ChatRenderer(chatContainer);

        // 1. Cargar configuración y autenticación
        await this.initializeFromAPI();
        
        // 2. Renderizar sidebar con lo que tengamos
        this.sidebarRenderer.render(this.conversationService.getAll());
        
        // 3. Cargar conversación actual si existe
        console.log("📍 currentId al inicio:", currentId);
        
        if (currentId) {
            const conv = this.conversationService.getById(currentId);
            if (conv) {
                console.log("🔄 Cargando mensajes de conversación actual...");
                await this.loadConversationMessages(currentId);
            } else {
                console.warn("⚠️ currentId no encontrado en la lista de conversaciones");
                this.chatRenderer.render(null, false, false);
            }
        } else {
            this.chatRenderer.render(null, false, false);
        }

        this.bindEvents();
    }

    async initializeFromAPI() {
        const token = localStorage.getItem('authToken');
        const anonSessionId = localStorage.getItem('anonSessionId');
        
        if (token) {
            this.isAuthenticated = true;
            console.log("👤 Usuario autenticado, cargando desde API...");
            try {
                const [user, config, conversations] = await Promise.all([
                    storageService.getUser(),
                    storageService.getConfig(),
                    storageService.getConversations()
                ]);
                
                if (user) localStorage.setItem('user:cache', JSON.stringify(user));
                
                if (config) {
                    localStorage.setItem('config:cache', JSON.stringify(config));
                    configService.updateGlobal({ 
                        theme: config.theme || 'system',
                        streamSpeed: config.streamSpeed || 8,
                        showTitle: config.showTitle !== false
                    });
                    this.applyTheme(config.theme || 'system');
                }
                
                if (conversations) {
                    this.conversationService.setAll(conversations);
                    console.log(`✅ ${conversations.length} conversaciones cargadas para usuario autenticado`);
                }
            } catch (error) {
                console.error("❌ Error cargando datos de usuario:", error);
            }
        } else {
            console.log("👤 Usuario anónimo");
            const sessionId = localStorage.getItem('anonSessionId');
            
            if (!sessionId) {
                try {
                    await storageService.createAnonSession();
                    const newSessionId = localStorage.getItem('anonSessionId');
                    if (newSessionId) {
                        ToastNotification.info("Estás usando la app sin cuenta. Tu historial se guardará por 24 horas. ¡Regístrate para no perder tus conversaciones!");
                    }
                } catch (error) {
                    console.error("Error creando sesión anónima:", error);
                }
            } else {
                try {
                    const welcomeShown = await storageService.checkWelcomeShown(sessionId);
                    if (!welcomeShown) {
                        ToastNotification.info("Tu historial anónimo se guardará por 24 horas.");
                        await storageService.setWelcomeShown(sessionId);
                    }
                    
                    const conversations = await storageService.getConversations();
                    if (conversations) {
                        this.conversationService.setAll(conversations);
                        console.log(`✅ ${conversations.length} conversaciones cargadas desde Redis`);
                    }
                } catch (error) {
                    console.error("❌ Error cargando desde Redis:", error);
                }
            }
        }
    }

    applyTheme(theme) {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }

    loadInitialData() {
        // Método mantenido por compatibilidad pero vacío ya que la lógica está en init()
    }

    async loadConversationMessages(id) {
        const token = localStorage.getItem('authToken');
        let messages = [];
        
        console.log(`[DEBUG] 📂 Iniciando loadConversationMessages para ID: ${id}`);
        
        try {
            const apiMessages = await storageService.getMessages(id);
            console.log(`[DEBUG] 📥 Mensajes brutos recibidos de la API para ${id}:`, apiMessages);

            messages = apiMessages.map(msg => ({
                question: msg.role === 'user' ? msg.content : null,
                response: msg.role === 'assistant' || msg.role === 'ai' ? msg.content : null
            }));
            
            console.log(`[DEBUG] 🔄 Mensajes mapeados para ${id}:`, messages);
            
            // Actualizar el estado local SIEMPRE
            const conv = this.conversationService.getById(id);
            if (conv) {
                conv.messages = messages;
                console.log(`[DEBUG] ✅ Estado local actualizado para ${id}. Total mensajes en objeto conv:`, conv.messages.length);
            } else {
                console.error(`[DEBUG] ❌ No se encontró la conversación ${id} en el service para asignar mensajes`);
            }
        } catch (error) {
            console.error("[DEBUG] ❌ Error cargando mensajes de la API:", error);
            const conv = this.conversationService.getById(id);
            messages = conv?.messages || [];
        }
        
        // Renderizar solo si sigue siendo la conversación actual
        const currentId = this.conversationService.getCurrentId();
        console.log(`[DEBUG] 📍 Comparando currentId (${currentId}) con id cargado (${id})`);

        if (String(currentId) === String(id)) {
            const conversationToRender = this.conversationService.getById(id);
            if (conversationToRender) {
                console.log(`[DEBUG] 🎨 Llamando a ChatRenderer.render para ${id} con ${conversationToRender.messages.length} mensajes`);
                this.chatRenderer.render(conversationToRender, false, true);
                this.sidebarRenderer.setCurrentId(id);
                this.sidebarRenderer.render(this.conversationService.getAll());
            } else {
                console.error(`[DEBUG] ❌ Imposible renderizar: conversación ${id} no encontrada al final de la carga`);
            }
        } else {
            console.warn(`[DEBUG] ⚠️ La conversación actual cambió durante la carga. No se renderiza ${id}`);
        }
    }

    bindEvents() {
        const chatContainer = document.getElementById("messages-container");
        const sidebarContainer = document.querySelector(".list-conversations");
        const newConvBtn = document.getElementById("new-conversation");
        const settingsBtn = document.getElementById("btn-settings");
        const profileBtn = document.getElementById("btn-profile");

        if (newConvBtn) {
            newConvBtn.addEventListener("click", () => this.handleNewConversation());
        }

        if (chatContainer) {
            chatContainer.addEventListener("click", (e) => {
                if (e.target.closest(".btn-action")) {
                    this.handleActionClick();
                }
            });

            chatContainer.addEventListener("keydown", (e) => {
                if (e.target.id === "send-message-input" && e.key === "Enter") {
                    e.preventDefault();
                    const value = e.target.value.trim();
                    
                    if (value.startsWith("/")) {
                        this.handleCommand(value);
                    } else {
                        this.handleActionClick();
                    }
                }
            });
        }

        if (sidebarContainer) {
            sidebarContainer.addEventListener("click", (e) => this.handleSidebarClick(e));
        }

        if (settingsBtn) {
            settingsBtn.addEventListener("click", () => this.handleSettings());
        }

        if (profileBtn) {
            profileBtn.addEventListener("click", () => this.handleProfile());
        }
    }

    handleCommand(value) {
        const [command, ...args] = value.split(" ");
        this.chatRenderer.clearInput();

        switch (command) {
            case "/models":
                this.listModels();
                break;
            case "/set-model":
                this.setModel(args[0]);
                break;
            default:
                ToastNotification.error(`Comando desconocido: ${command}`);
                break;
        }
    }

    listModels() {
        const models = configService.getModelsWithKeys();
        const current = configService.getCurrent();
        
        let message = "<strong>Modelos configurados:</strong><br><ul>";
        if (models.length === 0) {
            message = "No tienes modelos configurados con API Key. Ve a Configuración.";
        } else {
            models.forEach(m => {
                const isActive = current && current.model === m.model ? " (Actual)" : "";
                message += `<li>• ${m.model}${isActive}</li>`;
            });
            message += "</ul><br><small>Usa /set-model <nombre> para cambiar</small>";
        }

        const messageElement = this.chatRenderer.addBotMessage();
        if (messageElement) {
            messageElement.innerHTML = message;
        }
    }

    setModel(modelName) {
        if (!modelName) {
            ToastNotification.error("Debes especificar un nombre de modelo");
            return;
        }

        const models = configService.getModelsWithKeys();
        const found = models.find(m => m.model === modelName);

        if (found) {
            configService.setCurrentModel(modelName);
            const messageElement = this.chatRenderer.addBotMessage();
            if (messageElement) {
                messageElement.innerHTML = `✅ Modelo cambiado a: <strong>${modelName}</strong>`;
            }
            ToastNotification.success(`Cambiado a ${modelName}`);
        } else {
            ToastNotification.error(`El modelo "${modelName}" no está configurado o no existe`);
        }
    }

    async handleNewConversation() {
        this.cancelRequest();
        
        const currentModel = configService.getCurrent();
        
        if (!currentModel || !currentModel.model || !currentModel.apiKey) {
            ToastNotification.error("Debes configurar un modelo con API Key antes de chatear");
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                const { count, max } = await storageService.getConversationCount();
                if (count >= max) {
                    ToastNotification.error(`Has alcanzado el límite de ${max} conversaciones. Archiva o elimina algunas para crear una nueva.`);
                    return;
                }
            }

            const conversation = await this.conversationService.create(
                "Nueva conversación",
                currentModel.model,
                currentModel.provider || null
            );
            
            this.conversationService.setCurrent(conversation.id);
            this.sidebarRenderer.render(this.conversationService.getAll());
            this.chatRenderer.render(conversation, false, true);
            this.sidebarRenderer.setCurrentId(conversation.id);
        } catch (error) {
            console.error("Error creando conversación:", error);
            ToastNotification.error(error.message || "No se pudo crear la conversación");
        }
    }

    async handleActionClick() {
        const action = this.chatRenderer.getAction();
        
        if (action === "stop") {
            this.cancelRequest();
            return;
        }

        await this.processMessage();
    }

    async processMessage() {
        const input = this.chatRenderer.getInput();
        if (!input) return;

        const value = input.value.trim();
        if (!value) return;

        const currentId = this.conversationService.getCurrentId();
        if (!currentId) return;

        const conversation = this.conversationService.getById(currentId);
        if (!conversation) return;

        const config = configService.getCurrent();
        if (!config || !config.model || !config.apiKey) {
            this.isWaitingForResponse = false;
            this.chatRenderer.updateSendButton("send");
            ToastNotification.error("Debes configurar el modelo y API key antes de enviar mensajes. Escribe /set-model <model> o /models");
            return;
        }

        const isFirstMessage = conversation.messages.length === 0;
        
        this.isWaitingForResponse = true;
        this.chatRenderer.updateSendButton("stop");
        
        // Agregar mensaje de usuario al estado y renderizar
        this.conversationService.addMessage(currentId, { question: value });
        this.chatRenderer.render(conversation, true, true);
        
        // Agregar placeholder de respuesta al estado y obtener elemento del DOM para streaming
        this.conversationService.addMessage(currentId, { response: "" });
        const messageElement = this.chatRenderer.addBotMessage();
        
        this.chatRenderer.clearInput();
        this.chatRenderer.setTyping();

        const requestData = {
            input: value,
            model: config.model,
            apiKey: config.apiKey,
            maxTokens: config.maxTokens || 1000,
            temperature: config.temperature !== undefined ? config.temperature : 0.7,
            systemPrompt: config.systemPrompt || ""
        };

        const request = new Request("/api/llm/q", requestData);
        this.currentRequest = request;

        console.log("📤 Enviando request:", requestData);

        try {
            // Pasamos el signal para poder cancelar la petición y el elemento para el streaming directo
            const result = await this.processStreamResponse("/api/llm/q", requestData, request.abortController.signal, messageElement);
            
            this.isWaitingForResponse = false;
            this.chatRenderer.updateSendButton("send");
            this.chatRenderer.hideTyping();

            const botResponse = result.respuesta || "No se pudo obtener respuesta";
            
            // PERSISTENCIA REAL: Guardar en Postgres/Redis a través de la API
            console.log("💾 Persistiendo mensajes en base de datos...");
            try {
                // El endpoint de sendMessage guarda tanto el mensaje del usuario como el del asistente
                await storageService.sendMessage(currentId, value, config.model, {
                    provider: config.provider || this.conversationService.getProviderFromModel(config.model),
                    apiKey: config.apiKey,
                    maxTokens: config.maxTokens,
                    temperature: config.temperature,
                    systemPrompt: config.systemPrompt,
                    // Ya enviamos el request a /llm/q para el streaming, 
                    // pero necesitamos guardar los textos finales en la DB.
                    // El backend para anónimos espera que le pasemos el assistantMessage si ya lo tenemos
                    // o lo puede generar él, pero aquí ya lo tenemos.
                    assistantMessage: botResponse 
                });
                console.log("✅ Mensajes persistidos");
            } catch (persistError) {
                console.error("❌ Error persistiendo mensajes:", persistError);
                // No detenemos el flujo si falla el guardado, pero lo avisamos en consola
            }

            // Actualizar el último mensaje local (el placeholder)
            if (currentId === this.conversationService.getCurrentId()) {
                const conv = this.conversationService.getById(currentId);
                if (conv && conv.messages.length > 0) {
                    const lastIndex = conv.messages.length - 1;
                    conv.messages[lastIndex].response = botResponse;
                }
            }

            // Si tenemos el elemento, lo actualizamos con el HTML final (markdown procesado)
            if (messageElement) {
                messageElement.innerHTML = botResponse;
            }

            console.log("📝 Verificando si generar título:", { isFirstMessage, showTitle: configService.getShowTitle() });
            if (isFirstMessage && configService.getShowTitle()) {
                console.log("🎯 Disparando generación de título...");
                await this.generateTitle(conversation, value, botResponse);
            }

            this.currentRequest = null;

        } catch (error) {
            this.isWaitingForResponse = false;
            this.chatRenderer.updateSendButton("send");
            this.chatRenderer.hideTyping();
            
            if (!error.message.includes('cancelled')) {
                console.error("Error:", error);
            }
            
            this.currentRequest = null;
        }
    }

async processStreamResponse(url, data, signal, targetElement = null) {
        console.log("🚀 Iniciando processStreamResponse para:", url);
        return new Promise((resolve, reject) => {
            let fullResponse = "";
            const streamSpeed = configService.getStreamSpeed();
            let buffer = ""; 
            
            const writeNextChunk = (element, htmlChunk, delay) => {
                return new Promise((res) => {
                    let currentHtml = element.innerHTML;
                    let index = 0;
                    const write = () => {
                        if (index < htmlChunk.length) {
                            currentHtml += htmlChunk.charAt(index);
                            element.innerHTML = currentHtml;
                            const container = element.parentElement;
                            if (container && container.classList.contains("messages-display")) {
                                container.scrollTop = container.scrollHeight;
                            }
                            index++;
                            setTimeout(write, delay);
                        } else {
                            res();
                        }
                    };
                    write();
                });
            };
            
            let isResolved = false;
            
            const handleStream = async () => {
                try {
                    console.log("📡 Realizando fetch...");
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data),
                        signal: signal
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error("❌ Error en respuesta HTTP:", response.status, errorData);
                        if (!isResolved) {
                            isResolved = true;
                            reject(new Error(errorData.error || `HTTP ${response.status}`));
                        }
                        return;
                    }

                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();

                    if (!reader) {
                        throw new Error("No se pudo obtener el reader del stream");
                    }

                    console.log("📖 Lector de stream preparado");

                    const processLine = async (line) => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || !trimmedLine.startsWith('data: ')) return;
                        
                        try {
                            const jsonStr = trimmedLine.slice(6);
                            const data = JSON.parse(jsonStr);
                            
                            if (data.error) {
                                console.error("❌ Error devuelto por la API:", data.error);
                                if (!isResolved) {
                                    isResolved = true;
                                    reject(new Error(data.error));
                                }
                                return;
                            }
                            
                            if (data.chunk) {
                                fullResponse += data.chunk;
                                
                                if (targetElement !== false) {
                                    let el = targetElement;
                                    if (!el) {
                                        const msgDisplay = this.chatRenderer.getMessagesDisplay();
                                        el = msgDisplay?.querySelector('.ai-message:last-child');
                                    }

                                    if (el) {
                                        await writeNextChunk(el, data.chunk, streamSpeed);
                                    }
                                }
                            }
                            
                            if (data.done) {
                                console.log("✅ Stream finalizado (data.done)");
                                if (!isResolved) {
                                    isResolved = true;
                                    resolve({
                                        respuesta: data.respuesta || fullResponse,
                                        modelo: data.modelo,
                                        tokens: data.tokens
                                    });
                                }
                            }
                        } catch (e) {
                            console.warn("⚠️ Error parseando línea:", trimmedLine, e);
                        }
                    };

                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) {
                            console.log("📥 Reader finalizado (done: true)");
                            if (buffer) await processLine(buffer);
                            break;
                        }
                        
                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;
                        
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            await processLine(line);
                        }
                    }

                    if (!isResolved) {
                        isResolved = true;
                        resolve({ respuesta: fullResponse });
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log("🛑 Stream abortado por el usuario");
                    } else {
                        console.error("💥 Error en handleStream:", error);
                        if (!isResolved) {
                            isResolved = true;
                            reject(error);
                        }
                    }
                }
            };

            handleStream();
        });
    }

    stripHTML(html) {
        if (!html) return "";
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    cleanTitle(text) {
        if (!text) return "Nueva conversación";
        
        let cleaned = this.stripHTML(text);
        
        // Limpiar markdown común que la IA pueda devolver en el título
        cleaned = cleaned.trim()
            .replace(/^["']|["']$/g, '') // Quitar comillas al inicio/final
            .replace(/^\d+\.\s*/, '')     // Quitar numeración tipo "1. "
            .replace(/[#*`_~]/g, '')     // Quitar caracteres de markdown
            .replace(/\s+/g, ' ')         // Unificar espacios
            .substring(0, 80);           // Limitar longitud
            
        return cleaned || "Nueva conversación";
    }

    async generateTitle(conversation, userQuestion, botResponse) {
        console.log("🎬 Iniciando generateTitle para:", conversation.id);
        try {
            const config = configService.getCurrent();
            if (!config || !config.model || !config.apiKey) {
                console.warn("⚠️ No hay configuración para generar título");
                return;
            }

            const chatTitle = this.chatRenderer.container.querySelector(".chat-title");
            if (chatTitle) {
                chatTitle.textContent = "Generando título...";
            }

            const prompt = `Analiza este intercambio y crea un título descriptivo pero muy breve (máximo 5 palabras). 
            Pregunta: "${userQuestion.substring(0, 100)}"
            Respuesta: "${botResponse.substring(0, 100)}"
            Responde ÚNICAMENTE con el título, sin comillas ni puntos finales.`;

            const requestData = {
                input: prompt,
                model: config.model,
                apiKey: config.apiKey,
                maxTokens: 30,
                temperature: 0.3, // Menos creatividad para el título
                systemPrompt: "Eres un experto en resumir temas de conversación de forma concisa. Responde solo el título."
            };

            console.log("📡 Solicitando título a la API...");
            // Usamos targetElement = false para desactivar el typewriter en el chat
            const result = await this.processStreamResponse("/api/llm/q", requestData, null, false);
            
            let rawTitle = result.respuesta || "";
            console.log("📥 Título recibido (bruto):", rawTitle);
            
            const title = this.cleanTitle(rawTitle);
            console.log("🏆 Título final procesado:", title);

            await this.conversationService.updateTitle(conversation.id, title);
            this.sidebarRenderer.setCurrentId(conversation.id);
            this.sidebarRenderer.render(this.conversationService.getAll());
            
            if (this.conversationService.getCurrentId() === conversation.id) {
                this.chatRenderer.updateTitle(title);
            }

        } catch (error) {
            console.error("❌ Error al generar título:", error);
        }
    }

    cancelRequest() {
        if (this.currentRequest) {
            this.currentRequest.cancel();
            this.currentRequest = null;
        }

        this.isWaitingForResponse = false;
        this.chatRenderer.updateSendButton("send");
        this.chatRenderer.hideTyping();
    }

    handleSidebarClick(e) {
        const btnDelete = e.target.closest('.btn-delete-conversation');
        if (btnDelete) {
            e.stopPropagation();
            const id = btnDelete.dataset.id;
            this.showDeleteModal(id);
            return;
        }

        const chatItem = e.target.closest('li');
        if (chatItem && !e.target.closest('.btn-delete-conversation')) {
            this.selectConversation(chatItem);
        }
    }

    selectConversation(li) {
        this.cancelRequest();

        const titleEl = li.querySelector('.item-title');
        const id = titleEl.dataset.conversationId;
        
        this.conversationService.setCurrent(id);
        
        this.loadConversationMessages(id);
    }

    async loadConversationMessages(id) {
        const token = localStorage.getItem('authToken');
        let messages = [];
        
        try {
            if (token) {
                const apiMessages = await storageService.getMessages(id);
                messages = apiMessages.map(msg => ({
                    question: msg.role === 'user' ? msg.content : null,
                    response: msg.role === 'ai' || msg.role === 'assistant' ? msg.content : null
                }));
                const conv = this.conversationService.getById(id);
                if (conv) {
                    conv.messages = messages;
                }
            } else {
                const anonSessionId = localStorage.getItem('anonSessionId');
                if (anonSessionId) {
                    const anonMessages = await storageService._fetch(`/anon/conversations/${anonSessionId}/${id}/messages`);
                    messages = anonMessages;
                }
                const conv = this.conversationService.getById(id);
                if (conv) {
                    conv.messages = messages;
                }
                messages = conv?.messages || [];
            }
        } catch (error) {
            console.error("Error cargando mensajes:", error);
            const conv = this.conversationService.getById(id);
            messages = conv?.messages || [];
        }
        
        const conversation = this.conversationService.getById(this.conversationService.getCurrentId());
        if (conversation) {
            this.chatRenderer.render(conversation, false, true);
            this.sidebarRenderer.setCurrentId(conversation.id);
            this.sidebarRenderer.render(this.conversationService.getAll());
        }
    }

    showDeleteModal(id) {
        const currentId = this.conversationService.getCurrentId();
        const isCurrent = currentId && String(currentId) === String(id);
        
        if (isCurrent) {
            this.cancelRequest();
        }

        const modal = document.createElement("delete-modal");
        document.body.appendChild(modal);
        
        modal.addEventListener("confirm-delete", () => {
            this.conversationService.delete(id);
            this.sidebarRenderer.render(this.conversationService.getAll());
            
            if (isCurrent) {
                this.chatRenderer.clear();
                this.conversationService.setCurrent(null);
            }
        });
    }

    handleSettings() {
        const modalConfig = document.createElement("config-modal");
        document.body.appendChild(modalConfig);
    }

    handleProfile() {
        const modalUser = document.createElement("user-modal");
        document.body.appendChild(modalUser);
    }

    stripHTML(html) {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const app = new ChatApp();
    await app.init();
    window.chatApp = app;
});