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

class ChatApp {
    constructor() {
        this.conversationService = new ConversationService();
        this.sidebarRenderer = null;
        this.chatRenderer = null;
        
        this.currentStream = null;
        this.currentRequest = null;
        this.isWaitingForResponse = false;
    }

    init() {
        console.log("🚀 Inicializando App...");
        
        const sidebarContainer = document.querySelector(".list-conversations");
        const chatContainer = document.getElementById("messages-container");
        
        if (!sidebarContainer || !chatContainer) {
            console.error("Contenedores no encontrados");
            return;
        }

        this.sidebarRenderer = new SidebarRenderer(sidebarContainer);
        this.chatRenderer = new ChatRenderer(chatContainer);

        this.loadInitialData();
        this.bindEvents();
    }

    loadInitialData() {
        const conversations = this.conversationService.load();
        this.sidebarRenderer.render(conversations);
        
        const currentId = this.conversationService.getCurrentId();
        if (currentId) {
            const conv = this.conversationService.getById(currentId);
            if (conv) {
                this.chatRenderer.render(conv);
                this.sidebarRenderer.setCurrentId(currentId);
            }
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

    handleNewConversation() {
        this.cancelRequest();

        const conversation = this.conversationService.create(
            "Nueva conversación",
            formatDateFriendly(new Date().toString())
        );

        this.conversationService.setCurrent(conversation.id);
        this.sidebarRenderer.render(this.conversationService.getAll());
        this.chatRenderer.render(conversation);
        this.sidebarRenderer.setCurrentId(conversation.id);
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
        this.chatRenderer.render(conversation, true);
        
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
            
            // Actualizar el último mensaje (que es el placeholder) con la respuesta final procesada
            if (currentId === this.conversationService.getCurrentId()) {
                const conv = this.conversationService.getById(currentId);
                if (conv && conv.messages.length > 0) {
                    const lastIndex = conv.messages.length - 1;
                    conv.messages[lastIndex].response = botResponse;
                    this.conversationService.save();
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
            
            const writeNextChar = (element, text, delay) => {
                return new Promise((res) => {
                    let index = 0;
                    const write = () => {
                        if (index < text.length) {
                            element.textContent += text.charAt(index);
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
                        reject(new Error(errorData.error || `HTTP ${response.status}`));
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
                                reject(new Error(data.error));
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
                                        await writeNextChar(el, data.chunk, streamSpeed);
                                    }
                                }
                            }
                            
                            if (data.done) {
                                console.log("✅ Stream finalizado (data.done)");
                                resolve({
                                    respuesta: data.respuesta || fullResponse,
                                    modelo: data.modelo,
                                    tokens: data.tokens
                                });
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

                    resolve({ respuesta: fullResponse });
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log("🛑 Stream abortado por el usuario");
                    } else {
                        console.error("💥 Error en handleStream:", error);
                        reject(error);
                    }
                }
            };

            handleStream();
        });
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

            const prompt = `Genera un título corto para esta conversación de entre 5 y 10 palabras. 
Basado en la pregunta del usuario: "${userQuestion}" y la respuesta del bot: "${botResponse.substring(0, 200)}..."
Responde SOLO con el título, sin comillas, sin números, sin texto adicional.`;

            const requestData = {
                input: prompt,
                model: config.model,
                apiKey: config.apiKey,
                maxTokens: 50,
                temperature: 0.5,
                systemPrompt: config.systemPrompt || ""
            };

            console.log("📡 Solicitando título a la API...");
            // Usamos targetElement = false para desactivar el typewriter en el chat
            const result = await this.processStreamResponse("/api/llm/q", requestData, null, false);
            
            let title = result.respuesta || "";
            console.log("📥 Título recibido (bruto):", title);
            
            title = this.stripHTML(title);
            title = title.trim()
                .replace(/^["']|["']$/g, '')
                .replace(/^\d+\.\s*/, '')
                .replace(/\n/g, ' ')
                .substring(0, 100) || "Conversación";

            console.log("🏆 Título final procesado:", title);

            this.conversationService.updateTitle(conversation.id, title);
            this.conversationService.save();
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
            this.showDeleteModal(parseInt(btnDelete.dataset.id));
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
        const id = parseInt(titleEl.dataset.conversationId);
        
        this.conversationService.setCurrent(id);
        
        const conversation = this.conversationService.getById(id);
        if (conversation) {
            this.chatRenderer.render(conversation);
            this.sidebarRenderer.setCurrentId(id);
            this.sidebarRenderer.render(this.conversationService.getAll());
        }
    }

    showDeleteModal(id) {
        if (this.conversationService.getCurrentId() === id) {
            this.cancelRequest();
        }

        const modal = document.createElement("delete-modal");
        document.body.appendChild(modal);
        
        modal.addEventListener("confirm-delete", () => {
            this.conversationService.delete(id);
            this.sidebarRenderer.render(this.conversationService.getAll());
            
            if (this.conversationService.getCurrentId() === id) {
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

document.addEventListener("DOMContentLoaded", () => {
    const app = new ChatApp();
    app.init();
});