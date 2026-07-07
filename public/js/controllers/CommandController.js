import { ToastNotification } from "../components/ToastNotification.js";
import { configService } from "../services/ConfigService.js";

export class CommandController {
    constructor(app) {
        this.app = app;
    }

    handleCommand(value) {
        const [command, ...args] = value.split(" ");
        this.app.chatRenderer.clearInput();

        switch (command) {
            case "/models":
                this.listModels();
                break;
            case "/set-model":
                this.setModel(args[0]);
                break;
            default:
                ToastNotification.error(`Comando desconocido: ${command}`);
                break;
        }
    }

    listModels() {
        const models = configService.getModelsWithKeys();
        const current = configService.getCurrent();

        let message = "<strong>Modelos configurados:</strong><br><ul>";
        if (models.length === 0) {
            message = "No tienes modelos configurados con API Key. Ve a Configuración.";
        } else {
            models.forEach(m => {
                const isActive = current && current.model === m.model ? " (Actual)" : "";
                message += `<li>• ${m.model}${isActive}</li>`;
            });
            message += "</ul><br><small>Usa /set-model <nombre> para cambiar</small>";
        }

        const messageElement = this.app.chatRenderer.addBotMessage();
        if (messageElement) {
            messageElement.innerHTML = message;
        }
    }

    setModel(modelName) {
        if (!modelName) {
            ToastNotification.error("Debes especificar un nombre de modelo");
            return;
        }

        const models = configService.getModelsWithKeys();
        const found = models.find(m => m.model === modelName);

        if (found) {
            configService.setCurrentModel(modelName);
            const messageElement = this.app.chatRenderer.addBotMessage();
            if (messageElement) {
                messageElement.innerHTML = `✅ Modelo cambiado a: <strong>${modelName}</strong>`;
            }
            ToastNotification.success(`Cambiado a ${modelName}`);
        } else {
            ToastNotification.error(`El modelo "${modelName}" no está configurado o no existe`);
        }
    }
}
