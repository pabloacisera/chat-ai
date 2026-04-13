# TODO List

## Alta prioridad
- [ ] Crear sistema de almacenamiento con SQLite

## Media prioridad
- [ ] 

## Hecho
- [x] Inicializar proyecto
- [x] Configurar .env
- [x] Crear y ejecutar el docker-compose.yml


*** efecto maquina de escribir ***
```// En tu frontend (React/Vanilla JS)
let fullResponse = ""; // La respuesta completa que llega de n8n
let displayText = "";
let index = 0;

function typeWriter() {
    if (index < fullResponse.length) {
        displayText += fullResponse.charAt(index);
        updateMessageDisplay(displayText);
        index++;
        setTimeout(typeWriter, 30); // 30ms por caracter
    }
}

// Cuando llega la respuesta de n8n
fetch('/webhook-endpoint', { method: 'POST', body: data })
    .then(res => res.json())
    .then(data => {
        fullResponse = data.message;
        typeWriter(); // Iniciar el efecto
    });
    ```