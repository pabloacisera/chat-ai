# Arquitectura del Frontend - Chat IA

## Vision General

```
public/js/
├── index.js              ← Entry point (ChatApp)
├── services/            ← Logica de negocio
│   ├── ConversationService.js
│   ├── SidebarRenderer.js
│   └── ChatRenderer.js
├── helpers/             ← Utilidades externas
│   ├── streamData.js
│   └── Request.js
├── components          ← Web Components
│   └── DeleteConversation.js
└── utils             ← Funciones utilitarias
    └── date.js
```

## Capas y Responsabilidades

### 1. Entry Point: `index.js`

**Archivo:** `ChatApp` — Coordina todos los servicios.

**Responsabilidades:**
- Inicializar la aplicacion
- Bind events del DOM
- Manejar flujos principales (nueva conversacion, enviar mensaje, etc.)
- Orquestar los renders

**Cuando modificar:**
- Agregar nuevas funcionalidades principales
- Cambiar flujos de usuario

### 2. Servicios (`services/`)

#### ConversationService.js
Gestiona el estado de las conversaciones.

```javascript
// Métodos disponibles
- load()           → Carga desde localStorage
- save()          → Guarda en localStorage
- getAll()        → Retorna todas las conversaciones
- getById(id)     → Busca por ID
- create(title, date) → Crea nueva conversación
- delete(id)      → Elimina conversación
- addMessage(id, message) → Agrega mensaje
- updateTitle(id, title) → Actualiza título
- setCurrent(id)   → Selecciona conversación actual
- getCurrentId() → Obtiene ID actual
```

#### SidebarRenderer.js
Renderiza la lista de conversaciones en el aside.

```javascript
// Métodos
- render(conversations) → Renderiza toda la lista
- renderEmpty()       → Renderiza estado vacío
- setCurrentId(id)   → Marca conversa activa
```

#### ChatRenderer.js
Renderiza el área de chat principal.

```javascript
// Métodos
- render(conversation)     → Renderiza chat
- clear()              → Limpia contenido
- getMessagesDisplay()  → Retorna contenedor de mensajes
- setTyping()          → Muestra spinner de "escribiendo"
- hideTyping()         → Oculta spinner
- addUserMessage(text) → Agrega mensaje de usuario
- addBotMessage()     → Agrega mensaje de bot
- updateTitle(title)   → Actualiza título del chat
- updateSendButton(action) → Cambia botón enviar/stop
- getAction()        → Retorna acción actual
- getInput()        → Retorna input del mensaje
- clearInput()       → Limpia input
```

### 3. Componentes (`components/`)

Web Components reutilizables. Cada componente:
- Es un custom element (`<delete-modal>`)
- Usa Shadow DOM para estilos encapsulados
- Emite eventos customs

```javascript
// Uso del modal de borrar
const modal = document.createElement("delete-modal");
document.body.appendChild(modal);

modal.addEventListener("confirm-delete", () => {
    // Lógica cuando confirma
});
```

### 4. Helpers (`helpers/`)

Librerías externas o utilidades de terceros:
- `streamData.js` — Efecto typewriter
- `Request.js` — Peticiones HTTP con AbortController

### 5. Utils (`utils/`)

Funciones pequeñas y reutilizables:
- `formatDateFriendly(date)` — Formatea fecha
- `generateId()` — Genera ID único

## Cómo Agregar Nuevos Elementos

### Caso 1: Nuevo botón en el header/footer del aside

1. **HTML:** Ya está en `index.html`
2. **CSS:** Agregar estilos en `root.css` o `aside.css`
3. **JS:** Agregar event listener en `bindEvents()`

```javascript
// En index.js, dentro de bindEvents()
if (nuevoBoton) {
    nuevoBoton.addEventListener("click", () => {
        // Tu lógica
    });
}
```

### Caso 2: Nueva funcionalidad de conversación

1. **Lógica:** Agregar en `ConversationService.js`
2. **Renderizado:** Modificar `SidebarRenderer.js` o `ChatRenderer.js`
3. **Orquestación:** LLamar desde `ChatApp` en `index.js`

### Caso 3: Nuevo componente UI

1. **Crear archivo:** `components/NuevoComponente.js`
2. **Estructura:**
```javascript
const template = document.createElement("template");
template.innerHTML = `
    <style>...</style>
    <div class="content">...</div>
`;

export class NuevoComponente extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }
}

customElements.define("nuevo-componente", NuevoComponente);
```

3. **Importar en index.js**
4. **Usar en el DOM:** `<nuevo-componente></nuevo-componente>`

### Caso 4: Modificar cómo se muestra un mensaje

1. **Buscar en `ChatRenderer.js`:**
   - `render()` para estructura
   - `addUserMessage()`, `addBotMessage()` para contenido

2. **CSS:** Modificar clases en `root.css`:
   - `.text-msj`
   - `.user-message`
   - `.ai-message`

### Caso 5: Agregar nuevo servicio

1. **Crear archivo:** `services/NuevoServicio.js`
2. **Estructura:**
```javascript
export class NuevoServicio {
    constructor() {
        // Inicialización
    }
    
    // Métodos
}
```

3. **Importar en `index.js`:**
```javascript
import { NuevoServicio } from "./services/NuevoServicio.js";
```

4. **Usar en `ChatApp`:**
```javascript
this.nuevoServicio = new NuevoServicio();
```

## Patrones de Diseño

### Inmutabilidad
Sempre criar novos objetos/arrays en vez de mutar os existentes.

```javascript
// ❌ Mal
conversations.push(newConv);

// ✅ Bien
const updated = [...conversations, newConv];
this.conversations = updated;
```

### Separación concerns
- **Lógica de estado** → Services
- **Presentaciñ** → Renderers
- **Coordinaciñ** → ChatApp

### Nomenclatura
- **Archivos:** camelCase (`ChatRenderer.js`)
- **Clases:** PascalCase (`ChatRenderer`)
- **Métodos:** camelCase (`renderChat()`)
- **Eventos:** kebab-case (`confirm-delete`)

## Testing

Para verificar que todo funciona:
```bash
# Abrir en navegador
# 1. Crear nueva conversación
# 2. Enviar mensaje
# 3. Verificar respuesta en stream
# 4. Borrar conversación
# 5. Verificar persistencia en localStorage
```

## Guia: Como Agregar Cosas Nuevas

Cada cosa nueva se conecta a algo que ya existe. Esta guia te muestra los puntos de conexion.

---

### 1. Agregar accion a un boton existente

El boton ya esta en el HTML. Vos tenes que conectarlo a `ChatApp`.

```
index.html        ->     index.js (ChatApp)
btn-profile  -> bindEvents() -> handleProfile()
btn-settings -> bindEvents() -> handleSettings()
```

**Pasos:**

1. En `bindEvents()` agregar el event listener
2. Crear el metodo handler

```javascript
// EN bindEvents()
const profileBtn = document.getElementById("btn-profile");
if (profileBtn) {
    profileBtn.addEventListener("click", () => this.handleProfile());
}

// NUEVO METODO en ChatApp
handleProfile() {
    this.userService.logout();
    this.sidebarRenderer.render(this.conversationService.getAll());
}
```

**Regla:** `bindEvents()` para binding, handler para logica.

---

### 2. Crear un nuevo servicio

Un servicio se conecta a `ChatApp` para manejar estado.

```
MiServicio.js  ->  ChatApp (constructor)  -> ChatApp (metodos)
```

**Pasos:**

1. Crear `services/MiServicio.js`
2. Importar en `index.js`
3. Instanciar en el `constructor()`
4. Usar en los metodos de `ChatApp`

```javascript
// ARRIBA de index.js
import { UserService } from "./services/UserService.js";

// EN ChatApp constructor
this.userService = new UserService();

// EN init()
this.userService.load();
```

---

### 3. Crear un nuevo renderer

Un renderer se conecta a `ChatApp` y recibe datos de servicios.

```
MiRenderer.js  ->  ChatApp (init)  ->  elementContainer
                                    |
                                    v
                            (datos de servicios)
```

**Pasos:**

1. Crear `services/MiRenderer.js`
2. Importar en `index.js`
3. Instanciar en `init()` pasando el elemento
4. Llamar `render(datos)` pasando datos

```javascript
// ARRIBA de index.js
import { HeaderRenderer } from "./services/HeaderRenderer.js";

// EN init()
const container = document.querySelector(".header");
this.headerRenderer = new HeaderRenderer(container);
this.headerRenderer.render(this.userService.getUser());
```

---

### 4. Crear un nuevo componente

Un componente se conecta a cualquier metodo de `ChatApp` que lo use.

```
MiComponente.js  ->  ChatApp (metodo que lo crea)  ->  eventos del componente
                                                     |
                                                     v
                                            (actualizar otros servicios)
```

**Pasos:**

1. Crear `components/MiComponente.js`
2. En el metodo de ChatApp que lo usa, crearlo y escuchar sus eventos
3. Conectar los eventos a servicios existentes

```javascript
// EN cualquier metodo de ChatApp
const modal = document.createElement("mi-componente");
document.body.appendChild(modal);

modal.addEventListener("confirm", () => {
    this.conversationService.save();
    this.sidebarRenderer.render(this.conversationService.getAll());
});
```

---

### Resumen Visual: Puntos de Conexion

```
QUE CREO          →  DONDE LO CONECTO          →  COMO
─────────────────────────────────────────────────────────────────
Nuevo servicio   →  constructor()             →  this.servicio = new Servicio()
Nuevo renderer  →  init()                   →  this.renderer = new Renderer(elemento)
Nuevo evento    →  bindEvents()            →  elemento.addEventListener(...)
Nuevo componente→  cualquier metodo        →  document.createElement(...)
```

### Resumen: Donde va cada cosa

| Que necesito | Donde va |
|------------|---------|
| Agregar accion a boton existente | `index.js` en `bindEvents()` + metodo handler |
| Nuevo servicio/logica | `services/NuevoServicio.js` |
| Nuevo elemento UI reutilizable | `components/NuevoComponente.js` |
| Nueva seccion de render | `services/NuevoRenderer.js` |
| Estilos | `root.css` o `aside.css` |
| HTML estructural | `index.html` |
| Modificar mensajes del chat | `ChatRenderer.js` |
| Modificar lista conversaciones | `SidebarRenderer.js` |
| Modificar estado | `ConversationService.js` |

---

## Notas

- Estado global: `ConversationService` lo maneja
- Renderizado: Reactivo manual (no hay framework)
- Persistencia: `localStorage` con key `"msjData"`