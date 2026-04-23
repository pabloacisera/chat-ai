const API_BASE = '/api';
import { ToastNotification } from '../components/ToastNotification.js';

class StorageService {
  constructor() {
    this.isAuthenticated = !!localStorage.getItem('authToken');
  }

  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  setAuthToken(token) {
    localStorage.setItem('authToken', token);
    this.isAuthenticated = true;
    localStorage.removeItem('conversations:cache');
  }

  clearAuth() {
    localStorage.removeItem('authToken');
    this.isAuthenticated = false;
  }

  async getConversations() {
    const cached = localStorage.getItem('conversations:cache');
    if (cached && this.isAuthenticated) {
      return JSON.parse(cached);
    }

    if (this.isAuthenticated) {
      return this._fetchAndCache('/conversations?limit=50', 'conversations:cache');
    } else {
      const sessionId = localStorage.getItem('anonSessionId');
      if (!sessionId) return [];
      return this._fetch(`/anon/conversations/${sessionId}`);
    }
  }

  async getMessages(conversationId) {
    if (this.isAuthenticated) {
      const cached = localStorage.getItem(`conv:${conversationId}:cache`);
      if (cached) return JSON.parse(cached);
      return this._fetchAndCache(`/conversations/${conversationId}/messages`, `conv:${conversationId}:cache`);
    } else {
      const sessionId = localStorage.getItem('anonSessionId');
      return this._fetch(`/anon/conversations/${sessionId}/${conversationId}/messages`);
    }
  }

  async createConversation(title, modelId, provider) {
    if (this.isAuthenticated) {
      return this._fetch('/conversations', 'POST', { title, modelId, provider });
    } else {
      const sessionId = localStorage.getItem('anonSessionId');
      return this._fetch(`/anon/conversations/${sessionId}`, 'POST', { title, modelId, provider });
    }
  }

  async sendMessage(conversationId, content, modelId, extra = {}) {
    if (this.isAuthenticated) {
      return this._fetch('/messages', 'POST', { conversationId, content, modelId, ...extra });
    } else {
      const sessionId = localStorage.getItem('anonSessionId');
      return this._fetch('/anon/messages', 'POST', { sessionId, convId: conversationId, content, modelId, ...extra });
    }
  }

  async deleteConversation(conversationId) {
    let result;
    if (this.isAuthenticated) {
      result = await this._fetch(`/conversations/${conversationId}`, 'DELETE');
    } else {
      const sessionId = localStorage.getItem('anonSessionId');
      if (!sessionId) return;
      result = await this._fetch(`/anon/conversations/${sessionId}/${conversationId}`, 'DELETE');
    }
    
    // Limpiar caché de conversaciones para forzar recarga en el próximo GET
    localStorage.removeItem('conversations:cache');
    return result;
  }

  async updateConversationTitle(conversationId, title) {
    if (!this.isAuthenticated) return;
    return this._fetch(`/conversations/${conversationId}`, 'PATCH', { title });
  }

  async getConversationCount() {
    if (!this.isAuthenticated) return { count: 0, max: 100 };
    return this._fetch('/conversations/count');
  }

  async getConfig() {
    if (this.isAuthenticated) {
      return this._fetch('/users/config');
    } else {
      const sessionId = localStorage.getItem('anonSessionId');
      if (!sessionId) return null;
      return this._fetch(`/anon/config/${sessionId}`);
    }
  }

  async updateConfig(config) {
    if (this.isAuthenticated) {
      const result = await this._fetch('/users/config', 'PATCH', config);
      localStorage.setItem('config:cache', JSON.stringify(config));
      return result;
    } else {
      const sessionId = localStorage.getItem('anonSessionId');
      const result = await this._fetch(`/anon/config/${sessionId}`, 'PATCH', config);
      localStorage.setItem('config:cache', JSON.stringify(config));
      return result;
    }
  }

  async getModels() {
    if (!this.isAuthenticated) return [];
    return this._fetch('/models');
  }

  async addModel(modelData) {
    if (!this.isAuthenticated) return;
    return this._fetch('/models', 'POST', modelData);
  }

  async deleteModel(modelId) {
    if (!this.isAuthenticated) return;
    return this._fetch(`/models/${modelId}`, 'DELETE');
  }

  async getUser() {
    if (!this.isAuthenticated) return null;
    return this._fetch('/auth/me');
  }

  async migrateAnonData(anonSessionId) {
    if (!this.isAuthenticated) return;
    return this._fetch('/sync/migrate', 'POST', { anonSessionId });
  }

  async createAnonSession() {
    const result = await this._fetch('/anon/session', 'POST');
    localStorage.setItem('anonSessionId', result.sessionId);
    return result.sessionId;
  }

  async checkWelcomeShown(sessionId) {
    const result = await this._fetch(`/anon/welcome/${sessionId}`);
    return result.welcomeShown;
  }

  async setWelcomeShown(sessionId) {
    return this._fetch(`/anon/welcome/${sessionId}`, 'POST');
  }

  async _fetch(url, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        }
      };
      if (body) options.body = JSON.stringify(body);

      console.log(`[DEBUG] 🌐 FETCH: ${method} ${url}`);
      const res = await fetch(`${API_BASE}${url}`, options);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
        const errorMsg = error.error || `HTTP ${res.status}`;
        console.error(`[DEBUG] ❌ FETCH ERROR: ${res.status}`, error);
        
        if (res.status === 401) {
          ToastNotification.warning("Tu sesión expiró. Volvé a iniciar sesión.");
          localStorage.removeItem('authToken');
          localStorage.removeItem('user-info');
          window.location.reload();
          throw new Error(errorMsg);
        }
        
        if (res.status === 400) {
          ToastNotification.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        throw new Error(errorMsg);
      }
      const data = await res.json();
      console.log(`[DEBUG] 📥 FETCH SUCCESS: ${url}`, data);
      return data;
    } catch (error) {
      console.error(`Error en ${method} ${url}:`, error);
      if (!error.message?.includes('401') && !error.message?.includes('cancelled')) {
        const networkErr = String(error).toLowerCase();
        if (networkErr.includes('failed to fetch') || networkErr.includes('networkerror') || networkErr.includes('abort')) {
          ToastNotification.error("Sin conexión. Verificá tu red e intentá de nuevo.");
        }
      }
      throw error;
    }
  }

  async _fetchAndCache(url, cacheKey) {
    const data = await this._fetch(url);
    if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  }

  clearCache() {
    localStorage.removeItem('conversations:cache');
    const keys = Object.keys(localStorage).filter(k => k.startsWith('conv:'));
    keys.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('config:cache');
    localStorage.removeItem('user:cache');
  }
}

export const storageService = new StorageService();