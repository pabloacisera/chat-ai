export class SidebarRenderer {
    constructor(container, currentId = null) {
        this.container = container;
        this.currentId = currentId;
    }

    setCurrentId(id) {
        this.currentId = id;
    }

    renderEmpty() {
        this.container.innerHTML = `
            <li class="empty-conversations">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                    <path d="M80-160v-640q0-33 23.5-56.5T160-880h480q33 0 56.5 23.5T720-800v203q-10-2-20-2.5t-20-.5q-10 0-20 .5t-20 2.5v-203H160v400h283q-2 10-2.5 20t-.5 20q0 10 .5 20t2.5 20H200l-120-160Zm160-440h320v-80H240v80Zm0 160h200v-80H240v80Zm400 280v-120H520v-80h120v-120h80v120h120v80H640v120h-80ZM160-360v-400 400Z"/>
                </svg>
                <p>No hay conversaciones aún</p>
            </li>
        `;
    }

    render(conversations) {
        this.container.innerHTML = "";
        
        if (!conversations || conversations.length === 0) {
            this.renderEmpty();
            return;
        }

        const currentIdStr = this.currentId ? String(this.currentId) : null;
        
        [...conversations].reverse().forEach(item => {
            const li = document.createElement("li");
            const itemIdStr = String(item.id);
            li.classList.add(`item-${itemIdStr}`);
            
            if (currentIdStr && itemIdStr === currentIdStr) {
                li.classList.add("active");
            }

            const cleanTitle = item.title.replace(/<[^>]+>/g, '');
            
            li.innerHTML = `
                <p class="item-title" data-conversation-id="${itemIdStr}">${cleanTitle}</p>
                <div class="footer-li">
                    <span>${item.date}</span>
                    <button class="btn-delete-conversation" data-id="${itemIdStr}" aria-label="Eliminar conversación">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </button>
                </div>
            `;
            
            this.container.appendChild(li);
        });
    }
}
