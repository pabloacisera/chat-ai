export class ChatRenderer {
    constructor(container) {
        this.container = container;
        console.log("[DEBUG] ChatRenderer instanciado");
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = "";
        }
    }

    render(conversation, preserveScroll = false) {
        console.log(`[DEBUG] 🖼️ Renderizando conversación:`, conversation?.id);
        
        if (!this.container) return;
        this.clear();

        if (!conversation) return;

        const chatWindow = document.createElement("div");
        chatWindow.classList.add("chat-window");
        chatWindow.style.display = "flex";
        chatWindow.style.flexDirection = "column";
        chatWindow.style.height = "100%";

        // 1. Título
        const titleChat = document.createElement("p");
        titleChat.classList.add("chat-title");
        titleChat.textContent = (conversation.title || "Nueva conversación").replace(/<[^>]+>/g, '');

        // 2. Pantalla de mensajes
        const messagesDisplay = document.createElement("div");
        messagesDisplay.classList.add("messages-display");

        const messages = conversation.messages || [];

        if (messages.length === 0) {
            messagesDisplay.innerHTML = `
                <div class="empty-state">
                    <h2>¡Hola! Soy tu asistente IA</h2>
                    <p>¿En qué puedo ayudarte hoy?</p>
                </div>
            `;
        } else {
            messages.forEach((msj) => {
                // SOPORTE POLIMÓRFICO PARA PROPIEDADES (role/content o question/response)
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
                    
                    if (text.includes('<') || text.includes('\n')) {
                        divBot.innerHTML = text.replace(/\n/g, '<br>');
                    } else {
                        divBot.innerHTML = text;
                    }
                    messagesDisplay.appendChild(divBot);
                }
            });
        }

        // 3. Sección de envío
        const sendSection = this.renderSendSection();

        chatWindow.appendChild(titleChat);
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

    renderSendSection() {
        const section = document.createElement("section");
        section.classList.add("send-section");
        section.innerHTML = `
            <input id="send-message-input" placeholder="Escribe tu mensaje...">
            <button id="btn-send" class="btn-send btn-action" data-action="send" title="Enviar mensaje">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                    <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/>
                </svg>
            </button>
        `;
        return section;
    }

    getMessagesDisplay() {
        return this.container.querySelector(".messages-display");
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
        const spinner = this.container.querySelector(".spinner");
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

    addBotMessage() {
        const display = this.getMessagesDisplay();
        if (!display) return null;
        const div = document.createElement("div");
        div.classList.add("text-msj", "ai-message");
        display.appendChild(div);
        display.scrollTop = display.scrollHeight;
        return div;
    }

    updateTitle(title) {
        const titleEl = this.container.querySelector(".chat-title");
        if (titleEl) titleEl.textContent = title;
    }

    updateSendButton(action) {
        const btn = this.container.querySelector(".btn-action");
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
        return this.container.querySelector(".btn-action")?.getAttribute("data-action");
    }

    getInput() {
        return document.getElementById("send-message-input");
    }

    clearInput() {
        const input = this.getInput();
        if (input) input.value = "";
    }
}
