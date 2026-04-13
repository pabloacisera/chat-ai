// ============================================
// REDIMENSIONAR ASIDE (arrastrar el borde)
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    const aside = document.querySelector('.conversations');
    const handle = document.querySelector('.resize-handle');

    console.log("aside:", aside);  // Para debug
    console.log("handle:", handle); // Para debug

    if (aside && handle) {
        let startX, startWidth;

        handle.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startWidth = aside.offsetWidth;  // ← Usar offsetWidth en lugar de getComputedStyle
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            e.preventDefault();
        });

        function onMouseMove(e) {
            const dx = e.clientX - startX;
            let newWidth = startWidth + dx;
            
            // Limitar ancho mínimo y máximo
            if (newWidth < 250) newWidth = 250;
            if (newWidth > 600) newWidth = 600;
            
            aside.style.width = `${newWidth}px`;
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    } else {
        console.error("No se encontró .conversations o .resize-handle");
    }
});