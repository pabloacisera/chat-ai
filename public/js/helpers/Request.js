export class Request {
    constructor(url, data, options = {}) {
        this.url = url;
        this.data = data;
        // Valores por defecto si no se pasan options
        this.options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(this.data),
            ...options  // Sobrescribe con lo que pase el usuario
        };
        this.credentials = true;
    }

    async petition() {
        try {
            const config = {
                method: this.options.method,
                headers: this.options.headers,
                credentials: this.credentials ? 'include' : 'omit',
                body: this.options.method !== 'GET' ? this.options.body : undefined
            };

            const response = await fetch(this.url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("Error en la petición:", error);
            throw error;
        }
    }

    // Método GET estático por si lo necesitás
    static async get(url) {
        const request = new Request(url, null, { method: "GET" });
        request.options.body = undefined;  // GET no lleva body
        return request.petition();
    }
}