import { DeleteConversation } from "./components/DeleteConversation.js";

const loadConversations = async (array) => {
    const data = localStorage.getItem("msjData");
    if (!data) {
        console.log("No se han obtenido datos");
        return;
    }
    const dataResponse = JSON.parse(data);
    if (Array.isArray(dataResponse)) {
        dataResponse.forEach(item => array.push(item));
    } else {
        array.push(dataResponse);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // a. VARIABLES & ELEMENTOS
    let conversations = [];
    const asideElements = document.querySelector(".list-conversations");
    const messageContainer = document.getElementById("messages-container");

    // b. FUNCIONES AUXILIARES
    function formatDateFriendly(dateString) {
        const date = new Date(dateString);
        const opciones = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('es-ES', opciones);
    }

    function loadMessages(id) {
        return conversations.find(item => item.id === id);
    }

    // FUNCIÓN PARA MOSTRAR EL TYPING
    const showTyping = (container) => {
        if (container.querySelector(".spinner")) return;
        const spinner = document.createElement("div");
        spinner.classList.add("spinner");
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement("span");
            dot.classList.add("dot");
            spinner.appendChild(dot);
        }
        container.appendChild(spinner);
        container.scrollTop = container.scrollHeight;
    };

    // FUNCIÓN PARA QUITAR EL TYPING
    const hideTyping = (container) => {
        const spinner = container.querySelector(".spinner");
        if (spinner) spinner.remove();
    };

    const asidePopulate = () => {
        asideElements.innerHTML = "";
        conversations.toReversed().map(item => {
            let itemElement = document.createElement("li");
            itemElement.classList.add(`item-${item.id}`)
            itemElement.innerHTML = `
                <p class="item-title" data-conversation-id="${item.id}">${item.title} - ${item.id}</p>
                <div class="footer-li">
                    <span>${item.date}</span>
                    <button class="btn-delete-conversation" data-id="${item.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" height="55px" viewBox="0 -960 960 960" width="55px" fill="#e0392a">
                            <path d="m376-300 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 180q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520Zm-400 0v520-520Z"/>
                        </svg>
                    </button>
                </div>
            `;
            asideElements.appendChild(itemElement);
        });
    }

    const renderChat = (messages, id) => {
        if (!messages) return;

        messageContainer.innerHTML = "";
        let chat = document.createElement("div");
        chat.classList.add("chat-window");

        let titleChat = document.createElement("p");
        titleChat.classList.add("chat-title");
        titleChat.textContent = messages.title;

        let messagesDisplay = document.createElement("div");
        messagesDisplay.classList.add("messages-display");

        if (messages.messages.length < 1) {
            messagesDisplay.innerHTML = `<p class="default-question">¿En qué puedo ayudarte el día de hoy?</p>`;
        } else {
            messages.messages.forEach(msj => {
                let p = document.createElement("p");
                p.classList.add("text-msj");
                p.textContent = msj.text;
                messagesDisplay.appendChild(p);
            });
        }

        let sendMessagesSection = document.createElement("section");
        sendMessagesSection.classList.add("send-section");

        let inputMessage = document.createElement("input");
        inputMessage.id = "send-message-input";
        inputMessage.placeholder = "introduzca duda, consulta o petición...";

        let sendBtn = document.createElement("button");
        sendBtn.classList.add("btn-send");
        sendBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#EAC452"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/></svg>`;

        // Lógica unificada para procesar el envío
        const handleProcessAction = () => {
            const inputValue = inputMessage.value.trim();
            if (inputValue === "") return;

            const conversationToUpdate = conversations.find(c => c.id === id);
            if (conversationToUpdate) {
                // 1. Guardar mensaje del usuario
                conversationToUpdate.messages.push({ "text": inputValue });
                localStorage.setItem("msjData", JSON.stringify(conversations));

                // 2. Renderizar (para que aparezca el globo del usuario)
                renderChat(conversationToUpdate, id);

                // 3. BUSCAR el nuevo contenedor y ACTIVAR TYPING
                const newDisplay = messageContainer.querySelector(".messages-display");
                showTyping(newDisplay);

                // 4. SIMULACIÓN DE RESPUESTA (Aquí llamas a tu API en el futuro)
                setTimeout(() => {
                    hideTyping(newDisplay);
                    conversationToUpdate.messages.push({ "text": "Respuesta automática de prueba" });
                    localStorage.setItem("msjData", JSON.stringify(conversations));
                    renderChat(conversationToUpdate, id);
                }, 1500);
            }
        };

        sendBtn.addEventListener("click", (e) => {
            e.preventDefault();
            handleProcessAction();
        });

        // Usamos keydown para que el Enter funcione mejor que 'change'
        inputMessage.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleProcessAction();
            }
        });

        sendMessagesSection.appendChild(inputMessage);
        sendMessagesSection.appendChild(sendBtn);
        chat.appendChild(titleChat);
        chat.appendChild(messagesDisplay);
        chat.appendChild(sendMessagesSection);
        messageContainer.appendChild(chat);
    };

    // c. CARGA INICIAL
    (async () => {
        await loadConversations(conversations);
        asidePopulate();
    })();

    // d. EVENTOS GLOBALES
    document.getElementById("new-conversation").addEventListener("click", () => {
        let newConversation = {
            id: Math.floor(Math.random() * 900000) + 100000,
            title: "unnamed chat",
            date: formatDateFriendly(new Date().toString()),
            messages: []
        }
        conversations.push(newConversation);
        localStorage.setItem("msjData", JSON.stringify(conversations));
        asidePopulate();
        renderChat(newConversation, newConversation.id);
    });

    asideElements.addEventListener("click", (e) => {
        const btnDelete = e.target.closest('.btn-delete-conversation');
        if (btnDelete) {
            e.stopPropagation();
            const id = parseInt(btnDelete.getAttribute("data-id"));
            const modal = document.createElement("delete-modal");
            document.body.appendChild(modal);
            modal.addEventListener("confirm-delete", () => {
                conversations = conversations.filter(item => item.id !== id);
                localStorage.setItem("msjData", JSON.stringify(conversations));
                asidePopulate();
                messageContainer.innerHTML = "";
            });
            return;
        }

        const chatItem = e.target.closest('li');
        if (chatItem) {
            const titleEl = chatItem.querySelector('.item-title');
            const id = parseInt(titleEl.getAttribute('data-conversation-id'));
            let messages = loadMessages(id);
            renderChat(messages, id);
        }
    });
});