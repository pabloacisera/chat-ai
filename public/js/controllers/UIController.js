import { ToastNotification } from "../components/ToastNotification.js";
import { configService } from "../services/ConfigService.js";

export class UIController {
    constructor(app) {
        this.app = app;
    }

    applyTheme(theme) {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
        this.updateThemeIcon();
    }

    toggleTheme() {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark');
        if (isDark) {
            html.classList.remove('dark');
            configService.updateGlobal({ theme: 'light' });
        } else {
            html.classList.add('dark');
            configService.updateGlobal({ theme: 'dark' });
        }
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const btn = document.getElementById('btn-theme-toggle');
        if (!btn) return;
        const sun = btn.querySelector('.icon-sun');
        const moon = btn.querySelector('.icon-moon');
        const isDark = document.documentElement.classList.contains('dark');
        if (sun) sun.style.display = isDark ? 'none' : '';
        if (moon) moon.style.display = isDark ? '' : 'none';
    }

    updateUserUI(user) {
        const userNameEl = document.querySelector(".user-name");
        if (userNameEl && user) {
            userNameEl.textContent = user.name || user.email.split('@')[0];
            userNameEl.title = user.email;
        }
    }

    playNotificationSound() {
        if (!document.hidden) return;
        const enabled = configService?.getGlobal().notificationSound;
        if (enabled === false) return;

        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
            console.warn("Notificación de sonido no disponible:", e);
        }
    }

    stripHTML(html) {
        if (!html) return "";
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    cleanTitle(text) {
        if (!text) return "Nueva conversación";
        let cleaned = this.stripHTML(text);
        cleaned = cleaned.trim()
            .replace(/^["']|["']$/g, '')
            .replace(/^\d+\.\s*/, '')
            .replace(/[#*`_~]/g, '')
            .replace(/\s+/g, ' ')
            .substring(0, 80);
        return cleaned || "Nueva conversación";
    }

    handleSettings() {
        const modalConfig = document.createElement("config-modal");
        document.body.appendChild(modalConfig);
    }

    handleProfile() {
        const modalUser = document.createElement("user-modal");
        document.body.appendChild(modalUser);
    }

    handleExport(conversation) {
        if (!conversation || !conversation.messages?.length) {
            ToastNotification.warning("No hay mensajes para exportar");
            return;
        }

        const format = confirm("¿Exportar como JSON? (OK = JSON, Cancelar = Markdown)");
        const filename = `chat_${(conversation.title || 'conversacion').replace(/[^a-zA-Z0-9]/g, '_')}`;

        if (format) {
            const data = {
                titulo: conversation.title,
                modelo: conversation.modelId,
                proveedor: conversation.provider,
                creada: conversation.createdAt,
                mensajes: conversation.messages.map(m => ({
                    rol: m.role || (m.question ? 'user' : 'assistant'),
                    contenido: m.content || m.question || m.response || m.text || '',
                    fecha: m.createdAt
                }))
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            downloadBlob(blob, `${filename}.json`);
            ToastNotification.success("Conversación exportada como JSON");
        } else {
            let md = `# ${conversation.title || 'Conversación'}\n\n`;
            md += `**Modelo:** ${conversation.modelId || 'N/A'}  \n`;
            md += `**Proveedor:** ${conversation.provider || 'N/A'}  \n`;
            md += `**Creada:** ${conversation.createdAt || 'N/A'}  \n\n`;
            md += `---\n\n`;

            for (const m of conversation.messages) {
                const role = m.role || (m.question ? 'usuario' : 'asistente');
                const text = m.content || m.question || m.response || m.text || '';
                if (text) {
                    md += `**${role === 'user' || role === 'usuario' ? 'Usuario' : 'Asistente'}:**\n\n${text}\n\n`;
                }
            }

            const blob = new Blob([md], { type: 'text/markdown' });
            downloadBlob(blob, `${filename}.md`);
            ToastNotification.success("Conversación exportada como Markdown");
        }
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
