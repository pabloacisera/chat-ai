const STORAGE_KEY = "user-info";

class UserService {
    constructor() {
        this.userInfo = [];
        this.init();
    }

    // Centralizamos la carga inicial
    init() {
        this.userInfo = this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return [];

            const parsed = JSON.parse(data);
            // Aseguramos que siempre sea un array para mantener consistencia
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (error) {
            console.error("Error leyendo desde localStorage:", error);
            return []; // Retornamos array vacío si el JSON está corrupto
        }
    }

    // Guarda el estado actual de la clase en el storage
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.userInfo));
        } catch (error) {
            console.error("Error guardando en localStorage:", error);
        }
    }

    // Obtener todos los datos
    getAll() {
        return [...this.userInfo]; // Retornamos una copia para evitar mutaciones externas
    }

    // Método de ayuda para añadir información y guardar automáticamente
    add(info) {
        this.userInfo.push(info);
        this.save();
    }

    // Limpiar datos
    clear() {
        this.userInfo = [];
        localStorage.removeItem(STORAGE_KEY);
    }
}

export const userService = new UserService();