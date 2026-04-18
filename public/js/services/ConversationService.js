const CURRENT_ID_KEY = "currentConvId";
import { storageService } from './StorageService.js';

export class ConversationService {
    constructor() {
        this.conversations = [];
        this.currentId = this.loadCurrentId();
    }

    loadCurrentId() {
        return localStorage.getItem(CURRENT_ID_KEY);
    }

    saveCurrentId(id) {
        if (id) {
            localStorage.setItem(CURRENT_ID_KEY, id);
        } else {
            localStorage.removeItem(CURRENT_ID_KEY);
        }
    }

    getAll() {
        return this.conversations;
    }

    setAll(conversations) {
        this.conversations = conversations.map(conv => ({
            id: conv.id,
            title: conv.title || "Nueva conversación",
            modelId: conv.modelId || null,
            provider: conv.provider || null,
            date: conv.createdAt || conv.date || new Date().toISOString(),
            updatedAt: conv.updatedAt || null,
            messages: conv.messages || []
        }));
    }

    getById(id) {
        if (!id) return null;
        return this.conversations.find(c => String(c.id) === String(id));
    }

    getProviderFromModel(model) {
        const providers = {
            'gemini-2.5-flash': 'google',
            'mistral-small': 'mistral',
            'llama-3.3-70b-versatile': 'groq',
            'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': 'groq'
        };
        return providers[model] || 'google';
    }

    async create(title, modelId, provider) {
        const finalProvider = provider || this.getProviderFromModel(modelId);
        const result = await storageService.createConversation(title, modelId, finalProvider);
        const conversation = {
            id: result.id,
            title: result.title,
            modelId: result.modelId,
            provider: result.provider,
            date: result.createdAt || result.date || new Date().toISOString(),
            messages: []
        };
        this.conversations.unshift(conversation);
        return conversation;
    }

    delete(id) {
        const conv = this.getById(id);
        
        if (conv && conv.id) {
            const convIdStr = String(conv.id);
            const isAuthConv = convIdStr.includes('-') && !convIdStr.startsWith('anon');
            const isAnonConv = convIdStr.startsWith('anon_') || /^\d+$/.test(convIdStr);
            
            if (isAuthConv) {
                storageService.deleteConversation(id).catch(console.error);
            } else if (isAnonConv) {
                const anonSessionId = localStorage.getItem('anonSessionId');
                if (anonSessionId) {
                    this.deleteAnonConversation(anonSessionId, convIdStr).catch(console.error);
                }
            }
        }
        
        this.conversations = this.conversations.filter(c => String(c.id) !== String(id));
    }

    async deleteAnonConversation(sessionId, convId) {
        const conversations = await storageService._fetch(`/anon/conversations/${sessionId}`);
        const filtered = conversations.filter(c => String(c.id) !== String(convId));
        await storageService._fetch(`/anon/conversations/${sessionId}`, 'PUT', { conversations: filtered });
    }

    addMessage(conversationId, message) {
        const conv = this.getById(conversationId);
        if (conv) {
            conv.messages.push(message);
        }
        return conv;
    }

    async updateTitle(conversationId, title) {
        const conv = this.getById(conversationId);
        if (conv) {
            conv.title = title;
            
            if (conv.id) {
                const isAuthConv = typeof conv.id === 'string' && conv.id.includes('-');
                const isAnonConv = typeof conv.id === 'string' && conv.id.startsWith('anon_');
                
                if (isAuthConv) {
                    storageService.updateConversationTitle(conversationId, title).catch(console.error);
                } else if (isAnonConv) {
                    const anonSessionId = localStorage.getItem('anonSessionId');
                    if (anonSessionId) {
                        this.updateAnonConversationTitle(anonSessionId, conversationId, title).catch(console.error);
                    }
                }
            }
        }
    }

    async updateAnonConversationTitle(sessionId, convId, title) {
        const conversations = await storageService._fetch(`/anon/conversations/${sessionId}`);
        const updated = conversations.map(c => c.id === convId ? { ...c, title } : c);
        await storageService._fetch(`/anon/conversations/${sessionId}`, 'PUT', { conversations: updated });
    }

    save() {
        // Placeholder para evitar TypeError: this.conversationService.save is not a function
        // La persistencia real se maneja en los métodos que llaman a storageService
    }

    setCurrent(id) {
        this.currentId = id;
        this.saveCurrentId(id);
    }

    getCurrentId() {
        if (!this.currentId) {
            this.currentId = this.loadCurrentId();
        }
        return this.currentId;
    }
}

export const conversationService = new ConversationService();