export class Request {
    constructor(url, data, options = {}) {
        this.url = url;
        this.data = data;
        this.abortController = null;
        this.isCancelled = false;
        this.options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(this.data),
            ...options
        };
        this.credentials = true;
    }

    async petition() {
        if (this.isCancelled) {
            throw new Error('Request cancelled');
        }
        
        this.abortController = new AbortController();
        
        try {
            const config = {
                method: this.options.method,
                headers: this.options.headers,
                credentials: this.credentials ? 'include' : 'omit',
                body: this.options.method !== 'GET' ? this.options.body : undefined,
                signal: this.abortController.signal
            };

            const response = await fetch(this.url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError' || error.message.includes('cancel')) {
                this.isCancelled = true;
                throw new Error('Request cancelled');
            }
            console.error("Error en la petición:", error);
            throw error;
        }
    }

    cancel() {
        if (this.abortController && !this.isCancelled) {
            this.abortController.abort();
            this.isCancelled = true;
            console.log('Petición cancelada');
        }
    }

    static async get(url) {
        const request = new Request(url, null, { method: "GET" });
        request.options.body = undefined;
        return request.petition();
    }
}