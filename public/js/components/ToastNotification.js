const templateToast = document.createElement("template");
templateToast.innerHTML = `
    <style>
        :host {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            font-family: 'Segoe UI', Roboto, sans-serif;
        }
        
        .toast {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 280px;
            max-width: 400px;
            opacity: 0;
            transform: translateX(100px);
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
        
        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .toast.hide {
            opacity: 0;
            transform: translateX(100px);
        }
        
        .toast-icon {
            font-size: 1.2rem;
            flex-shrink: 0;
        }
        
        .toast-content {
            flex: 1;
        }
        
        .toast-title {
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 2px;
        }
        
        .toast-message {
            font-size: 0.85rem;
            opacity: 0.9;
        }
        
        .toast-close {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1.1rem;
            opacity: 0.6;
            padding: 0;
            line-height: 1;
        }
        
        .toast-close:hover {
            opacity: 1;
        }
        
        /* Estados */
        .toast.success {
            background: #d4edda;
            color: #155724;
            border-left: 4px solid #28a745;
        }
        
        .toast.error {
            background: #f8d7da;
            color: #721c24;
            border-left: 4px solid #dc3545;
        }
        
        .toast.warning {
            background: #fff3cd;
            color: #856404;
            border-left: 4px solid #ffc107;
        }
        
        .toast.info {
            background: #d1ecf1;
            color: #0c5460;
            border-left: 4px solid #17a2b8;
        }
    </style>
    
    <div class="toast" id="toast">
        <span class="toast-icon" id="toast-icon"></span>
        <div class="toast-content">
            <div class="toast-title" id="toast-title"></div>
            <div class="toast-message" id="toast-message"></div>
        </div>
        <button class="toast-close" id="toast-close">×</button>
    </div>
`;

const TOAST_ICONS = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️"
};

const TOAST_TITLES = {
    success: "Éxito",
    error: "Error",
    warning: "Advertencia",
    info: "Información"
};

class ToastNotification extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.timeout = null;
        this.duration = 4000;
    }

    connectedCallback() {
        if (this.shadowRoot.querySelector(".toast")) return;
        
        this.shadowRoot.appendChild(templateToast.content.cloneNode(true));
        
        const closeBtn = this.shadowRoot.getElementById("toast-close");
        closeBtn.addEventListener("click", () => this.hide());
        
        const type = this.getAttribute("type") || "info";
        const title = this.getAttribute("title") || TOAST_TITLES[type] || "Información";
        const message = this.getAttribute("message") || "";
        const icon = this.getAttribute("icon") || TOAST_ICONS[type] || "ℹ️";
        
        if (this.hasAttribute("duration")) {
            this.duration = parseInt(this.getAttribute("duration"));
        }
        
        const toast = this.shadowRoot.getElementById("toast");
        const iconEl = this.shadowRoot.getElementById("toast-icon");
        const titleEl = this.shadowRoot.getElementById("toast-title");
        const msgEl = this.shadowRoot.getElementById("toast-message");
        
        toast.classList.add(type);
        iconEl.textContent = icon;
        titleEl.textContent = title;
        msgEl.textContent = message;
    }

    static show(options) {
        const toast = document.createElement("toast-notification");
        
        const type = options.type || "info";
        const title = options.title || TOAST_TITLES[type] || "Información";
        const icon = options.icon || TOAST_ICONS[type] || "ℹ️";
        
        toast.setAttribute("type", type);
        toast.setAttribute("title", title);
        toast.setAttribute("message", options.message || "");
        toast.setAttribute("icon", icon);
        
        if (options.duration) {
            toast.setAttribute("duration", options.duration);
        }
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (toast.show) toast.show();
            }, 10);
        });
        
        return toast;
    }

    static success(message, title) {
        return ToastNotification.show({ type: "success", title, message });
    }

    static error(message, title) {
        return ToastNotification.show({ type: "error", title, message });
    }

    static warning(message, title) {
        return ToastNotification.show({ type: "warning", title, message });
    }

    static info(message, title) {
        return ToastNotification.show({ type: "info", title, message });
    }

    show() {
        const toast = this.shadowRoot.getElementById("toast");
        if (!toast) return;
        
        toast.classList.add("show");
        
        this.timeout = setTimeout(() => {
            this.hide();
        }, this.duration);
    }

    hide() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        
        const toast = this.shadowRoot.getElementById("toast");
        if (toast) {
            toast.classList.remove("show");
            toast.classList.add("hide");
        }
        
        setTimeout(() => {
            this.remove();
        }, 300);
    }
}

customElements.define("toast-notification", ToastNotification);

export { ToastNotification };