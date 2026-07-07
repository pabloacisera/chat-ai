document.addEventListener("DOMContentLoaded", () => {
    const aside = document.querySelector('.conversations');
    const handle = document.querySelector('.resize-handle');
    const hamburger = document.getElementById('hamburger-btn');
    const backdrop = document.getElementById('sidebar-backdrop');

    const closeSidebar = () => {
        aside.classList.remove('open');
        backdrop.classList.remove('open');
        document.body.style.overflow = '';
    };

    const openSidebar = () => {
        aside.classList.add('open');
        backdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            if (aside.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (backdrop) {
        backdrop.addEventListener('click', closeSidebar);
    }

    if (aside && handle) {
        let startX, startWidth;

        handle.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startWidth = aside.offsetWidth;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        });

        function onMouseMove(e) {
            const dx = e.clientX - startX;
            let newWidth = startWidth + dx;
            if (newWidth < 250) newWidth = 250;
            if (newWidth > 600) newWidth = 600;
            aside.style.width = `${newWidth}px`;
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && aside.classList.contains('open')) {
            closeSidebar();
        }
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            aside.classList.contains('open') &&
            !aside.contains(e.target) &&
            !hamburger.contains(e.target)) {
            closeSidebar();
        }
    });
});
