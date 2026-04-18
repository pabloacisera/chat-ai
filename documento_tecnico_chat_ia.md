# Documento Técnico — Chat Multi-Modelo con IA

**Versión**: 2.0 (ajustado a especificaciones del propietario)  
**Stack**: HTML/CSS/JS plano · Express (Node.js) · PostgreSQL (Prisma) · Redis · SQLite (historial archivado) · Docker

---

## 1. CONTEXTO DEL PROYECTO ACTUAL

Aplicación de chat con IA que permite trabajar con múltiples modelos configurables (actualmente usa Gemini, pero la arquitectura debe soportar cualquier proveedor).

**Tecnología actual**:
- Frontend: HTML, CSS, JavaScript plano
- Backend: Express (Node.js) — `packages/api-express`
- Persistencia actual: 100% localStorage (conversaciones, mensajes, config, tema)
- Autenticación: No existe (a implementar)

---

## 2. MODELO DE CONFIGURACIÓN DE MODELOS DE IA

### 2.1 Estados de un modelo

Un modelo tiene dos estados posibles:

- **No configurado**: no tiene API key registrada. No puede usarse para chatear.
- **Configurado**: tiene al menos una API key registrada. Puede seleccionarse para trabajar.

### 2.2 Reglas de configuración

- El único campo **obligatorio** para que un modelo se considere configurado es la `apiKey`.
- Campos opcionales: `maxTokens`, `systemPrompt`, `temperature`, y otros parámetros del proveedor.
- Al iniciar la app, si no hay ningún modelo configurado, se debe guiar al usuario a registrar una key.
- **Una vez iniciada una conversación con un modelo, NO se puede cambiar de modelo dentro de esa misma ventana de chat.** Para cambiar de modelo, se debe iniciar una nueva conversación.

---

## 3. COMPORTAMIENTO SEGÚN ESTADO DE AUTENTICACIÓN

### 3.1 Usuario NO autenticado

- La app es completamente funcional.
- La persistencia se realiza en **Redis con TTL de 24 horas**.
- La sesión anónima se identifica por un token temporal guardado en localStorage (`anonSessionId`).
- **Al iniciar la app por primera vez** (sin `anonSessionId` en localStorage), se muestra un **toast de bienvenida** (ya existe el componente diseñado) informando:
  > "Estás usando la app sin cuenta. Tu historial se guardará por 24 horas. Registrate para no perder tus conversaciones."
- No se muestra este toast en visitas posteriores (se controla con un flag en localStorage: `welcomeToastShown`).

### 3.2 Usuario autenticado

- La fuente de verdad es **siempre la base de datos** (PostgreSQL).
- localStorage actúa como **caché de arranque** (ver sección 5).
- Las configuraciones, modelos elegidos y keys se persisten en BD.
- Los datos sensibles (API keys) se encriptan antes de guardarse.

---

## 4. LÍMITE DE CONVERSACIONES Y GESTIÓN DE ARCHIVO

### 4.1 Límite máximo

- Un usuario autenticado puede tener un máximo de **100 conversaciones activas**.
- Al alcanzar las 100, se muestra un **toast de advertencia** solicitando que archive o elimine conversaciones antes de crear una nueva.

### 4.2 Sección de gestión en configuración

Se debe agregar una sección **"Gestionar conversaciones"** dentro de la pantalla de configuración con las siguientes opciones:

**Eliminar conversaciones**
- Opción: eliminar todas, o seleccionar algunas.
- Si selecciona "algunas": aparece una lista de todas las conversaciones con checkboxes. El usuario puede seleccionar una por una o "seleccionar todas".
- **Al "eliminar"**: NO se borra el registro físicamente. Se actualiza el flag `isDeleted = true` en la base de datos. Los datos nunca se pierden.

**Archivar conversaciones**
- Misma lógica de selección que eliminar.
- **Al "archivar"**: los datos se mueven a una base de datos **SQLite separada** que funciona como historial de largo plazo.
- Los datos archivados tampoco se borran físicamente: tienen su propio flag `isArchived = true`.
- Las conversaciones archivadas no cuentan para el límite de 100.

---

## 5. FLUJO DE PERSISTENCIA Y SINCRONIZACIÓN

### 5.1 Principio rector

> **localStorage nunca es fuente de verdad para usuarios autenticados. Es solo caché de arranque.**  
> Para usuarios anónimos, Redis es la fuente de verdad con TTL de 24hs.  
> localStorage puede guardar configuraciones y datos de usuario para acceso rápido, pero siempre sincronizados con la base de datos.

### 5.2 Al cargar la aplicación (o recargar la página)

```
1. Leer token de autenticación (si existe en localStorage)

SI hay usuario autenticado:
  → Fetch a la API:
      GET /users/me          → datos del usuario
      GET /users/config      → configuración (modelos, tema, tokens, etc.)
      GET /conversations?limit=50&offset=0  → últimas 50 conversaciones (solo títulos/ids, sin mensajes)
  → Guardar TODO en localStorage como caché
  → Renderizar lista de conversaciones

SI NO hay usuario autenticado:
  → Leer anonSessionId de localStorage
  → Si no existe: crear sesión anónima (POST /anon/session → Redis)
                  mostrar toast de bienvenida (si welcomeToastShown !== true)
                  guardar anonSessionId y welcomeToastShown=true en localStorage
  → Fetch a Redis via API: GET /anon/conversations/:sessionId
  → Renderizar lista de conversaciones anónimas
```

### 5.3 Al hacer clic en una conversación

```
SI usuario autenticado:
  → Fetch: GET /conversations/:id/messages
  → Renderizar mensajes
  → Guardar mensajes en localStorage como caché

SI usuario NO autenticado:
  → Los mensajes ya están en Redis, fetch: GET /anon/conversations/:sessionId/:convId/messages
  → Renderizar mensajes
```

### 5.4 Al enviar un nuevo mensaje

```
SI usuario autenticado:
  → POST /messages  (conversationId, content, modelId)
  → La API guarda el mensaje del usuario en BD
  → La API llama al modelo de IA y guarda la respuesta en BD
  → La respuesta se devuelve al frontend
  → Actualizar localStorage (caché)

SI usuario NO autenticado:
  → POST /anon/messages  (sessionId, convId, content, modelId)
  → La API guarda en Redis (TTL 24hs)
  → Devuelve la respuesta al frontend
  → Actualizar localStorage con referencia
```

### 5.5 Al cambiar configuración (tema, modelo, tokens, etc.)

```
1. Guardar inmediatamente en localStorage (UI responsiva)
2. SI usuario autenticado: PATCH /users/config  (sincronizar con BD)
3. SI usuario NO autenticado: PATCH /anon/config/:sessionId (sincronizar con Redis)
```

### 5.6 Al autenticarse (login / register)

```
1. Si había sesión anónima con datos:
   → POST /sync/migrate  (enviar anonSessionId)
   → La API migra conversaciones, mensajes y config anónimos a la BD del usuario
   → Evita duplicados usando IDs temporales como referencia
2. Limpiar localStorage antiguo
3. Repoblar localStorage con datos de la BD (flujo del punto 5.2)
4. Eliminar sesión anónima de Redis
```

### 5.7 Carga paginada de conversaciones

- Al inicio solo se cargan las **últimas 50 conversaciones** (solo metadatos: id, título, fecha, modelId).
- Los mensajes de una conversación se cargan **solo cuando el usuario hace clic** en ella.
- Si hay más de 50 conversaciones, se implementa scroll infinito o botón "cargar más" con paginación `?limit=50&offset=N`.

---

## 6. MODELOS PRISMA (PostgreSQL)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  isDeleted     Boolean        @default(false)
  sessions      Session[]
  conversations Conversation[]
  config        UserConfig?
  modelConfigs  ModelConfig[]
  migrationLog  MigrationLog[]
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

model ModelConfig {
  id           String   @id @default(uuid())
  userId       String
  modelId      String   // ej: "gemini-pro", "gpt-4", "claude-3"
  provider     String   // ej: "google", "openai", "anthropic"
  apiKeyEnc    String   // API key encriptada
  maxTokens    Int?
  temperature  Float?
  systemPrompt String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id])

  @@unique([userId, modelId])
}

model UserConfig {
  id             String   @id @default(uuid())
  userId         String   @unique
  theme          String   @default("system") // "light" | "dark" | "system"
  activeModelId  String?  // modelId actualmente seleccionado
  language       String   @default("es")
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id])
}

model Conversation {
  id          String    @id @default(uuid())
  userId      String
  title       String
  modelId     String    // modelo con el que se inició (no cambia)
  provider    String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  isDeleted   Boolean   @default(false)
  isArchived  Boolean   @default(false)
  messages    Message[]
  user        User      @relation(fields: [userId], references: [id])
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  role           String       // "user" | "assistant"
  content        String
  createdAt      DateTime     @default(now())
  isDeleted      Boolean      @default(false)
  conversation   Conversation @relation(fields: [conversationId], references: [id])
}

model MigrationLog {
  id           String   @id @default(uuid())
  userId       String
  anonSessionId String
  migratedAt   DateTime @default(now())
  convCount    Int
  messageCount Int
  status       String   // "success" | "partial" | "failed"
  user         User     @relation(fields: [userId], references: [id])
}
```

---

## 7. BASE DE DATOS SQLite — HISTORIAL ARCHIVADO

Base de datos separada, solo para conversaciones archivadas. Se comunica a través de su propio servicio/endpoint.

```sql
-- archive.db (SQLite)

CREATE TABLE archived_conversations (
  id TEXT PRIMARY KEY,
  original_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  archived_at TEXT NOT NULL,
  original_created_at TEXT NOT NULL
);

CREATE TABLE archived_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES archived_conversations(id)
);
```

---

## 8. REDIS — SESIONES ANÓNIMAS

Estructura de claves en Redis para usuarios no autenticados:

```
anon:{sessionId}:meta           → { createdAt, welcomeShown }       TTL: 24hs
anon:{sessionId}:config         → { theme, activeModelId, ... }     TTL: 24hs
anon:{sessionId}:conversations  → [ { id, title, modelId, date } ]  TTL: 24hs
anon:{sessionId}:conv:{convId}  → { messages: [...] }               TTL: 24hs
```

---

## 9. ENDPOINTS API REST

### Autenticación
```
POST   /auth/register         Registro de usuario
POST   /auth/login            Login, devuelve JWT
POST   /auth/logout           Invalida sesión
GET    /auth/me               Verifica token y devuelve usuario
```

### Usuario y configuración
```
GET    /users/me              Datos del usuario autenticado
PATCH  /users/config          Actualiza configuración (tema, modelo activo, etc.)
GET    /users/config          Obtiene configuración completa
```

### Configuración de modelos de IA
```
GET    /models                Lista modelos configurados del usuario
POST   /models                Agrega/configura un nuevo modelo (requiere apiKey)
PATCH  /models/:modelId       Actualiza config de un modelo (tokens, temp, systemPrompt)
DELETE /models/:modelId       Desactiva un modelo (isActive = false)
```

### Conversaciones
```
GET    /conversations?limit=50&offset=0    Lista de conversaciones (solo metadatos)
POST   /conversations                      Crea nueva conversación (asigna modelId)
GET    /conversations/:id/messages         Obtiene mensajes de una conversación
PATCH  /conversations/:id                  Actualiza título
DELETE /conversations/:id                  Soft delete (isDeleted = true)
POST   /conversations/archive              Archiva conversaciones seleccionadas
POST   /conversations/archive/all          Archiva todas
POST   /conversations/delete/bulk          Soft delete en lote
GET    /conversations/count                Cantidad de conversaciones activas (para límite 100)
```

### Mensajes
```
POST   /messages              Envía mensaje, llama al modelo, guarda user + assistant
```

### Sesiones anónimas (Redis)
```
POST   /anon/session                           Crea sesión anónima
GET    /anon/conversations/:sessionId          Lista conversaciones anónimas
POST   /anon/conversations/:sessionId          Crea conversación anónima
GET    /anon/conversations/:sessionId/:convId/messages   Mensajes de conversación anónima
POST   /anon/messages                          Envía mensaje anónimo
PATCH  /anon/config/:sessionId                 Actualiza config anónima
```

### Sincronización / Migración
```
POST   /sync/migrate          Migra datos anónimos a la cuenta del usuario al hacer login
```

### Historial archivado (SQLite)
```
GET    /archive/conversations          Lista conversaciones archivadas
GET    /archive/conversations/:id/messages   Mensajes de una conv archivada
```

---

## 10. ESTRUCTURA DE DIRECTORIOS — BACKEND (packages/api-express)

```
packages/api-express/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── config/
│   │   ├── db.js              (Prisma client)
│   │   ├── redis.js           (Redis client)
│   │   └── archive.js         (SQLite client - better-sqlite3)
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── models.routes.js
│   │   ├── conversations.routes.js
│   │   ├── messages.routes.js
│   │   ├── anon.routes.js
│   │   ├── sync.routes.js
│   │   └── archive.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── models.controller.js
│   │   ├── conversations.controller.js
│   │   ├── messages.controller.js
│   │   ├── anon.controller.js
│   │   ├── sync.controller.js
│   │   └── archive.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── users.service.js
│   │   ├── models.service.js
│   │   ├── conversations.service.js
│   │   ├── messages.service.js
│   │   ├── ai.service.js       (abstracción para llamar a cualquier modelo)
│   │   ├── anon.service.js
│   │   ├── sync.service.js
│   │   ├── archive.service.js
│   │   └── encryption.service.js  (encrypt/decrypt API keys)
│   └── app.js
```

---

## 11. ESTRATEGIA DE SINCRONIZACIÓN localStorage ↔ BD

### Escenarios y resolución

| Escenario | Comportamiento |
|---|---|
| **Carga inicial (autenticado)** | Fetch a la API → sobrescribir localStorage con datos de BD |
| **Carga inicial (anónimo)** | Leer localStorage para anonSessionId → fetch a Redis |
| **Offline (autenticado)** | localStorage sirve como fallback. Al reconectarse, hacer fetch completo y sobrescribir caché |
| **Conflicto localStorage vs BD** | **BD siempre gana**. Se sobrescribe localStorage en cada carga. Se puede notificar al usuario con un toast si hay divergencia detectada |
| **Login con datos anónimos** | Migrar todo a BD vía `/sync/migrate`, luego repoblar localStorage desde BD |

### Lo que SÍ se guarda en localStorage

- Token JWT (`authToken`)
- Id de sesión anónima (`anonSessionId`)
- Flag de toast de bienvenida (`welcomeToastShown`)
- Datos del usuario (`user:cache`) — como caché
- Config del usuario (`config:cache`) — como caché
- Últimas 50 conversaciones — solo metadatos (`conversations:cache`)
- Mensajes de conversaciones visitadas recientemente (`conv:{id}:cache`)
- Tema activo (para aplicar antes de que cargue la API)

### Lo que NUNCA se guarda solo en localStorage (requiere BD o Redis)

- Mensajes completos de todas las conversaciones
- API keys (se guardan encriptadas en BD, nunca en localStorage)
- Historial completo de conversaciones (>50)

---

## 12. PLAN DE IMPLEMENTACIÓN POR FASES

### Fase 1 — Setup e infraestructura
- Instalar dependencias: `prisma`, `@prisma/client`, `bcryptjs`, `jsonwebtoken`, `ioredis`, `better-sqlite3`, `dotenv`
- Configurar variables de entorno en Docker (`.env` por servicio)
- Verificar que PostgreSQL y Redis están levantados en la red interna de Docker
- Configurar clientes: `db.js`, `redis.js`, `archive.js`

### Fase 2 — Modelos y migraciones
- Crear `schema.prisma` con todos los modelos (sección 6)
- Ejecutar `prisma migrate dev --name init`
- Crear base SQLite de archivos con el schema de la sección 7
- Crear índices necesarios (userId, conversationId, isDeleted, isArchived)

### Fase 3 — Backend: autenticación y middleware
- Implementar `auth.service.js` (register, login, logout, verify)
- Implementar `auth.middleware.js` (verificar JWT en rutas protegidas)
- Implementar `encryption.service.js` (para API keys)
- Rutas y controladores de `/auth`

### Fase 4 — Backend: CRUD de recursos principales
- Rutas, controladores y servicios para: users, models, conversations, messages
- Implementar `ai.service.js` como capa de abstracción para llamadas a distintos proveedores
- Soft delete en conversaciones y mensajes (flags `isDeleted`)
- Límite de 100 conversaciones activas (verificación en `conversations.service.js`)

### Fase 5 — Backend: sesiones anónimas (Redis)
- Implementar `anon.service.js` y `anon.controller.js`
- Crear/leer/actualizar sesiones en Redis con TTL 24hs
- Rutas `/anon/*`

### Fase 6 — Backend: migración y archivado
- Implementar `sync.service.js` (migrar datos anónimos al hacer login)
- Implementar `archive.service.js` (mover conversaciones a SQLite)
- Rutas `/sync/migrate` y `/archive/*`

### Fase 7 — Frontend: StorageService y flujo de arranque
- Crear clase `StorageService` que abstrae localStorage vs API según autenticación
- Modificar el arranque de la app (`app startup`) siguiendo el flujo de la sección 5
- Implementar lógica de toast de bienvenida para usuarios anónimos
- Implementar toast de límite de 100 conversaciones

### Fase 8 — Frontend: pantalla de gestión de conversaciones
- Agregar sección "Gestionar conversaciones" en configuración
- Lista con checkboxes de selección
- Acciones: archivar seleccionadas, archivar todas, eliminar seleccionadas, eliminar todas
- Reflejar cambios en tiempo real en la UI

### Fase 9 — Testing
- Unit tests por servicio (Jest)
- Integration tests: flujo anónimo → login → migración → recarga
- Test de límite de 100 conversaciones
- Test de archivado y soft delete

---

## 13. CÓDIGO CLAVE A IMPLEMENTAR

### auth.middleware.js
```javascript
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
```

### sync.service.js (fragmento principal)
```javascript
async function migrateAnonData(userId, anonSessionId, redisClient, prisma) {
  const convKey = `anon:${anonSessionId}:conversations`;
  const conversations = JSON.parse(await redisClient.get(convKey) || '[]');

  const results = { migrated: 0, messages: 0 };

  for (const conv of conversations) {
    const msgKey = `anon:${anonSessionId}:conv:${conv.id}`;
    const messages = JSON.parse(await redisClient.get(msgKey) || '[]');

    const created = await prisma.conversation.create({
      data: {
        userId,
        title: conv.title,
        modelId: conv.modelId,
        provider: conv.provider,
        createdAt: new Date(conv.createdAt),
        messages: {
          create: messages.map(m => ({
            role: m.role,
            content: m.content,
            createdAt: new Date(m.createdAt),
          }))
        }
      }
    });

    results.migrated++;
    results.messages += messages.length;
  }

  // Limpiar sesión anónima de Redis
  await redisClient.del(`anon:${anonSessionId}:conversations`);
  await redisClient.del(`anon:${anonSessionId}:config`);
  await redisClient.del(`anon:${anonSessionId}:meta`);

  return results;
}
```

### StorageService (frontend)
```javascript
class StorageService {
  constructor() {
    this.isAuthenticated = !!localStorage.getItem('authToken');
  }

  async getConversations() {
    if (this.isAuthenticated) {
      const cached = localStorage.getItem('conversations:cache');
      if (cached) return JSON.parse(cached); // usar caché mientras carga
      return this._fetchAndCache('/conversations?limit=50');
    } else {
      const sessionId = localStorage.getItem('anonSessionId');
      return this._fetchAndCache(`/anon/conversations/${sessionId}`);
    }
  }

  async getMessages(conversationId) {
    if (this.isAuthenticated) {
      const cached = localStorage.getItem(`conv:${conversationId}:cache`);
      if (cached) return JSON.parse(cached);
      return this._fetchAndCache(`/conversations/${conversationId}/messages`, `conv:${conversationId}:cache`);
    } else {
      const sessionId = localStorage.getItem('anonSessionId');
      return this._fetchAndCache(`/anon/conversations/${sessionId}/${conversationId}/messages`);
    }
  }

  async sendMessage(conversationId, content) {
    const endpoint = this.isAuthenticated ? '/messages' : '/anon/messages';
    const body = this.isAuthenticated
      ? { conversationId, content }
      : { sessionId: localStorage.getItem('anonSessionId'), convId: conversationId, content };
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...this._authHeaders() }, body: JSON.stringify(body) });
    return res.json();
  }

  async syncConfig(config) {
    localStorage.setItem('config:cache', JSON.stringify(config));
    if (this.isAuthenticated) {
      await fetch('/users/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...this._authHeaders() }, body: JSON.stringify(config) });
    } else {
      const sessionId = localStorage.getItem('anonSessionId');
      await fetch(`/anon/config/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    }
  }

  async _fetchAndCache(url, cacheKey) {
    const res = await fetch(url, { headers: this._authHeaders() });
    const data = await res.json();
    if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  }

  _authHeaders() {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
```

---

## 14. CONSIDERACIONES DOCKER

- Frontend: puerto 80 expuesto (único punto de entrada del usuario)
- API Express: solo accesible por red interna Docker (no exponer al exterior, salvo testing)
- PostgreSQL: red interna Docker
- Redis: red interna Docker
- SQLite (archivo archive.db): montado como volumen en el contenedor de la API
- Variables de entorno en `docker-compose.yml` con `.env` separado por entorno

---

## 15. NOTAS IMPORTANTES

1. **API keys de modelos**: nunca se guardan en localStorage. Se guardan encriptadas en la BD. El frontend nunca las recibe en texto plano; solo recibe confirmación de que existe una key configurada.
2. **Cambio de modelo en conversación activa**: prohibido. El `modelId` se asigna al crear la conversación y es inmutable.
3. **Soft delete vs delete real**: ningún dato se borra físicamente. Siempre se usan flags (`isDeleted`, `isArchived`). Las consultas siempre filtran `isDeleted: false`.
4. **Paginación**: la carga inicial trae las últimas 50 conversaciones. Para ver más se usa paginación explícita.
5. **Toast de bienvenida**: se dispara solo una vez para sesiones anónimas nuevas, controlado por el flag `welcomeToastShown` en localStorage.
6. **Toast de límite**: se dispara cuando el usuario autenticado alcanza las 100 conversaciones activas (sin `isDeleted` ni `isArchived`).
