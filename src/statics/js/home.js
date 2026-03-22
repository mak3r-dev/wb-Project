(() => {
    'use strict';

    // =======================================
    // 1. CONFIGURATION & CONSTANTS
    // =======================================  
    const DOM = {
        templates: {
            card: document.getElementById('card-template'),
            dot: document.getElementById('dot-template'),
        },
        conts: {
            eventCont: document.querySelector('.event-carousel'),
        }
    };

    const state = {
        /* Multi properties */
        ftCards: [],
        ftEvents: {},
        
        /* Single properties */
        currentFtActive: 0,
        currentAnim: null,
        currentAnimInterval: null,
        animIntervalMs: 5000,
    };

    const FMT = {
        date: new Intl.DateTimeFormat('en-GB', { 
            weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' 
        }),
        currency: new Intl.NumberFormat('en-GB', { 
            style: 'currency', currency: 'GBP' 
        }),
        singleDate: new Intl.DateTimeFormat('en-GB', { 
            day: 'numeric', month: 'numeric', year: 'numeric' 
        }),
    };  

    // =======================================
    // 2. UTILITIES & HELPERS
    // =======================================  
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // =======================================
    // 3. STATE MUTATIONS 
    // =======================================  
    const updateIndicatorState = (cardInfo) => {
        cardInfo.dots.forEach(dot => {
            const isMatch = dot.dataset.key === cardInfo.cardKey;
            dot.classList.toggle('dot-opened', isMatch);
            dot.classList.toggle('dot-closed', !isMatch);
        });
    };

    const changeDesktopState = (cardIdx, op = 'open') => {
        const cardInfo = state.ftCards[cardIdx];
        const isOpen = op === 'open';

        cardInfo.element.classList.toggle('card-opened', isOpen);
        cardInfo.element.classList.toggle('card-closed', !isOpen);
        
        updateIndicatorState(cardInfo);

        cardInfo.isOpen = isOpen;
        if (isOpen) state.currentFtActive = cardIdx;
    };

    const changeMobileState = (cardIdx) => {
        const targetKey = state.ftCards[cardIdx].cardKey;

        state.ftCards.forEach((card, idx) => {
            const isTarget = card.cardKey === targetKey;
            
            card.element.style.display = isTarget ? 'block' : 'none';
            card.isOpen = isTarget;
            
            if (isTarget) {
                card.element.classList.replace('card-closed', 'card-opened');
                updateIndicatorState(card);
                state.currentFtActive = idx;
            }
        });
    };

    const resetMobileStates = () => {
        state.ftCards.forEach(card => {
            card.element.style.display = 'block';
            card.element.classList.replace('card-opened', 'card-closed');
            card.isOpen = false;
        });
    };

    // =======================================
    // 4. CORE LOGIC: FEATURED RENDER
    // =======================================  
    const renderFtCards = () => {
        const { card: cardTpl, dot: dotTpl } = DOM.templates;
        const cardFrag = document.createDocumentFragment();
        const numEvents = Object.keys(state.ftEvents).length;

        const dotsFrag = document.createDocumentFragment();
        Object.keys(state.ftEvents).forEach(key => {
            const dotClone = dotTpl.content.cloneNode(true);

            dotClone.firstElementChild.dataset.key = key; 
            dotsFrag.append(dotClone);
        });

        const setText = (parent, sel, val) => {
            parent.querySelector(`.${sel}`).textContent = val;
        };

        // 2. Build cards
        for (const [key, ev] of Object.entries(state.ftEvents)) {
            const clone = cardTpl.content.cloneNode(true);
            const cardEl = clone.firstElementChild;
            cardEl.id = `${key}FT`;

            const alias = ev.eventName.split(" ").map(w => w[0]).join('');
            
            setText(clone, 'evnt-alias', alias);
            setText(clone, 'evnt-date', FMT.singleDate.format(ev.eventStart));
            setText(clone, 'evnt-category', ev.suitabilityName);
            setText(clone, 'evnt-title', ev.eventName);
            setText(clone, 'evnt-desc', ev.eventDesc);
            setText(clone, 'date', FMT.date.format(ev.eventStart));
            setText(clone, 'capacity', ev.eventAvailability);
            setText(clone, 'price', ev.eventPrice);
            setText(clone, 'evnt-loc', `${ev.venueName}, ${ev.venueAddress}`);

            const themeClass = ev.eventName === 'Bristol Ballon Fiesta' 
                ? 'BristolBallonFiesta' 
                : ev.suitabilityName;
            cardEl.classList.add(themeClass);

            // 3. Append pre-built dots to this card
            const mCont = cardEl.querySelector('.dot-cont-mobile');
            const dCont = cardEl.querySelector('.dot-cont-desktop');
            
            mCont.appendChild(dotsFrag.cloneNode(true));
            dCont.appendChild(dotsFrag.cloneNode(true));

            // 4. Cache DOM references inside state
            const dotElements = Array.from(cardEl.querySelectorAll('.dot'));
            state.ftCards.push({
                cardKey: key,
                isOpen: false,
                element: cardEl,    
                dots: dotElements 
            });

            cardFrag.append(clone);
        }

        DOM.conts.eventCont.append(cardFrag);
    };

    // =======================================
    // 5. CORE LOGIC: ANIMATION & EVENTS
    // =======================================  
    const changeCardView = (op) => {
        const len = state.ftCards.length;
        if (op === 'next') {
            changeMobileState((state.currentFtActive + 1) % len);
        } else {
            changeMobileState((state.currentFtActive - 1 + len) % len);
        }
    };

    const clickHandler = (cardId) => {
        if (state.currentAnim === 'mobile') return;
        clearInterval(state.currentAnimInterval);

        state.ftCards.forEach((card, i) => {
            if (card.element.id === cardId) {
                changeDesktopState(i);
                state.currentAnimInterval = setInterval(
                    desktopAnimation, state.animIntervalMs
                );
            } else {
                changeDesktopState(i, 'close');
            }
        });
    };

    const desktopAnimation = () => {
        const currentIdx = state.currentFtActive;
        const nextIdx = (currentIdx + 1) % state.ftCards.length;

        if (state.ftCards[currentIdx].isOpen) {
            changeDesktopState(nextIdx);
            changeDesktopState(currentIdx, 'close');
        } else {
            changeDesktopState(currentIdx);
        }
    };

    const setAnim = () => {
        const isDesktop = window.innerWidth > 700;

        if (isDesktop) {
            if (state.currentAnim === 'desktop') return;
            if (state.currentAnim === 'mobile') resetMobileStates();
            
            desktopAnimation();
            state.currentAnimInterval = setInterval(
                desktopAnimation, state.animIntervalMs
            );
            state.currentAnim = 'desktop';
        } else {
            if (state.currentAnim === 'mobile') return;
            
            clearInterval(state.currentAnimInterval);
            changeMobileState(state.currentFtActive);
            state.currentAnim = 'mobile';
        }
    };

    // =======================================
    // 6. INITIALIZATION
    // =======================================  
    const setupListeners = () => {
        // Debounce resize
        window.addEventListener('resize', debounce(setAnim, 70));

        // Event delegation logic
        DOM.conts.eventCont.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('prev-icon')) changeCardView('prev');
            else if (target.classList.contains('next-icon')) changeCardView('next');
            else if (target.classList.contains('closed-cont')) {
                clickHandler(target.closest('.ft-card').id); 
            }
        });
    };

    // Async IIFE Bootstrapper
    (async () => {
        try {
            const ftEvents = await base.request({ URL: window.location.href });

            for (const [k, event] of Object.entries(ftEvents)) {
                event.eventStart = new Date(event.eventStart);
                event.eventPrice = FMT.currency.format(event.eventPrice);
                state.ftEvents[k] = event;
            }
            
            renderFtCards();
            setAnim();
            setupListeners();
        } catch (error) {
            console.error("Initialization Failed:", error);
        }
    })();

})();