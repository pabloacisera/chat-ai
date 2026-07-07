import { ToastNotification } from "../components/ToastNotification.js";
import { configService } from "../services/ConfigService.js";
import { storageService } from "../services/StorageService.js";

export class SidebarController {
    constructor(app) {
        this.app = app;
    }

    async handleNewConversation() {
        this.app.messageController.cancelRequest();

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
            } else {
                let anonId = localStorage.getItem('anonSessionId');
                if (!anonId || anonId === 'null') {
                    anonId = await storageService.createAnonSession();
                }
            }

            const conversation = await this.app.conversationService.create(
                "Nueva conversación",
                currentModel.model,
                currentModel.provider || null
            );

            this.app.conversationService.setCurrent(conversation.id);
            this.app.sidebarRenderer.render(this.app.conversationService.getAll());
            this.app.chatRenderer.render(conversation, false, true);
            this.app.sidebarRenderer.setCurrentId(conversation.id);

            if (window.innerWidth <= 768) {
                const aside = document.querySelector('.conversations');
                const backdrop = document.getElementById('sidebar-backdrop');
                if (aside && backdrop) {
                    aside.classList.remove('open');
                    backdrop.classList.remove('open');
                    document.body.style.overflow = '';
                }
            }
        } catch (error) {
            console.error("Error creando conversación:", error);
            ToastNotification.error(error.message || "No se pudo crear la conversación");
        }
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
        this.app.messageController.cancelRequest();

        const titleEl = li.querySelector('.item-title');
        const id = titleEl.dataset.conversationId;

        this.app.conversationService.setCurrent(id);
        this.app.loadConversationMessages(id);

        if (window.innerWidth <= 768) {
            const aside = document.querySelector('.conversations');
            const backdrop = document.getElementById('sidebar-backdrop');
            if (aside && backdrop) {
                aside.classList.remove('open');
                backdrop.classList.remove('open');
                document.body.style.overflow = '';
            }
        }
    }

    showDeleteModal(id) {
        const currentId = this.app.conversationService.getCurrentId();
        const isCurrent = currentId && String(currentId) === String(id);

        if (isCurrent) {
            this.app.messageController.cancelRequest();
        }

        const modal = document.createElement("delete-modal");
        document.body.appendChild(modal);

        modal.addEventListener("confirm-delete", async () => {
            try {
                await this.app.conversationService.delete(id);
                this.app.sidebarRenderer.render(this.app.conversationService.getAll());

                if (isCurrent) {
                    this.app.chatRenderer.clear();
                    this.app.conversationService.setCurrent(null);
                    localStorage.removeItem('currentConvId');
                }

                ToastNotification.success("Conversación eliminada");
            } catch (error) {
                console.error("Error al borrar:", error);
                ToastNotification.error("No se pudo eliminar la conversación");
            }
        });
    }

    handleSearch(query) {
        const all = this.app.conversationService.getAll();
        if (!query.trim()) {
            this.app.sidebarRenderer.render(all);
            return;
        }
        const q = query.toLowerCase();
        const filtered = all.filter(c =>
            (c.title && c.title.toLowerCase().includes(q)) ||
            (c.modelId && c.modelId.toLowerCase().includes(q))
        );
        this.app.sidebarRenderer.render(filtered);
    }
}
