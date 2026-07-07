import { MessageController } from "./controllers/MessageController.js";
import { SidebarController } from "./controllers/SidebarController.js";
import { CommandController } from "./controllers/CommandController.js";
import { UIController } from "./controllers/UIController.js";
import { DeleteConversation } from "./components/DeleteConversation.js";
import { UserModal } from "./components/UserModal.js";
import { ConfigChatModal } from "./components/ConfigChatModal.js";
import { SettingsModal } from "./components/SettingsModal.js";
import { ConversationService } from "./services/ConversationService.js";
import { SidebarRenderer } from "./services/SidebarRenderer.js";
import { ChatRenderer } from "./services/ChatRenderer.js";
import { configService } from "./services/ConfigService.js";
import { storageService } from "./services/StorageService.js";
import { ToastNotification } from "./components/ToastNotification.js";

class ChatApp {
    constructor() {
        this.conversationService = new ConversationService();
        this.sidebarRenderer = null;
        this.chatRenderer = null;
        this.currentStream = null;
        this.currentRequest = null;
        this.isWaitingForResponse = false;
        this.isAuthenticated = false;

        this.messageController = new MessageController(this);
        this.sidebarController = new SidebarController(this);
        this.commandController = new CommandController(this);
        this.uiController = new UIController(this);
    }

    playNotificationSound() {
        this.uiController.playNotificationSound();
    }

    applyTheme(theme) {
        this.uiController.applyTheme(theme);
    }

    updateUserUI(user) {
        this.uiController.updateUserUI(user);
    }

    loadInitialData() {}

    async init() {
        const sidebarContainer = document.querySelector(".list-conversations");
        const chatContainer = document.getElementById("messages-container");

        if (!sidebarContainer || !chatContainer) {
            console.error("Contenedores no encontrados");
            return;
        }

        this.sidebarRenderer = new SidebarRenderer(sidebarContainer, null);
        this.chatRenderer = new ChatRenderer(chatContainer);

        await this.initializeFromAPI();

        this.sidebarRenderer.render(this.conversationService.getAll());

        const currentId = this.conversationService.getCurrentId();
        if (currentId) {
            const conv = this.conversationService.getById(currentId);
            if (conv) {
                this.chatRenderer.render(conv, false, true);
                this.chatRenderer.showSkeleton();
                await this.loadConversationMessages(currentId);
                this.chatRenderer.hideSkeleton();
            } else {
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
            try {
                const [user, config, conversations] = await Promise.all([
                    storageService.getUser(),
                    storageService.getConfig(),
                    storageService.getConversations()
                ]);

                if (user) {
                    localStorage.setItem('user:cache', JSON.stringify(user));
                    this.updateUserUI(user);
                }

                if (config) {
                    localStorage.setItem('config:cache', JSON.stringify(config));
                    configService.updateGlobal({
                        theme: config.theme || 'system',
                        streamSpeed: config.streamSpeed || 8,
                        showTitle: config.showTitle !== false,
                        notificationSound: config.notificationSound !== false
                    });
                    this.applyTheme(config.theme || 'system');
                }

                if (conversations) {
                    this.conversationService.setAll(conversations);
                    const storedConvId = localStorage.getItem('currentConvId');
                    if (storedConvId && !this.conversationService.getById(storedConvId)) {
                        localStorage.removeItem('currentConvId');
                    }
                }
            } catch (error) {
                console.error("Error cargando datos de usuario:", error);
            }
        } else {
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
                        const storedConvId = localStorage.getItem('currentConvId');
                        if (storedConvId && !this.conversationService.getById(storedConvId)) {
                            localStorage.removeItem('currentConvId');
                        }
                    }
                } catch (error) {
                    console.error("Error cargando desde Redis:", error);
                }
            }
        }
    }

    async loadConversationMessages(id) {
        const token = localStorage.getItem('authToken');
        let messages = [];

        try {
            const apiMessages = await storageService.getMessages(id);
            messages = apiMessages.map(msg => ({
                question: msg.role === 'user' ? msg.content : null,
                response: msg.role === 'assistant' || msg.role === 'ai' ? msg.content : null
            }));

            const conv = this.conversationService.getById(id);
            if (conv) {
                conv.messages = messages;
            }
        } catch (error) {
            const conv = this.conversationService.getById(id);
            messages = conv?.messages || [];
        }

        const currentId = this.conversationService.getCurrentId();
        if (String(currentId) === String(id)) {
            const conversationToRender = this.conversationService.getById(id);
            if (conversationToRender) {
                this.chatRenderer.render(conversationToRender, false, true);
                this.sidebarRenderer.setCurrentId(id);
                this.sidebarRenderer.render(this.conversationService.getAll());
            }
        }
    }

    bindEvents() {
        const chatContainer = document.getElementById("messages-container");
        const sidebarContainer = document.querySelector(".list-conversations");
        const newConvBtn = document.getElementById("new-conversation");
        const themeToggle = document.getElementById("btn-theme-toggle");
        const settingsBtn = document.getElementById("btn-settings");
        const profileBtn = document.getElementById("btn-profile");
        const searchInput = document.getElementById("search-conversations");

        if (newConvBtn) {
            newConvBtn.addEventListener("click", () => this.sidebarController.handleNewConversation());
        }

        if (themeToggle) {
            themeToggle.addEventListener("click", () => this.uiController.toggleTheme());
        }

        if (chatContainer) {
            chatContainer.addEventListener("click", (e) => {
                if (e.target.closest(".btn-action")) {
                    this.messageController.handleActionClick();
                }
            });

            chatContainer.addEventListener("keydown", (e) => {
                if (e.target.id === "send-message-input" && e.key === "Enter") {
                    e.preventDefault();
                    const value = e.target.value.trim();
                    if (value.startsWith("/")) {
                        this.commandController.handleCommand(value);
                    } else {
                        this.messageController.handleActionClick();
                    }
                }
            });
        }

        if (sidebarContainer) {
            sidebarContainer.addEventListener("click", (e) => this.sidebarController.handleSidebarClick(e));
        }

        if (settingsBtn) {
            settingsBtn.addEventListener("click", () => this.uiController.handleSettings());
        }

        if (profileBtn) {
            profileBtn.addEventListener("click", () => this.uiController.handleProfile());
        }

        document.addEventListener("export-conversation", (e) => this.uiController.handleExport(e.detail.conversation));

        if (searchInput) {
            searchInput.addEventListener("input", (e) => this.sidebarController.handleSearch(e.target.value));
        }

        document.addEventListener("conversations-archived", (e) => {
            const { ids } = e.detail;
            ids.forEach(id => {
                this.conversationService.conversations = this.conversationService.conversations.filter(c => String(c.id) !== String(id));
            });
            this.sidebarRenderer.render(this.conversationService.getAll());
        });

        document.addEventListener("conversations-deleted", (e) => {
            const { ids } = e.detail;
            ids.forEach(id => {
                this.conversationService.conversations = this.conversationService.conversations.filter(c => String(c.id) !== String(id));
            });
            this.sidebarRenderer.render(this.conversationService.getAll());
            const currentId = this.conversationService.getCurrentId();
            if (currentId && ids.includes(String(currentId))) {
                this.conversationService.setCurrent(null);
                this.chatRenderer.clear();
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const app = new ChatApp();
    await app.init();
});
