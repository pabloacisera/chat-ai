import { StreamEffect } from "./helpers/streamData.js";
import { DeleteConversation } from "./components/DeleteConversation.js";
import { Request } from "./helpers/Request.js";
import { ConversationService } from "./services/ConversationService.js";
import { SidebarRenderer } from "./services/SidebarRenderer.js";
import { ChatRenderer } from "./services/ChatRenderer.js";
import { formatDateFriendly, generateId } from "./utils/date.js";

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
                    this.handleActionClick();
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

    handleNewConversation() {
        if (this.currentStream) {
            this.currentStream.cancel();
            this.currentStream = null;
        }

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

        const isFirstMessage = conversation.messages.length === 0;
        
        this.isWaitingForResponse = true;
        this.chatRenderer.updateSendButton("stop");
        this.conversationService.addMessage(currentId, { question: value });
        this.chatRenderer.clearInput();
        
        this.chatRenderer.render(conversation, true);
        this.chatRenderer.setTyping();

        const request = new Request("/api/llm/q", { input: value });
        this.currentRequest = request;

        try {
            const result = await request.petition();
            this.isWaitingForResponse = false;
            this.chatRenderer.updateSendButton("send");

            const botResponse = this.extractResponse(result);
            this.conversationService.addMessage(currentId, { response: "" });

            const messageElement = this.chatRenderer.addBotMessage();
            
            if (messageElement && currentId === this.conversationService.getCurrentId()) {
                const stream = new StreamEffect({ speed: 8 });
                this.currentStream = stream;
                
                await stream.write(botResponse, messageElement, {
                    scrollContainer: this.chatRenderer.getMessagesDisplay()
                });

                const conv = this.conversationService.getById(currentId);
                if (conv && conv.messages.length > 0) {
                    const lastIndex = conv.messages.length - 1;
                    if (conv.messages[lastIndex].response === "") {
                        conv.messages[lastIndex].response = botResponse;
                        this.conversationService.save();
                    }
                }
            }

            if (isFirstMessage) {
                await this.generateTitle(conversation, value, botResponse);
            }

            this.currentRequest = null;

        } catch (error) {
            this.isWaitingForResponse = false;
            this.chatRenderer.updateSendButton("send");
            
            if (!error.message.includes('cancelled')) {
                console.error("Error:", error);
            }
            
            this.currentRequest = null;
        }
    }

    extractResponse(result) {
        if (result.response && Array.isArray(result.response) && result.response[0]) {
            const resp = result.response[0];
            if (resp.respuesta) return this.stripHTML(resp.respuesta);
            if (resp.text) return this.stripHTML(resp.text);
            if (typeof resp === 'string') return this.stripHTML(resp);
        }
        if (result.response && typeof result.response === 'string') {
            return this.stripHTML(result.response);
        }
        if (result.response?.respuesta) {
            return this.stripHTML(result.response.respuesta);
        }
        if (result.respuesta) return this.stripHTML(result.respuesta);
        if (result.text) return this.stripHTML(result.text);
        if (result.candidates?.[0]) {
            return result.candidates[0].content.parts[0].text;
        }
        return "No se pudo obtener una respuesta";
    }

    stripHTML(html) {
        if (!html) return '';
        if (typeof html !== 'string') return String(html);
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    async generateTitle(conversation, userQuestion, botResponse) {
        try {
            const chatTitle = this.chatRenderer.container.querySelector(".chat-title");
            if (chatTitle) {
                chatTitle.textContent = "Generando título...";
            }

            const prompt = `Genera un título corto para esta conversación de máximo 8 palabras. 
Basado en la pregunta del usuario: "${userQuestion}"
Responde SOLO con el título, sin comillas, sin números, sin texto adicional.`;

            const result = await new Request("/api/llm/q", { input: prompt }).petition();
            
            let title = "";
            
            if (result.response?.[0]?.respuesta) {
                title = this.stripHTML(result.response[0].respuesta);
            } else if (result.response?.respuesta) {
                title = this.stripHTML(result.response.respuesta);
            } else if (result.respuesta) {
                title = this.stripHTML(result.respuesta);
            } else if (result.text) {
                title = this.stripHTML(result.text);
            } else {
                title = userQuestion.substring(0, 40) + (userQuestion.length > 40 ? "..." : "");
            }

            title = title.trim()
                .replace(/^["']|["']$/g, '')
                .replace(/^\d+\.\s*/, '')
                .replace(/\n/g, ' ')
                .substring(0, 50) || "Conversación";

            this.conversationService.updateTitle(conversation.id, title);
            this.conversationService.save();
            this.sidebarRenderer.render(this.conversationService.getAll());
            
            if (this.conversationService.getCurrentId() === conversation.id) {
                this.chatRenderer.updateTitle(title);
            }

        } catch (error) {
            console.error("Error al generar título:", error);
        }
    }

    cancelRequest() {
        if (this.currentRequest) {
            this.currentRequest.cancel();
            this.currentRequest = null;
        }
        
        if (this.currentStream) {
            this.currentStream.cancel();
            this.currentStream = null;
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
        if (this.currentStream) {
            this.currentStream.cancel();
            this.currentStream = null;
        }

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
        if (this.conversationService.getCurrentId() === id && this.currentStream) {
            this.currentStream.cancel();
            this.currentStream = null;
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
        console.log("Abrir configuración");
    }

    handleProfile() {
        console.log("Abrir perfil");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const app = new ChatApp();
    app.init();
});