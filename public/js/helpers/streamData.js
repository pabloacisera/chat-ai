/**
 * Efecto typewriter que maneja HTML correctamente
 * con detección de scroll por parte del usuario
 */
export class StreamEffect {
    constructor(options = {}) {
        this.defaultSpeed = options.speed || 8;
        this.isCancelled = false;
        this.userScrollingUp = false;
        this.lastScrollTop = 0;
    }
    
    async write(text, container, options = {}) {
        const speed = options.speed || this.defaultSpeed;
        const scrollContainer = options.scrollContainer || null;
        
        this.isCancelled = false;
        this.userScrollingUp = false;
        this.lastScrollTop = 0;
        
        // Limpiar contenedor
        container.innerHTML = '';
        
        // Si es texto plano (sin HTML), agregar directamente
        // Si tiene HTML, procesarlo para mostrar progresivamente
        if (!text.includes('<') && !text.includes('>')) {
            // Texto plano - escribir carácter por carácter
            return this._writePlainText(text, container, speed, scrollContainer);
        } else {
            // Tiene HTML - escribir de forma progresiva
            return this._writeHTMLProgressive(text, container, speed, scrollContainer);
        }
    }
    
    async _writePlainText(text, container, speed, scrollContainer) {
        return new Promise((resolve, reject) => {
            let index = 0;
            
            const writeNext = () => {
                if (this.isCancelled) {
                    reject(new Error('Stream cancelled'));
                    return;
                }
                
                if (index < text.length) {
                    container.textContent += text.charAt(index);
                    index++;
                    this._scroll(scrollContainer, container);
                    setTimeout(writeNext, speed);
                } else {
                    resolve();
                }
            };
            
            writeNext();
        });
    }
    
    async _writeHTMLProgressive(htmlText, container, speed, scrollContainer) {
        return new Promise((resolve, reject) => {
            const segments = this._parseHTMLSegments(htmlText);
            let segmentIndex = 0;
            
            // Configurar detector de scroll del usuario
            let scrollTimeout = null;
            const setupScrollDetection = () => {
                if (!scrollContainer) return;
                
                const handleScroll = () => {
                    const currentTop = scrollContainer.scrollTop;
                    
                    // Si el usuario hace scroll hacia arriba
                    if (currentTop < this.lastScrollTop - 5) {
                        this.userScrollingUp = true;
                    }
                    
                    this.lastScrollTop = currentTop;
                    
                    // Resetear después de que el usuario deje de hacer scroll
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(() => {
                        this.userScrollingUp = false;
                    }, 1000);
                };
                
                scrollContainer.addEventListener('scroll', handleScroll);
            };
            
            setupScrollDetection();
            
            const writeNextSegment = () => {
                if (this.isCancelled) {
                    reject(new Error('Stream cancelled'));
                    return;
                }
                
                if (segmentIndex < segments.length) {
                    const segment = segments[segmentIndex];
                    
                    if (segment.isTag) {
                        container.innerHTML += segment.content;
                    } else {
                        this._writeTextSegment(container, segment.content, speed, scrollContainer, () => {
                            segmentIndex++;
                            writeNextSegment();
                        });
                        return;
                    }
                    
                    segmentIndex++;
                    this._scroll(scrollContainer, container);
                    setTimeout(writeNextSegment, speed);
                } else {
                    resolve();
                }
            };
            
            writeNextSegment();
        });
    }
    
    _writeTextSegment(container, text, speed, scrollContainer, callback) {
        let index = 0;
        
        const writeNext = () => {
            if (this.isCancelled) {
                callback();
                return;
            }
            
            if (index < text.length) {
                container.appendChild(document.createTextNode(text.charAt(index)));
                index++;
                this._scroll(scrollContainer, container);
                setTimeout(writeNext, speed / 2);
            } else {
                callback();
            }
        };
        
        writeNext();
    }
    
    _parseHTMLSegments(html) {
        const segments = [];
        const regex = /(<[^>]+>)|([^<]+)/g;
        let match;
        
        while ((match = regex.exec(html)) !== null) {
            if (match[1]) {
                segments.push({ isTag: true, content: match[1] });
            } else if (match[2] && match[2].trim()) {
                segments.push({ isTag: false, content: match[2] });
            }
        }
        
        return segments;
    }
    
    _scroll(scrollContainer, container) {
        // Solo hacer scroll si el usuario NO está haciendo scroll hacia arriba
        if (this.userScrollingUp) return;
        
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        } else {
            container.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }
    
    cancel() {
        this.isCancelled = true;
    }
}

export const typewriterEffect = async (text, container, options = {}) => {
    const stream = new StreamEffect({ speed: options.speed || 8 });
    return stream.write(text, container, options);
};