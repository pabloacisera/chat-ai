export class ChatRenderer {
    constructor(container) {
        this.container = container;
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = "";
        }
    }

    render(conversation, preserveScroll = false, hasActiveConversation = false) {
        if (!this.container) return;
        this.clear();

        if (!hasActiveConversation) {
            const emptyChat = document.createElement("div");
            emptyChat.classList.add("empty-chat");
            emptyChat.innerHTML = `
                <div class="empty-state">
                    <h2>Selecciona una conversación</h2>
                    <p>O crea una nueva para comenzar</p>
                </div>
            `;
            this.container.appendChild(emptyChat);
            return;
        }

        const chatWindow = document.createElement("div");
        chatWindow.classList.add("chat-window");
        chatWindow.style.display = "flex";
        chatWindow.style.flexDirection = "column";
        chatWindow.style.height = "100%";

        const headerChat = document.createElement("div");
        headerChat.classList.add("chat-header");
        const titleChat = document.createElement("p");
        titleChat.classList.add("chat-title");
        titleChat.textContent = (conversation?.title || "Nueva conversación").replace(/<[^>]+>/g, '');
        const exportBtn = document.createElement("button");
        exportBtn.classList.add("btn-export");
        exportBtn.title = "Exportar conversación";
        exportBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>`;
        exportBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const event = new CustomEvent("export-conversation", {
                detail: { conversation },
                bubbles: true
            });
            exportBtn.dispatchEvent(event);
        });
        headerChat.appendChild(titleChat);
        headerChat.appendChild(exportBtn);

        const messagesDisplay = document.createElement("div");
        messagesDisplay.classList.add("messages-display");

        const messages = conversation?.messages || [];

        if (messages.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.classList.add("empty-state");
            emptyState.innerHTML = `
                <h2>¡Hola! Soy tu asistente IA</h2>
                <p>¿En qué puedo ayudarte hoy?</p>
                <div class="suggestion-chips">
                    <button class="chip" data-prompt="Explícame qué puedes hacer">¿Qué puedes hacer?</button>
                    <button class="chip" data-prompt="Escribe un poema corto">Escribe un poema</button>
                    <button class="chip" data-prompt="Ayúdame con JavaScript">Ayúdame con código</button>
                    <button class="chip" data-prompt="Dame ideas creativas para un proyecto">Ideas creativas</button>
                </div>
            `;
            emptyState.querySelectorAll('.chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const input = document.getElementById("send-message-input");
                    if (input) {
                        input.value = chip.dataset.prompt;
                        input.focus();
                    }
                });
            });
            messagesDisplay.appendChild(emptyState);
        } else {
            messages.forEach((msj) => {
                const isUser = msj.role === 'user' || !!msj.question;
                const isBot = msj.role === 'assistant' || msj.role === 'ai' || !!msj.response || !!msj.text;
                const text = msj.content || msj.question || msj.response || msj.text;

                if (isUser && text) {
                    const divUser = document.createElement("div");
                    divUser.classList.add("text-msj", "user-message");
                    divUser.textContent = text;
                    messagesDisplay.appendChild(divUser);
                }

                if (isBot && text) {
                    const divBot = document.createElement("div");
                    divBot.classList.add("text-msj", "ai-message");

                    const content = document.createElement("div");
                    content.classList.add("message-content");
                    if (text.includes('<') || text.includes('\n')) {
                        content.innerHTML = text.replace(/\n/g, '<br>');
                    } else {
                        content.innerHTML = text;
                    }
                    divBot.appendChild(content);

                    divBot.appendChild(this.createMessageFooter(conversation?.modelId));

                    messagesDisplay.appendChild(divBot);
                }
            });
        }

        const sendSection = this.renderSendSection();

        chatWindow.appendChild(headerChat);
        chatWindow.appendChild(messagesDisplay);
        chatWindow.appendChild(sendSection);

        this.container.appendChild(chatWindow);

        if (!preserveScroll) {
            setTimeout(() => {
                const display = this.container.querySelector(".messages-display");
                if (display) display.scrollTop = display.scrollHeight;
            }, 50);
        }
    }

    createMessageFooter(modelId) {
        const footer = document.createElement("div");
        footer.classList.add("message-footer");

        if (modelId) {
            const badge = document.createElement("span");
            badge.classList.add("model-badge");
            badge.textContent = modelId;
            footer.appendChild(badge);
        }

        const copyBtn = document.createElement("button");
        copyBtn.classList.add("btn-copy");
        copyBtn.title = "Copiar mensaje";
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;

        copyBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const msgEl = copyBtn.closest('.text-msj');
            const contentEl = msgEl?.querySelector('.message-content');
            const text = contentEl?.textContent || contentEl?.innerText || "";
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                copyBtn.classList.add("copied");
                copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
                setTimeout(() => {
                    copyBtn.classList.remove("copied");
                    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
                }, 2000);
            } catch {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
                copyBtn.classList.add("copied");
                setTimeout(() => copyBtn.classList.remove("copied"), 2000);
            }
        });

        footer.appendChild(copyBtn);
        return footer;
    }

    showSkeleton() {
        const display = this.getMessagesDisplay();
        if (!display || display.querySelector(".skeleton")) return;
        const skeleton = document.createElement("div");
        skeleton.classList.add("skeleton");
        skeleton.innerHTML = `
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
        `;
        display.appendChild(skeleton);
        display.scrollTop = display.scrollHeight;
    }

    hideSkeleton() {
        const skeleton = this.container?.querySelector(".skeleton");
        if (skeleton) skeleton.remove();
    }

    renderSendSection() {
        const section = document.createElement("section");
        section.classList.add("send-section");
        section.innerHTML = `
            <input id="send-message-input" placeholder="Escribe tu mensaje..." autocomplete="off" autocorrect="off" spellcheck="false">
            <button id="btn-send" class="btn-send btn-action" data-action="send" title="Enviar mensaje">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                    <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/>
                </svg>
            </button>
        `;
        return section;
    }

    getMessagesDisplay() {
        return this.container?.querySelector(".messages-display");
    }

    setTyping() {
        const display = this.getMessagesDisplay();
        if (!display || display.querySelector(".spinner")) return;
        const spinner = document.createElement("div");
        spinner.classList.add("spinner");
        spinner.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
        display.appendChild(spinner);
        display.scrollTop = display.scrollHeight;
    }

    hideTyping() {
        const spinner = this.container?.querySelector(".spinner");
        if (spinner) spinner.remove();
    }

    addUserMessage(text) {
        const display = this.getMessagesDisplay();
        if (!display) return;
        const div = document.createElement("div");
        div.classList.add("text-msj", "user-message");
        div.textContent = text;
        display.appendChild(div);
        display.scrollTop = display.scrollHeight;
    }

    addBotMessage(modelId = null) {
        const display = this.getMessagesDisplay();
        if (!display) return null;

        const div = document.createElement("div");
        div.classList.add("text-msj", "ai-message");

        const content = document.createElement("div");
        content.classList.add("message-content");
        div.appendChild(content);

        div.appendChild(this.createMessageFooter(modelId));

        display.appendChild(div);
        display.scrollTop = display.scrollHeight;
        return content;
    }

    updateTitle(title) {
        const titleEl = this.container?.querySelector(".chat-title");
        if (titleEl) titleEl.textContent = title;
    }

    updateSendButton(action) {
        const btn = this.container?.querySelector(".btn-action");
        if (!btn) return;
        if (action === "stop") {
            btn.className = "btn-stop btn-action";
            btn.setAttribute("data-action", "stop");
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M320-320h320v320H320Zm0-400h320v320H320ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>';
        } else {
            btn.className = "btn-send btn-action";
            btn.setAttribute("data-action", "send");
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/></svg>';
        }
    }

    getAction() {
        return this.container?.querySelector(".btn-action")?.getAttribute("data-action");
    }

    getInput() {
        return document.getElementById("send-message-input");
    }

    clearInput() {
        const input = this.getInput();
        if (input) input.value = "";
    }
}
