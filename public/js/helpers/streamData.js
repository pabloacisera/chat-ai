/**
 * Función para simular efecto de máquina de escribir (streaming de datos)
 * @param {string} text - Texto completo a mostrar
 * @param {HTMLElement} container - Elemento contenedor donde se mostrará el texto
 * @param {Object} options - Opciones de configuración
 * @param {number} options.speed - Velocidad en ms entre cada carácter (default: 15ms para efecto rápido)
 * @param {boolean} options.preserveContent - Si debe preservar el contenido existente del contenedor (default: false)
 * @param {Function} options.onComplete - Callback al terminar de escribir
 * @returns {Promise} - Promise que se resuelve cuando termina de escribir
 */
export const typewriterEffect = async (text, container, options = {}) => {
    const {
        speed = 15,
        preserveContent = false,
        onComplete = null,
        scrollContainer = null
    } = options;

    const scrollTarget = scrollContainer || container;

    return new Promise((resolve) => {
        if (!preserveContent) {
            container.innerHTML = '';
        }
        
        let index = 0;
        
        const typeNextChar = () => {
            if (index < text.length) {
                // Usar textContent para evitar problemas con HTML
                container.textContent += text.charAt(index);
                index++;
                scrollTarget.scrollTop = scrollTarget.scrollHeight;
                setTimeout(typeNextChar, speed);
            } else {
                if (onComplete && typeof onComplete === 'function') {
                    onComplete();
                }
                resolve();
            }
        };
        
        typeNextChar();
    });
};

// Versión alternativa con cancelación y control de velocidad variable
export class StreamEffect {
    constructor(options = {}) {
        this.defaultSpeed = options.speed || 15;
        this.isCancelled = false;
    }
    
    async write(text, container, options = {}) {
        const speed = options.speed || this.defaultSpeed;
        const preserveContent = options.preserveContent || false;
        const scrollContainer = options.scrollContainer || null;
        const scrollTarget = scrollContainer || container;
        
        this.isCancelled = false;
        
        return new Promise((resolve, reject) => {
            if (!preserveContent) {
                container.textContent = '';  // Cambiado de innerHTML a textContent
            }
            
            let index = 0;
            
            const writeNext = () => {
                if (this.isCancelled) {
                    reject(new Error('Stream cancelled'));
                    return;
                }
                
                if (index < text.length) {
                    container.textContent += text.charAt(index);  // Cambiado de innerHTML a textContent
                    index++;
                    scrollTarget.scrollTop = scrollTarget.scrollHeight;
                    setTimeout(writeNext, speed);
                } else {
                    resolve();
                }
            };
            
            writeNext();
        });
    }
    
    cancel() {
        this.isCancelled = true;
    }
    
    async writeWithVariableSpeed(text, container, options = {}) {
        const {
            startSpeed = 30,
            endSpeed = 5,
            preserveContent = false,
            scrollContainer = null
        } = options;
        
        const scrollTarget = scrollContainer || container;
        
        this.isCancelled = false;
        
        return new Promise((resolve, reject) => {
            if (!preserveContent) {
                container.textContent = '';  // Cambiado de innerHTML a textContent
            }
            
            let index = 0;
            const totalLength = text.length;
            
            const writeNext = () => {
                if (this.isCancelled) {
                    reject(new Error('Stream cancelled'));
                    return;
                }
                
                if (index < totalLength) {
                    container.textContent += text.charAt(index);  // Cambiado de innerHTML a textContent
                    index++;
                    scrollTarget.scrollTop = scrollTarget.scrollHeight;
                    
                    const progress = index / totalLength;
                    const currentSpeed = startSpeed - ((startSpeed - endSpeed) * progress);
                    
                    setTimeout(writeNext, currentSpeed);
                } else {
                    resolve();
                }
            };
            
            writeNext();
        });
    }
}