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
    let currentRequest = null;          // Para cancelar la petición HTTP
    let isWaitingForResponse = false;  // Estado de espera
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
        
        if (conversations.length === 0) {
            asideElements.innerHTML = `
                <li class="empty-conversations">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                        <path d="M80-160v-640q0-33 23.5-56.5T160-880h480q33 0 56.5 23.5T720-800v203q-10-2-20-2.5t-20-.5q-10 0-20 .5t-20 2.5v-203H160v400h283q-2 10-2.5 20t-.5 20q0 10 .5 20t2.5 20H200l-120-160Zm160-440h320v-80H240v80Zm0 160h200v-80H240v80Zm400 280v-120H520v-80h120v-120h80v120h120v80H640v120h-80ZM160-360v-400 400Z"/>
                    </svg>
                    <p>No hay conversaciones aún</p>
                </li>
            `;
            return;
        }
        
        [...conversations].reverse().forEach(item => {
            let itemElement = document.createElement("li");
            itemElement.classList.add(`item-${item.id}`);
            if (item.id === currentConversationId) {
                itemElement.classList.add("active");
            }
            // Limpiar HTML del título del sidebar
            const cleanSidebarTitle = item.title.replace(/<[^>]+>/g, '');
            itemElement.innerHTML = `
                <p class="item-title" data-conversation-id="${item.id}">${cleanSidebarTitle}</p>
                <div class="footer-li">
                    <span>${item.date}</span>
                    <button class="btn-delete-conversation" data-id="${item.id}" aria-label="Eliminar conversación">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
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
        // Limpiar HTML del título antes de mostrarlo
        const cleanTitle = messages.title.replace(/<[^>]+>/g, '');
        titleChat.textContent = cleanTitle;

        let messagesDisplay = document.createElement("div");
        messagesDisplay.classList.add("messages-display");

        if (messages.messages.length < 1) {
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
            messages.messages.forEach(msj => {
                let p = document.createElement("div");
                p.classList.add("text-msj");

                if (msj.question) {
                    p.textContent = msj.question;
                    p.classList.add("user-message");
                } else if (msj.response) {
                    p.innerHTML = msj.response;
                    p.classList.add("ai-message");
                } else if (msj.text) {
                    p.innerHTML = msj.text;
                    p.classList.add("ai-message");
                }

                messagesDisplay.appendChild(p);
            });
        }

        let sendMessagesSection = document.createElement("section");
        sendMessagesSection.classList.add("send-section");

        let inputMessage = document.createElement("input");
        inputMessage.id = "send-message-input";
        inputMessage.placeholder = "Escribe tu mensaje...";

        let sendBtn = document.createElement("button");
        sendBtn.classList.add("btn-send", "btn-action");
        sendBtn.id = "btn-send";
        sendBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/></svg>`;
        
        // Agregar atributos para el botón de acción
        sendBtn.setAttribute("data-action", "send");
        sendBtn.title = "Enviar mensaje";

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
        botMessageElement.classList.add("text-msj", "ai-message");

        currentDisplay.appendChild(botMessageElement);

        const stream = new StreamEffect({ speed: 8 });
        currentStream = stream;

        try {
            // El stream ahora maneja el HTML directamente, no necesitamos sobreescribir
            await stream.write(botResponse, botMessageElement, {
                scrollContainer: currentDisplay
            });
            
            // Guardar en localStorage
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

            // Función para extraer solo texto de HTML (quitar tags)
            const stripHTML = (html) => {
                if (!html) return '';
                if (typeof html !== 'string') return String(html);
                const tmp = document.createElement('div');
                tmp.innerHTML = html;
                return tmp.textContent || tmp.innerText || '';
            };
            
            let generatedTitle = "";
            
            if (titleResult.response && Array.isArray(titleResult.response) && titleResult.response[0]) {
                const resp = titleResult.response[0];
                if (resp.respuesta) {
                    generatedTitle = stripHTML(resp.respuesta);
                } else if (resp.text) {
                    generatedTitle = stripHTML(resp.text);
                } else if (typeof resp === 'string') {
                    generatedTitle = stripHTML(resp);
                }
            }
            else if (titleResult.response && typeof titleResult.response === 'string') {
                generatedTitle = stripHTML(titleResult.response);
            }
            else if (titleResult.response && titleResult.response.respuesta) {
                generatedTitle = stripHTML(titleResult.response.respuesta);
            }
            else if (titleResult.respuesta) {
                generatedTitle = stripHTML(titleResult.respuesta);
            }
            else if (titleResult.text) {
                generatedTitle = stripHTML(titleResult.text);
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

    // Función para actualizar el botón de enviar a stop y viceversa
    const updateSendButton = (isWaiting) => {
        const sendSection = document.querySelector(".send-section");
        if (!sendSection) return;
        
        const btn = sendSection.querySelector(".btn-action");
        if (!btn) return;
        
        if (isWaiting) {
            // Cambiar a botón de stop
            btn.classList.remove("btn-send");
            btn.classList.add("btn-stop");
            btn.setAttribute("data-action", "stop");
            btn.title = "Detener";
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M320-320h320v320H320Zm0-400h320v320H320ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>`;
        } else {
            // Cambiar a botón de enviar
            btn.classList.remove("btn-stop");
            btn.classList.add("btn-send");
            btn.setAttribute("data-action", "send");
            btn.title = "Enviar mensaje";
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/></svg>`;
        }
    };

    // Función para manejar el clic en el botón de acción
    const handleActionClick = async () => {
        const sendSection = document.querySelector(".send-section");
        if (!sendSection) return;
        
        const btn = sendSection.querySelector(".btn-action");
        const action = btn?.getAttribute("data-action");
        
        if (action === "stop") {
            // Cancelar/Detener
            if (isWaitingForResponse && currentRequest) {
                // Cancelar la petición HTTP
                currentRequest.cancel();
                currentRequest = null;
            }
            
            if (currentStream) {
                // Detener el stream
                currentStream.cancel();
                currentStream = null;
            }
            
            // Ocultar spinner
            const currentDisplay = messageContainer.querySelector(".messages-display");
            hideTyping(currentDisplay);
            
            // Restaurar botón
            isWaitingForResponse = false;
            updateSendButton(false);
            
            return;
        }
        
        // Acción de enviar
        await handleProcessAction();
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
            
            // Mostrar botón de stop
            isWaitingForResponse = true;
            updateSendButton(true);
            
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

            // Crear request con capacidad de cancelación
            const request = new Request("/api/llm/q", {
                input: inputValue
            });
            currentRequest = request;

            try {
                const result = await request.petition();
                
                // Ya no esperamos respuesta
                isWaitingForResponse = false;
                
                // Restaurar botón de enviar
                updateSendButton(false);
                
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

                conversationToUpdate.messages.push({ "response": "" });
                localStorage.setItem("msjData", JSON.stringify(conversations));

                if (currentConversationId === idAtMomentOfSend) {
                    await addBotMessageWithStream(conversationToUpdate, botResponse, idAtMomentOfSend);
                }

                if (isFirstMessage) {
                    await generateConversationTitle(conversationToUpdate, inputValue, botResponse);
                }
                
                currentRequest = null;
                
            } catch (error) {
                isWaitingForResponse = false;
                updateSendButton(false);
                
                if (error.message.includes('cancelled') || error.message.includes('abort')) {
                    console.log('Petición cancelada por el usuario');
                } else {
                    console.error('Error en la petición:', error);
                }
                
                currentRequest = null;
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
        if (e.target.closest(".btn-action")) {
            handleActionClick();
        }
    });

    messageContainer.addEventListener("keydown", (e) => {
        if (e.target.id === "send-message-input" && e.key === "Enter") {
            e.preventDefault();
            handleActionClick();
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