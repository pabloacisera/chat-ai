const STORAGE_KEY = "chat-config";
const STORAGE_KEY_GLOBAL = "chat-config-global";

class ConfigService {
    constructor() {
        this.chatConfig = {};
        this.globalConfig = {};
        this.init();
    }

    init() {
        this.chatConfig = this.loadFromStorage();
        this.globalConfig = this.loadGlobalFromStorage();
        console.log("⚙️ ConfigService inicializado. showTitle:", this.globalConfig.showTitle);
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return {};
            return JSON.parse(data);
        } catch (error) {
            console.error("Error leyendo desde localStorage:", error);
            return {};
        }
    }

    loadGlobalFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_GLOBAL);
            if (!data) {
                return { showTitle: true, streamSpeed: 8 };
            }
            const parsed = JSON.parse(data);
            
            // Si la propiedad no existe, forzamos true
            if (parsed.showTitle === undefined || parsed.showTitle === null) {
                parsed.showTitle = true;
            }
            
            return parsed;
        } catch (error) {
            console.error("Error leyendo global config:", error);
            return { showTitle: true, streamSpeed: 8 };
        }
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.chatConfig));
        } catch (error) {
            console.error("Error guardando en localStorage:", error);
        }
    }

    saveGlobal() {
        try {
            localStorage.setItem(STORAGE_KEY_GLOBAL, JSON.stringify(this.globalConfig));
        } catch (error) {
            console.error("Error guardando config global:", error);
        }
    }

    getAll() {
        return { ...this.chatConfig };
    }

    getGlobal() {
        const config = { ...this.globalConfig };
        if (config.showTitle === undefined || config.showTitle === null) {
            config.showTitle = true;
        }
        return config;
    }

    getCurrent() {
        const savedModel = localStorage.getItem("current-model");
        if (savedModel && this.chatConfig[savedModel]) {
            return { model: savedModel, ...this.chatConfig[savedModel] };
        }
        const firstKey = Object.keys(this.chatConfig)[0];
        if (firstKey) {
            return { model: firstKey, ...this.chatConfig[firstKey] };
        }
        return null;
    }

    getByModel(modelKey) {
        return this.chatConfig[modelKey] ? { model: modelKey, ...this.chatConfig[modelKey] } : null;
    }

    hasKey(modelKey) {
        return !!(this.chatConfig[modelKey] && this.chatConfig[modelKey].apiKey);
    }

    add(modelKey, config) {
        this.chatConfig[modelKey] = {
            apiKey: config.apiKey || "",
            maxTokens: config.maxTokens || 1000,
            temperature: config.temperature !== undefined ? config.temperature : 0.7,
            systemPrompt: config.systemPrompt || ""
        };
        this.save();
    }

    updateKey(modelKey, newApiKey) {
        if (this.chatConfig[modelKey]) {
            this.chatConfig[modelKey].apiKey = newApiKey;
            this.save();
        } else {
            this.add(modelKey, { apiKey: newApiKey, maxTokens: 1000 });
        }
    }

    updateSystemPrompt(modelKey, systemPrompt) {
        if (this.chatConfig[modelKey]) {
            this.chatConfig[modelKey].systemPrompt = systemPrompt;
            this.save();
        }
    }

    removeKey(modelKey) {
        if (this.chatConfig[modelKey]) {
            delete this.chatConfig[modelKey];
            this.save();
        }
    }

    setCurrentModel(modelKey) {
        localStorage.setItem("current-model", modelKey);
    }

    getCurrentModel() {
        return localStorage.getItem("current-model");
    }

    getModelsWithKeys() {
        return Object.entries(this.chatConfig)
            .filter(([_, config]) => config.apiKey)
            .map(([model, config]) => ({
                model,
                maxTokens: config.maxTokens,
                temperature: config.temperature,
                systemPrompt: config.systemPrompt
            }));
    }

    updateGlobal(config) {
        this.globalConfig = {
            ...this.globalConfig,
            ...config
        };
        this.saveGlobal();
    }

    getStreamSpeed() {
        return this.globalConfig.streamSpeed || 8;
    }

    getShowTitle() {
        if (this.globalConfig.showTitle === undefined || this.globalConfig.showTitle === null) {
            return true;
        }
        return this.globalConfig.showTitle !== false;
    }

    clear() {
        this.chatConfig = {};
        this.globalConfig = {};
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY_GLOBAL);
        localStorage.removeItem("current-model");
    }
}

export const configService = new ConfigService();
