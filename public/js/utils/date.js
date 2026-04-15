export function formatDateFriendly(dateString) {
    const date = new Date(dateString);
    const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('es-ES', opciones);
}

export function generateId() {
    return Math.floor(Math.random() * 900000) + 100000;
}