# Arquitectura

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES Modules, Web Components, Shadow DOM) |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL (Prisma ORM), Redis (sesiones anónimas), SQLite (archivo histórico) |
| IA | LangChain + Google Generative AI, Mistral AI, Groq (Llama) |
| Infraestructura | Docker Compose (nginx, PostgreSQL, Redis, API Express) |
| Streaming | Server-Sent Events (SSE) con efecto typewriter |

## Diagrama

```
                     ┌──────────────────┐
                     │   nginx (80)     │
                     └────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼──────┐  ┌────▼─────┐  ┌──────▼──────┐
        │  Frontend  │  │  API     │  │  n8n (legacy)│
        │ (HTML/JS)  │  │  Express │  │             │
        └────────────┘  └────┬─────┘  └─────────────┘
                              │
                ┌─────────────┼──────────────┐
                │             │              │
          ┌─────▼────┐ ┌─────▼────┐  ┌──────▼─────┐
          │PostgreSQL│ │  Redis   │  │   SQLite   │
          │(auth)    │ │(anónimo) │  │(archivado) │
          └──────────┘ └──────────┘  └────────────┘
```

## Flujo de datos

- **Usuario autenticado**: PostgreSQL como fuente de verdad, localStorage como caché de arranque
- **Usuario anónimo**: Redis con TTL de 24 horas, sesión identificada por token en localStorage
- **Migración**: Al registrarse, los datos anónimos se migran a PostgreSQL vía `/api/sync/migrate`
- **Streaming**: Las respuestas de la IA se transmiten en tiempo real mediante SSE
- **Límite**: Máximo 100 conversaciones activas por usuario autenticado

## Frontend

### Componentes (Web Components nativos)

| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| `ConfigChatModal` | `components/ConfigChatModal.js` | Configuración de modelos (API keys, tokens, temperatura, system prompt) |
| `DeleteConversation` | `components/DeleteConversation.js` | Confirmación de borrado |
| `SettingsModal` | `components/SettingsModal.js` | Ajustes de interfaz (tema, stream speed, auto-título, reset) |
| `ToastNotification` | `components/ToastNotification.js` | Notificaciones toast (success, error, warning, info) |
| `UserModal` | `components/UserModal.js` | Login/register/profile |

### Servicios

| Servicio | Archivo | Propósito |
|----------|---------|-----------|
| `ChatApp` | `index.js` | Orchestrador principal, maneja eventos y ciclo de vida |
| `ChatRenderer` | `services/ChatRenderer.js` | Renderizado del chat (mensajes, input, tipo) |
| `ConfigService` | `services/ConfigService.js` | Configuración local en localStorage |
| `ConversationService` | `services/ConversationService.js` | Estado de conversaciones en cliente |
| `SidebarRenderer` | `services/SidebarRenderer.js` | Lista de conversaciones en sidebar |
| `StorageService` | `services/StorageService.js` | Abstracción de API (enruta según auth status) |
| `UserInfo` | `services/UserInfo.js` | Autenticación y sesión |
| `StreamEffect` | `helpers/streamData.js` | Efecto typewriter para streaming |
| `Request` | `helpers/Request.js` | HTTP helper con AbortController |

## Backend

### Patrón: Routes → Controllers → Services

```
Request → nginx → Express → Router → Controller → Service → DB/IA
                                                    ↕
                                              Response (JSON/SSE)
```

### Endpoints

| Método | Endpoint | Auth | Propósito |
|--------|----------|:----:|-----------|
| GET | `/health` | No | Health check |
| POST | `/api/llm/q` | No | SSE streaming LLM query |
| POST | `/api/auth/register` | No | Registro |
| POST | `/api/auth/login` | No | Login → JWT |
| POST | `/api/auth/google` | No | Google OAuth |
| POST | `/api/auth/logout` | Sí | Invalidar sesión |
| GET | `/api/auth/me` | Sí | Info usuario actual |
| GET/PATCH | `/api/users/config` | Sí | Config de usuario |
| GET/POST/PATCH/DELETE | `/api/models` | Sí | CRUD modelos |
| GET/POST/PATCH/DELETE | `/api/conversations` | Sí | CRUD conversaciones |
| POST | `/api/messages` | Sí | Enviar mensaje (auth) |
| POST | `/api/anon/session` | No | Crear sesión anónima |
| GET/POST | `/api/anon/conversations/*` | No | CRUD conversaciones anónimas |
| POST | `/api/anon/messages` | No | Enviar mensaje (anónimo) |
| POST | `/api/sync/migrate` | Sí | Migrar datos anónimos |
| GET | `/api/archive/*` | Sí | Acceder a archivadas |

### Modelos de datos (Prisma)

- **User**: email, passwordHash, googleId, avatar
- **Session**: token JWT con expiración
- **ModelConfig**: API key encriptada, maxTokens, temperature, systemPrompt por modelo
- **UserConfig**: theme, activeModelId, streamSpeed, showTitle
- **Conversation**: título, modelo, provider, soft-delete, archive flag, summary
- **Message**: role (user/assistant), contenido
- **MigrationLog**: registro de migración anónimo → autenticado

### Seguridad

- API keys de modelos encriptadas con AES-256-GCM
- JWT con expiración de 7 días
- Helmet para headers HTTP seguros
- Rate limiting (60 req/min)
- CORS configurable via `CORS_ORIGIN` env
