const STORAGE_KEY = "user-info";
import { storageService } from './StorageService.js';

class UserService {
    constructor() {
        this.userInfo = null;
        this.init();
    }

    init() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            try {
                this.userInfo = JSON.parse(data);
            } catch (e) {
                this.userInfo = null;
            }
        }
    }

    save() {
        if (this.userInfo) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.userInfo));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    getAll() {
        return this.userInfo ? [this.userInfo] : [];
    }

    getUser() {
        return this.userInfo;
    }

    setUser(user) {
        this.userInfo = user;
        this.save();
    }

    async login(email, password) {
        const anonSessionId = localStorage.getItem('anonSessionId');
        
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(error.error);
        }
        
        const data = await res.json();
        localStorage.setItem('authToken', data.token);
        storageService.setAuthToken(data.token);
        this.userInfo = data.user;
        this.save();
        
        if (anonSessionId) {
            try {
                await storageService.migrateAnonData(anonSessionId);
                localStorage.removeItem('anonSessionId');
                storageService.clearCache();
            } catch (e) {
                console.error("Error migrando datos anónimos:", e);
            }
        }
        
        return data;
    }

    async register(email, password, name) {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(error.error);
        }
        
        const data = await res.json();
        
        const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const loginData = await loginRes.json();
        localStorage.setItem('authToken', loginData.token);
        this.userInfo = loginData.user;
        this.save();
        
        return loginData;
    }

    async logout() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (e) {}
        }
        
        localStorage.removeItem('authToken');
        localStorage.removeItem(STORAGE_KEY);
        storageService.clearAuth();
        this.userInfo = null;
    }

    async googleLogin(googleToken) {
        const anonSessionId = localStorage.getItem('anonSessionId');
        
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: googleToken })
        });
        
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(error.error);
        }
        
        const data = await res.json();
        localStorage.setItem('authToken', data.token);
        storageService.setAuthToken(data.token);
        this.userInfo = data.user;
        this.save();
        
        if (anonSessionId) {
            try {
                await storageService.migrateAnonData(anonSessionId);
                localStorage.removeItem('anonSessionId');
                storageService.clearCache();
            } catch (e) {
                console.error("Error migrando datos anónimos:", e);
            }
        }
        
        return data;
    }

    clear() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('authToken');
        storageService.clearAuth();
        this.userInfo = null;
    }

    isAuthenticated() {
        return !!localStorage.getItem('authToken') && !!this.userInfo;
    }
}

export const userService = new UserService();