(() => { 'use strict';

    const button = document.querySelector('.learn-more');
    const target = document.querySelector('.section-values');

    button.addEventListener('click', () => {
        target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'      
        });
    });
})();