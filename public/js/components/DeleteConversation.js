const template = document.createElement("template");
template.innerHTML = `
    <style>
        :host {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.5); /* Opacidad media solo al fondo */
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999;
        }

        .modal-content {
            background-color: white;
            padding: 0.8rem;
            border-radius: 8px;
            width: 30%;
            min-width: 300px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }

        .modal-content p {
            font-family: sans-serif;
            margin-bottom: 1.5rem;
            color: #000;
            font-size: 17px;
        }

        button {
            padding: 8px 16px;
            border: none;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
        }

        #btn-confirm {
            background-color: #e0392a;
            color: white;
            margin-right: 10px;
        }

        #btn-cancel {
            background-color: #eee;
            color: #333;
        }
    </style>

    <div class="modal-content">
        <p>¿Estás seguro que deseas borrar la conversación?</p>
        <button id="btn-confirm">Borrar</button>
        <button id="btn-cancel">Cancelar</button>
    </div>
`;

export class DeleteConversation extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    // escuchar los clicks
    connectedCallback() {
        this.shadowRoot.getElementById("btn-confirm").addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("confirm-delete"));
            this.remove(); // Se auto-elimina del DOM
        });

        this.shadowRoot.getElementById("btn-cancel").addEventListener("click", () => {
            this.remove(); // Solo se cierra
        });
    }
}

customElements.define("delete-modal", DeleteConversation);