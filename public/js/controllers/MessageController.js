import { Request } from "../helpers/Request.js";
import { ToastNotification } from "../components/ToastNotification.js";
import { configService } from "../services/ConfigService.js";
import { storageService } from "../services/StorageService.js";

export function handleApiError(error, originalData = null) {
    const errorStr = String(error).toLowerCase();
    if (errorStr.includes('503') || errorStr.includes('service unavailable') || errorStr.includes('high demand')) {
        return { type: '503', message: 'El modelo está saturado, reintentando en 5 segundos...' };
    }
    if (errorStr.includes('401') || errorStr.includes('unauthorized') || errorStr.includes('token')) {
        return { type: '401', message: 'Tu sesión expiró. Volvé a iniciar sesión.' };
    }
    if (errorStr.includes('400') || errorStr.includes('bad request') || errorStr.includes('invalid')) {
        return { type: '400', message: error.message || 'Solicitud inválida' };
    }
    if (errorStr.includes('abort') || errorStr.includes('cancelled') || errorStr.includes('cancel')) {
        return { type: 'cancelled', message: 'Solicitud cancelada' };
    }
    return { type: 'generic', message: error.message || String(error) };
}

export function handleNetworkError(error) {
    const errorStr = String(error).toLowerCase();
    if (errorStr.includes('aborterror') || errorStr.includes('cancel') || errorStr.includes('fetch') || errorStr.includes('network') || errorStr.includes('failed to fetch') || errorStr.includes('networkerror')) {
        return { type: 'network', message: 'Sin conexión. Verificá tu red e intentá de nuevo.' };
    }
    return { type: 'network', message: error.message || String(error) };
}

export class MessageController {
    constructor(app) {
        this.app = app;
    }

    handleActionClick() {
        const action = this.app.chatRenderer.getAction();
        if (action === "stop") {
            this.cancelRequest();
            return;
        }
        this.processMessage();
    }

    cancelRequest() {
        if (this.app.currentRequest) {
            this.app.currentRequest.cancel();
            this.app.currentRequest = null;
        }
        this.app.isWaitingForResponse = false;
        this.app.chatRenderer.updateSendButton("send");
        this.app.chatRenderer.hideTyping();
    }

    async processMessage() {
        const input = this.app.chatRenderer.getInput();
        if (!input) return;
        const value = input.value.trim();
        if (!value) return;

        const currentId = this.app.conversationService.getCurrentId();
        if (!currentId) return;
        const conversation = this.app.conversationService.getById(currentId);
        if (!conversation) return;

        const config = configService.getCurrent();
        if (!config || !config.model || !config.apiKey) {
            this.app.isWaitingForResponse = false;
            this.app.chatRenderer.updateSendButton("send");
            ToastNotification.error("Debes configurar el modelo y API key antes de enviar mensajes. Escribe /set-model <model> o /models");
            return;
        }

        const isFirstMessage = conversation.messages.length === 0;
        this.app.isWaitingForResponse = true;
        this.app.chatRenderer.updateSendButton("stop");

        this.app.conversationService.addMessage(currentId, { question: value });
        this.app.chatRenderer.render(conversation, true, true);

        this.app.conversationService.addMessage(currentId, { response: "" });
        const messageElement = this.app.chatRenderer.addBotMessage(config.model);

        this.app.chatRenderer.clearInput();
        this.app.chatRenderer.setTyping();

        const requestData = {
            input: value,
            model: config.model,
            apiKey: config.apiKey,
            maxTokens: config.maxTokens || 1000,
            temperature: config.temperature !== undefined ? config.temperature : 0.7,
            systemPrompt: config.systemPrompt || ""
        };

        const request = new Request("/api/llm/q", requestData);
        this.app.currentRequest = request;

        try {
            const result = await this.processStreamResponse("/api/llm/q", requestData, request.abortController.signal, messageElement);

            this.app.isWaitingForResponse = false;
            this.app.chatRenderer.updateSendButton("send");
            this.app.chatRenderer.hideTyping();

            const botResponse = result.respuesta || "No se pudo obtener respuesta";

            try {
                await storageService.sendMessage(currentId, value, config.model, {
                    provider: config.provider || this.app.conversationService.getProviderFromModel(config.model),
                    apiKey: config.apiKey,
                    maxTokens: config.maxTokens,
                    temperature: config.temperature,
                    systemPrompt: config.systemPrompt,
                    assistantMessage: botResponse
                });
            } catch (persistError) {
                console.error("Error persistiendo mensajes:", persistError);
            }

            if (currentId === this.app.conversationService.getCurrentId()) {
                const conv = this.app.conversationService.getById(currentId);
                if (conv && conv.messages.length > 0) {
                    const lastIndex = conv.messages.length - 1;
                    conv.messages[lastIndex].response = botResponse;
                }
            }

            if (messageElement) {
                messageElement.innerHTML = botResponse;
            }

            if (isFirstMessage && configService.getShowTitle()) {
                await this.generateTitle(conversation, value, botResponse);
            }

            this.app.playNotificationSound();
            this.app.currentRequest = null;

        } catch (error) {
            this.app.isWaitingForResponse = false;
            this.app.chatRenderer.updateSendButton("send");
            this.app.chatRenderer.hideTyping();

            if (error.name === 'AbortError') {
                console.log("Solicitud cancelada por el usuario");
            } else if (!error.message?.includes('503') && !error.message?.includes('cancelled')) {
                console.error("Error en processMessage:", error);
            }

            this.app.currentRequest = null;
        }
    }

    async processStreamResponse(url, data, signal, targetElement = null, retryCount = 0) {
        let buffer = "";
        let fullResponse = "";
        let isResolved = false;

        const renderChunk = (el) => {
            try {
                const html = window.marked ? window.marked.parse(fullResponse) : fullResponse.replace(/\n/g, '<br>');
                el.innerHTML = html;
            } catch {
                el.innerHTML = fullResponse.replace(/\n/g, '<br>');
            }
            const container = el.parentElement?.closest?.(".messages-display") || el.parentElement;
            if (container && container.classList.contains("messages-display")) {
                container.scrollTop = container.scrollHeight;
            }
        };

        const processLine = async (line) => {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) return;
            try {
                const jsonStr = trimmedLine.slice(6);
                const lineData = JSON.parse(jsonStr);

                if (lineData.error) {
                    if (!isResolved) {
                        isResolved = true;
                        throw lineData.error;
                    }
                    return;
                }

                if (lineData.chunk) {
                    fullResponse += lineData.chunk;
                    if (targetElement !== false) {
                        let el = targetElement;
                        if (!el) {
                            const msgDisplay = this.app.chatRenderer.getMessagesDisplay();
                            el = msgDisplay?.querySelector('.ai-message:last-child .message-content');
                        }
                        if (el) {
                            renderChunk(el);
                        }
                    }
                }

                if (lineData.done) {
                    if (!isResolved) {
                        isResolved = true;
                        return {
                            respuesta: lineData.respuesta || fullResponse,
                            modelo: lineData.modelo,
                            tokens: lineData.tokens
                        };
                    }
                }
            } catch (e) {
                console.warn("Error parseando línea SSE:", trimmedLine, e);
            }
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                signal: signal
            });

            if (!response.ok) {
                const status = response.status;
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `HTTP ${status}`;

                if (status === 503 || errorMessage.toLowerCase().includes('503') || errorMessage.toLowerCase().includes('service unavailable') || errorMessage.toLowerCase().includes('high demand')) {
                    if (retryCount < 2) {
                        ToastNotification.warning("El modelo está saturado, reintentando en 5 segundos...");
                        await new Promise(r => setTimeout(r, 5000));
                        return this.processStreamResponse(url, data, signal, targetElement, retryCount + 1);
                    } else {
                        ToastNotification.error("El modelo no está disponible. Probá cambiando de modelo en Configuración.");
                        throw new Error(errorMessage);
                    }
                }

                if (status === 401) {
                    ToastNotification.warning("Tu sesión expiró. Volvé a iniciar sesión.");
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user-info');
                    window.location.reload();
                    throw new Error(errorMessage);
                }

                if (status === 400) {
                    ToastNotification.error(errorMessage);
                    throw new Error(errorMessage);
                }

                throw new Error(errorMessage);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) {
                throw new Error("No se pudo obtener el reader del stream");
            }

            let streamResult = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (buffer) {
                        const r = await processLine(buffer);
                        if (r) streamResult = r;
                    }
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const result = await processLine(line);
                    if (result) {
                        streamResult = result;
                        if (isResolved) break;
                    }
                }

                if (streamResult && isResolved) break;
            }

            return streamResult || { respuesta: fullResponse };
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }

            const networkError = handleNetworkError(error);
            if (networkError.type === 'network') {
                ToastNotification.error(networkError.message);
                throw error;
            }

            const apiError = handleApiError(error, data);
            if (apiError.type === '503') {
                if (retryCount < 2) {
                    ToastNotification.warning("El modelo está saturado, reintentando en 5 segundos...");
                    await new Promise(r => setTimeout(r, 5000));
                    return this.processStreamResponse(url, data, signal, targetElement, retryCount + 1);
                } else {
                    ToastNotification.error("El modelo no está disponible. Probá cambiando de modelo en Configuración.");
                    throw error;
                }
            }

            if (apiError.type === '401') {
                ToastNotification.warning(apiError.message);
                localStorage.removeItem('authToken');
                localStorage.removeItem('user-info');
                window.location.reload();
                throw error;
            }

            if (apiError.type === '400') {
                ToastNotification.error(apiError.message);
                throw error;
            }

            if (apiError.type === 'generic') {
                throw error;
            }

            throw error;
        }
    }

    async generateTitle(conversation, userQuestion, botResponse) {
        try {
            const config = configService.getCurrent();
            if (!config || !config.model || !config.apiKey) {
                console.warn("No hay configuración para generar título");
                return;
            }

            const chatTitle = this.app.chatRenderer.container.querySelector(".chat-title");
            if (chatTitle) {
                chatTitle.textContent = "Generando título...";
            }

            const prompt = `Analiza este intercambio y crea un título descriptivo pero muy breve (máximo 5 palabras). 
            Pregunta: "${userQuestion.substring(0, 100)}"
            Respuesta: "${botResponse.substring(0, 100)}"
            Responde ÚNICAMENTE con el título, sin comillas ni puntos finales.`;

            const requestData = {
                input: prompt,
                model: config.model,
                apiKey: config.apiKey,
                maxTokens: 30,
                temperature: 0.3,
                systemPrompt: "Eres un experto en resumir temas de conversación de forma concisa. Responde solo el título."
            };

            const result = await this.processStreamResponse("/api/llm/q", requestData, null, false);

            let rawTitle = result.respuesta || "";
            const title = this.app.uiController.cleanTitle(rawTitle);

            await this.app.conversationService.updateTitle(conversation.id, title);
            this.app.sidebarRenderer.setCurrentId(conversation.id);
            this.app.sidebarRenderer.render(this.app.conversationService.getAll());

            if (this.app.conversationService.getCurrentId() === conversation.id) {
                this.app.chatRenderer.updateTitle(title);
            }
        } catch (error) {
            console.error("Error al generar título:", error);
            const fallback = this.app.uiController.cleanTitle(userQuestion.substring(0, 60));
            if (fallback !== "Nueva conversación") {
                await this.app.conversationService.updateTitle(conversation.id, fallback);
                this.app.sidebarRenderer.setCurrentId(conversation.id);
                this.app.sidebarRenderer.render(this.app.conversationService.getAll());
                if (this.app.conversationService.getCurrentId() === conversation.id) {
                    this.app.chatRenderer.updateTitle(fallback);
                }
            }
        }
    }
}
