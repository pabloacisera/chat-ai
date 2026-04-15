const STORAGE_KEY = "msjData";

export class ConversationService {
    constructor() {
        this.conversations = [];
        this.currentId = null;
    }

    load() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            this.conversations = [...parsed];
        } else {
            this.conversations = [parsed];
        }
        return this.conversations;
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.conversations));
    }

    getAll() {
        return this.conversations;
    }

    getById(id) {
        return this.conversations.find(c => c.id === id);
    }

    create(title = "Nueva conversación", date) {
        const conversation = {
            id: Math.floor(Math.random() * 900000) + 100000,
            title,
            date,
            messages: []
        };
        this.conversations.push(conversation);
        this.save();
        return conversation;
    }

    delete(id) {
        this.conversations = this.conversations.filter(c => c.id !== id);
        this.save();
    }

    addMessage(conversationId, message) {
        const conv = this.getById(conversationId);
        if (conv) {
            conv.messages.push(message);
            this.save();
        }
        return conv;
    }

    updateTitle(conversationId, title) {
        const conv = this.getById(conversationId);
        if (conv) {
            conv.title = title;
            this.save();
        }
    }

    setCurrent(id) {
        this.currentId = id;
    }

    getCurrentId() {
        return this.currentId;
    }
}