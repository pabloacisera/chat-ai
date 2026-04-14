import { StreamEffect } from "./helpers/streamData.js";
import { DeleteConversation } from "./components/DeleteConversation.js";
import { Request } from "./helpers/Request.js";


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
    let currentConversationId = null;
    let currentStream = null;
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

    const showTyping = (container) => {
        if (!container || container.querySelector(".spinner")) return;
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

    const hideTyping = (container) => {
        if (!container) return;
        const spinner = container.querySelector(".spinner");
        if (spinner) spinner.remove();
    };

    const asidePopulate = () => {
        asideElements.innerHTML = "";
        [...conversations].reverse().forEach(item => {
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

    const renderChat = (messages, id, preserveScroll = false) => {
        if (!messages) return;
        currentConversationId = id;

        if (currentStream) {
            currentStream.cancel();
            currentStream = null;
        }

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
                let p = document.createElement("div"); // Cambiado de <p> a <div>
                p.classList.add("text-msj");

                if (msj.question) {
                    p.textContent = msj.question;
                    p.style.backgroundColor = "#e3f2fd";
                    p.style.alignSelf = "flex-end";
                    p.style.marginLeft = "auto";
                    p.style.marginRight = "0";
                } else if (msj.response) {
                    p.innerHTML = msj.response;
                    p.style.backgroundColor = "#f5f5f5";
                    p.style.alignSelf = "flex-start";
                    p.style.marginLeft = "0";
                    p.style.marginRight = "auto";
                } else if (msj.text) {
                    p.innerHTML = msj.text; // Cambiado de textContent a innerHTML
                    p.style.backgroundColor = "#f5f5f5";
                    p.style.alignSelf = "flex-start";
                    p.style.marginLeft = "0";
                    p.style.marginRight = "auto";
                }

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

        sendMessagesSection.appendChild(inputMessage);
        sendMessagesSection.appendChild(sendBtn);
        chat.appendChild(titleChat);
        chat.appendChild(messagesDisplay);
        chat.appendChild(sendMessagesSection);
        messageContainer.appendChild(chat);

        setTimeout(() => {
            const messagesDisplayEl = messageContainer.querySelector(".messages-display");
            if (messagesDisplayEl && !preserveScroll) {
                messagesDisplayEl.scrollTop = messagesDisplayEl.scrollHeight;
            }
        }, 100);
    };

    const addBotMessageWithStream = async (conversation, botResponse, idAtMomentOfSend) => {
        const currentDisplay = messageContainer.querySelector(".messages-display");
        hideTyping(currentDisplay);

        const botMessageElement = document.createElement("div");
        botMessageElement.classList.add("text-msj");
        botMessageElement.style.backgroundColor = "#f5f5f5";
        botMessageElement.style.alignSelf = "flex-start";
        botMessageElement.style.marginLeft = "0";
        botMessageElement.style.marginRight = "auto";

        currentDisplay.appendChild(botMessageElement);

        setTimeout(() => {
            botMessageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 50);

        const stream = new StreamEffect({ speed: 8 });
        currentStream = stream;

        try {
            await stream.write(botResponse, botMessageElement, {
                preserveContent: true
            });
            
            // Después de escribir, convertir el texto plano a HTML
            botMessageElement.innerHTML = botResponse;

            const lastMessageIndex = conversation.messages.length - 1;
            if (lastMessageIndex >= 0 && conversation.messages[lastMessageIndex].response === "") {
                conversation.messages[lastMessageIndex].response = botResponse;
                localStorage.setItem("msjData", JSON.stringify(conversations));
            }
        } catch (error) {
            if (error.message === 'Stream cancelled') {
                console.log('Stream de escritura cancelado');
            } else {
                console.error('Error en el stream:', error);
            }
        } finally {
            if (currentStream === stream) {
                currentStream = null;
            }
        }
    };

    // Función para generar el título de la conversación
    const generateConversationTitle = async (conversation, userQuestion, botResponse) => {
        try {
            console.log("🔄 Generando título para la conversación...");
            console.log("Conversación ID:", conversation.id);
            console.log("Pregunta del usuario:", userQuestion);
            
            const chatTitle = messageContainer.querySelector(".chat-title");
            if (chatTitle) {
                chatTitle.textContent = "🔄 Generando título...";
            }

            const titlePrompt = `Genera un título corto para esta conversación de máximo 8 palabras. 
Basado en la pregunta del usuario: "${userQuestion}"
Responde SOLO con el título, sin comillas, sin números, sin texto adicional. Ejemplo: "Historia del Antiguo Egipto"`;

            console.log("📤 Enviando solicitud de título...");
            
            const titleResult = await new Request("/api/llm/q", {
                input: titlePrompt
            }).petition();

            console.log("📥 Respuesta del título:", titleResult);

            let generatedTitle = "";
            
            if (titleResult.response && Array.isArray(titleResult.response) && titleResult.response[0]) {
                if (titleResult.response[0].respuesta) {
                    generatedTitle = titleResult.response[0].respuesta;
                } else if (titleResult.response[0].text) {
                    generatedTitle = titleResult.response[0].text;
                } else if (typeof titleResult.response[0] === 'string') {
                    generatedTitle = titleResult.response[0];
                }
            }
            else if (titleResult.response && typeof titleResult.response === 'string') {
                generatedTitle = titleResult.response;
            }
            else if (titleResult.response && titleResult.response.respuesta) {
                generatedTitle = titleResult.response.respuesta;
            }
            else if (titleResult.respuesta) {
                generatedTitle = titleResult.respuesta;
            }
            else if (titleResult.text) {
                generatedTitle = titleResult.text;
            }
            else {
                generatedTitle = userQuestion.substring(0, 40) + (userQuestion.length > 40 ? "..." : "");
                console.log("⚠️ Usando título por defecto basado en la pregunta");
            }

            generatedTitle = generatedTitle.trim()
                .replace(/^["']|["']$/g, '')
                .replace(/^\d+\.\s*/, '')
                .replace(/\n/g, ' ')
                .substring(0, 50);

            if (!generatedTitle || generatedTitle.length === 0) {
                generatedTitle = "Conversación";
            }

            console.log(`✅ Título generado: "${generatedTitle}"`);

            conversation.title = generatedTitle;
            localStorage.setItem("msjData", JSON.stringify(conversations));
            asidePopulate();

            if (currentConversationId === conversation.id) {
                const updatedChatTitle = messageContainer.querySelector(".chat-title");
                if (updatedChatTitle) {
                    updatedChatTitle.textContent = generatedTitle;
                }
            }

            return generatedTitle;

        } catch (error) {
            console.error("❌ Error al generar el título:", error);
            const defaultTitle = userQuestion.substring(0, 30) + (userQuestion.length > 30 ? "..." : "");
            conversation.title = defaultTitle || "Conversación";
            localStorage.setItem("msjData", JSON.stringify(conversations));
            asidePopulate();
            
            if (currentConversationId === conversation.id) {
                const chatTitle = messageContainer.querySelector(".chat-title");
                if (chatTitle) {
                    chatTitle.textContent = conversation.title;
                }
            }
            return conversation.title;
        }
    };

    // Lógica unificada para procesar el envío
    const handleProcessAction = async () => {
        const inputMessage = document.getElementById("send-message-input");
        if (!inputMessage || !currentConversationId) return;

        const inputValue = inputMessage.value.trim();
        if (inputValue === "") return;

        const idAtMomentOfSend = currentConversationId;
        const conversationToUpdate = conversations.find(c => c.id === idAtMomentOfSend);

        if (conversationToUpdate) {
            const isFirstMessage = conversationToUpdate.messages.length === 0;
            console.log("¿Es primer mensaje?", isFirstMessage);

            conversationToUpdate.messages.push({ "question": inputValue });
            localStorage.setItem("msjData", JSON.stringify(conversations));
            inputMessage.value = "";

            if (currentConversationId === idAtMomentOfSend) {
                renderChat(conversationToUpdate, idAtMomentOfSend, true);
                const newDisplay = messageContainer.querySelector(".messages-display");
                showTyping(newDisplay);

                setTimeout(() => {
                    if (newDisplay) newDisplay.scrollTop = newDisplay.scrollHeight;
                }, 100);
            }

            const result = await new Request("/api/llm/q", {
                input: inputValue
            }).petition();

            console.log("Respuesta completa: ", result);

            let botResponse = "";

            if (result.response && Array.isArray(result.response) && result.response[0] && result.response[0].respuesta) {
                botResponse = result.response[0].respuesta;
            }
            else if (result.response && typeof result.response === 'string') {
                botResponse = result.response;
            }
            else if (result.response && result.response.respuesta) {
                botResponse = result.response.respuesta;
            }
            else if (result.respuesta) {
                botResponse = result.respuesta;
            }
            else if (result.candidates && result.candidates[0]) {
                botResponse = result.candidates[0].content.parts[0].text;
            }
            else {
                botResponse = "No se pudo obtener una respuesta";
            }

            console.log("Respuesta procesada: ", botResponse.substring(0, 100) + "...");

            conversationToUpdate.messages.push({ "response": "" });
            localStorage.setItem("msjData", JSON.stringify(conversations));

            if (currentConversationId === idAtMomentOfSend) {
                await addBotMessageWithStream(conversationToUpdate, botResponse, idAtMomentOfSend);
            }

            if (isFirstMessage) {
                console.log("🎯 Generando título para el primer mensaje...");
                await generateConversationTitle(conversationToUpdate, inputValue, botResponse);
            } else {
                console.log("⏭️ No es el primer mensaje, omitiendo generación de título");
            }
        }
    };

    // c. CARGA INICIAL
    (async () => {
        await loadConversations(conversations);
        asidePopulate();
        console.log("Conversaciones cargadas:", conversations);
    })();

    // d. EVENTOS GLOBALES
    messageContainer.addEventListener("click", (e) => {
        if (e.target.closest(".btn-send")) {
            handleProcessAction();
        }
    });

    messageContainer.addEventListener("keydown", (e) => {
        if (e.target.id === "send-message-input" && e.key === "Enter") {
            e.preventDefault();
            handleProcessAction();
        }
    });

    document.getElementById("new-conversation").addEventListener("click", () => {
        if (currentStream) {
            currentStream.cancel();
            currentStream = null;
        }

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
                if (currentConversationId === id && currentStream) {
                    currentStream.cancel();
                    currentStream = null;
                }

                conversations = conversations.filter(item => item.id !== id);
                localStorage.setItem("msjData", JSON.stringify(conversations));
                asidePopulate();
                if (currentConversationId === id) {
                    messageContainer.innerHTML = "";
                    currentConversationId = null;
                }
            });
            return;
        }

        const chatItem = e.target.closest('li');
        if (chatItem) {
            if (currentStream) {
                currentStream.cancel();
                currentStream = null;
            }

            const titleEl = chatItem.querySelector('.item-title');
            const id = parseInt(titleEl.getAttribute('data-conversation-id'));
            let messages = loadMessages(id);
            renderChat(messages, id);
        }
    });
});