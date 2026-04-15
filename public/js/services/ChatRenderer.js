export class ChatRenderer {
    constructor(container) {
        this.container = container;
    }

    clear() {
        this.container.innerHTML = "";
    }

    render(conversation, preserveScroll = false) {
        this.clear();

        const chat = document.createElement("div");
        chat.classList.add("chat-window");

        const titleChat = document.createElement("p");
        titleChat.classList.add("chat-title");
        const cleanTitle = conversation.title.replace(/<[^>]+>/g, '');
        titleChat.textContent = cleanTitle;

        const messagesDisplay = document.createElement("div");
        messagesDisplay.classList.add("messages-display");

        if (!conversation.messages || conversation.messages.length === 0) {
            messagesDisplay.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                        <path d="M80-160v-640q0-33 23.5-56.5T160-880h480q33 0 56.5 23.5T720-800v203q-10-2-20-2.5t-20-.5q-10 0-20 .5t-20 2.5v-203H160v400h283q-2 10-2.5 20t-.5 20q0 10 .5 20t2.5 20H200l-120-160Zm160-440h320v-80H240v80Zm0 160h200v-80H240v80Zm400 280v-120H520v-80h120v-120h80v120h120v80H640v120h-80ZM160-360v-400 400Z"/>
                    </svg>
                    <h2>¡Hola! Soy tu asistente IA</h2>
                    <p>¿En qué puedo ayudarte hoy?</p>
                </div>
            `;
        } else {
            conversation.messages.forEach(msj => {
                const div = document.createElement("div");
                div.classList.add("text-msj");

                if (msj.question) {
                    div.textContent = msj.question;
                    div.classList.add("user-message");
                } else if (msj.response) {
                    div.innerHTML = msj.response;
                    div.classList.add("ai-message");
                } else if (msj.text) {
                    div.innerHTML = msj.text;
                    div.classList.add("ai-message");
                }

                messagesDisplay.appendChild(div);
            });
        }

        const sendSection = this.renderSendSection();

        chat.appendChild(titleChat);
        chat.appendChild(messagesDisplay);
        chat.appendChild(sendSection);
        this.container.appendChild(chat);

        if (!preserveScroll) {
            setTimeout(() => {
                const display = this.container.querySelector(".messages-display");
                if (display) {
                    display.scrollTop = display.scrollHeight;
                }
            }, 100);
        }

        return chat;
    }

    renderSendSection() {
        const section = document.createElement("section");
        section.classList.add("send-section");

        const input = document.createElement("input");
        input.id = "send-message-input";
        input.placeholder = "Escribe tu mensaje...";

        const button = document.createElement("button");
        button.classList.add("btn-send", "btn-action");
        button.id = "btn-send";
        button.setAttribute("data-action", "send");
        button.title = "Enviar mensaje";
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/>
            </svg>
        `;

        section.appendChild(input);
        section.appendChild(button);
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
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement("span");
            dot.classList.add("dot");
            spinner.appendChild(dot);
        }

        display.appendChild(spinner);
        display.scrollTop = display.scrollHeight;
    }

    hideTyping() {
        const display = this.getMessagesDisplay();
        if (!display) return;
        
        const spinner = display.querySelector(".spinner");
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
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    updateSendButton(action) {
        const section = this.container.querySelector(".send-section");
        if (!section) return;

        const btn = section.querySelector(".btn-action");
        if (!btn) return;

        if (action === "stop") {
            btn.classList.remove("btn-send");
            btn.classList.add("btn-stop");
            btn.setAttribute("data-action", "stop");
            btn.title = "Detener";
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                    <path d="M320-320h320v320H320Zm0-400h320v320H320ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                </svg>
            `;
        } else {
            btn.classList.remove("btn-stop");
            btn.classList.add("btn-send");
            btn.setAttribute("data-action", "send");
            btn.title = "Enviar mensaje";
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                    <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/>
                </svg>
            `;
        }
    }

    getAction() {
        const section = this.container.querySelector(".send-section");
        if (!section) return null;
        
        const btn = section.querySelector(".btn-action");
        return btn?.getAttribute("data-action");
    }

    getInput() {
        return document.getElementById("send-message-input");
    }

    clearInput() {
        const input = this.getInput();
        if (input) input.value = "";
    }
}