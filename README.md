# Chat IA — Multimodel Conversational Platform

Aplicación de chat con inteligencia artificial que permite interactuar con **múltiples modelos de lenguaje** (Gemini, Mistral, Groq/Llama) desde una interfaz unificada. Diseñada para usuarios que quieren comparar, probar y usar distintos proveedores de IA sin cambiar de herramienta.

---

## Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | HTML5, CSS3, JavaScript (ES Modules, Web Components, Shadow DOM) |
| **Backend** | Node.js + Express + TypeScript |
| **Base de datos** | PostgreSQL (Prisma ORM), Redis (sesiones anónimas), SQLite (archivo histórico) |
| **IA** | LangChain + Google Generative AI, Mistral AI, Groq (Llama) |
| **Infraestructura** | Docker Compose (nginx, PostgreSQL, Redis, n8n, API Express) |
| **Streaming** | Server-Sent Events (SSE) con efecto typewriter |

---

## Arquitectura

El sistema está diseñado con tres modos de persistencia según el estado del usuario:

```
                         ┌──────────────────┐
                         │   nginx (Puerto 80)│
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
        ┌─────▼──────┐    ┌──────▼──────┐    ┌───────▼──────┐
        │  Frontend   │    │  API Express│    │    n8n       │
        │ (HTML/JS)   │    │  :3001      │    │   :5678      │
        └─────────────┘    └──────┬──────┘    └──────────────┘
                                  │
                    ┌─────────────┼──────────────┐
                    │             │              │
              ┌─────▼────┐ ┌─────▼────┐  ┌──────▼─────┐
              │PostgreSQL │ │  Redis   │  │   SQLite   │
              │(usuarios  │ │(sesiones │  │(archivado) │
              │ auth)     │ │ anónimas)│  │            │
              └───────────┘ └──────────┘  └────────────┘
```

### Flujo de datos

- **Usuario autenticado**: PostgreSQL como fuente de verdad, localStorage como caché de arranque
- **Usuario anónimo**: Redis con TTL de 24 horas, sesión identificada por token en localStorage
- **Migración**: Al registrarse, los datos anónimos se migran a PostgreSQL vía `/sync/migrate`
- **Streaming**: Las respuestas de la IA se transmiten en tiempo real mediante SSE

Para detalles completos, consultar la documentación técnica en la carpeta `docs/`.

---

## Modelos Soportados

| Modelo | Proveedor | Librería |
|---|---|---|
| Gemini 2.5 Flash | Google | `@langchain/google-genai` |
| Mistral Small | Mistral AI | `@langchain/mistralai` |
| Llama 3.3 70B | Groq | `@langchain/groq` |
| Llama 3.1 8B Instruct Turbo | Together AI (vía Groq) | `@langchain/groq` |

Cada modelo requiere su propia API key. Las keys se almacenan en localStorage del navegador y, para usuarios autenticados, en PostgreSQL encriptadas.

---

## Funcionalidades Principales

- **Chat con streaming**: Respuestas en tiempo real con efecto typewriter configurable
- **Múltiples modelos**: Cambia entre distintos proveedores de IA en una misma sesión
- **Autenticación**: Email/contraseña + Google OAuth
- **Sesiones anónimas**: Chat completo sin registro, con persistencia de 24h en Redis
- **Gestión de conversaciones**: Crear, eliminar (soft delete), archivar (SQLite histórico)
- **Títulos automáticos**: La IA genera títulos descriptivos tras el primer mensaje
- **Tema visual**: Claro / Oscuro / Sistema
- **Configuración por modelo**: Tokens, temperatura, system prompt por cada proveedor
- **Límite conversacional**: Máximo 100 conversaciones activas por usuario autenticado
- **Comandos inline**: `/models`, `/set-model <nombre>` desde el input de chat

---

## Estructura del Proyecto

```
/
├── index.html                         ← Entry point frontend
├── public/
│   ├── css/                           ← Estilos (root, aside, messageContent)
│   └── js/
│       ├── index.js                   ← ChatApp (orquestador)
│       ├── components/                ← Web Components
│       │   ├── ConfigChatModal.js
│       │   ├── SettingsModal.js
│       │   ├── UserModal.js
│       │   ├── DeleteConversation.js
│       │   └── ToastNotification.js
│       ├── services/                  ← Lógica de negocio
│       │   ├── ConversationService.js
│       │   ├── ChatRenderer.js
│       │   ├── SidebarRenderer.js
│       │   ├── StorageService.js
│       │   ├── ConfigService.js
│       │   └── UserInfo.js
│       ├── helpers/                   ← Utilidades
│       │   ├── Request.js
│       │   └── streamData.js
│       └── utils/                     ← Funciones auxiliares
│           └── date.js
├── packages/
│   └── api-express/                   ← Backend
│       ├── src/
│       │   ├── index.ts              ← Servidor Express + endpoint SSE
│       │   ├── config/               ← db, redis, archive
│       │   ├── middleware/           ← auth, errorHandler
│       │   ├── routes/              ← auth, users, models, conversations, messages, anon, sync, archive
│       │   ├── controllers/         ← Lógica de endpoints
│       │   └── services/            ← Lógica de negocio (auth, ai, conversations, memory, etc.)
│       ├── prisma/                   ← Schema + migraciones
│       └── tests/                    ← Tests de integración
├── docker-compose.yml                ← Orquestación completa
├── nginx/                            ← Configuración del gateway
├── ARCHITECTURE.md                   ← Documentación técnica del frontend
└── documento_tecnico_chat_ia.md      ← Documentación técnica general
```

---

## Cómo Usar

### Requisitos

- Docker y Docker Compose
- API keys de al menos un proveedor de IA (Gemini, Mistral, o Groq)

### Inicio Rápido

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd chatIA

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys y configuraciones

# 3. Levantar todos los servicios
docker compose up -d

# 4. Abrir en el navegador
open http://localhost
```

### Sin Docker (solo frontend + API)

```bash
# Backend
cd packages/api-express
npm install
npx prisma generate
npm run dev

# Frontend: abrir index.html en navegador o servir con cualquier HTTP server
```

---

## Estado del Proyecto

Activo — en desarrollo.

---

## Licencia

Uso educativo y personal.
