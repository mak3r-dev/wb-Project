(() => {
    'use strict';

    // =======================================
    // 1. CONFIGURATION & CONSTANTS
    // =======================================  
    const DOM = {
        list: document.querySelector(".event-showcase-list"),
        templates: {
            card: document.getElementById('card-template'),
            noResult: document.getElementById('no-result-template')
        },
        buttons: {
            upcoming: document.querySelector(".profile-booking-options-button-upcoming"),
            past: document.querySelector(".profile-booking-options-button-past"),
            cancelled: document.querySelector(".profile-booking-options-button-cancelled"),
            featured: document.querySelector(".profile-booking-options-button-featured")
        },
        info: {
            name: document.querySelector(".user-infoname"),
            joined: document.querySelector(".padding-info"),
            email: document.querySelector(".user-profile-email"),
            phone: document.querySelector(".user-profile-phone"),
            counts: {
                total: document.querySelector(".total-bookings"),
                upcoming: document.querySelector(".upcoming-events"),
                past: document.querySelector(".past-events"),
                featured: document.querySelector(".featured-events"),
                cancelled: document.querySelector(".cancelled-events"),
                icon: document.querySelector(".user-profile-inner-icon")
            }
        }
    };

    // Pre-allocate formatters
    const Formatters = {
        dateShort: new Intl.DateTimeFormat('en-GB', { 
            weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' 
        }),
        dateLong: new Intl.DateTimeFormat('en-GB', { 
            month: 'long', year: 'numeric' 
        }),
        currency: (val) => `£${val}`
    };

    // State Container
    const State = {
        bookings: {}, // ID mapping
        events: {
            upcoming: [],
            past: [],
            featured: [],
            cancelled: []
        },
        activeTab: 'upcoming' // Track current view
    };

    /**
     * Cancel Event Logic
     * @param {string} eventID 
     */
    const cancelEvent = async (eventID) => {
        try {
            const result = await base.request({
                URL: "/actions",
                Data: {
                    ACTION : 'BOOKING_ACTION',
                    ID:  State.bookings[eventID][0],
                    OP: 'CANCEL_BOOKING',
                    DATA : eventID
                }
            });
            console.log('Cancellation result:', result);
        } catch (error) {
            console.error("Failed to cancel event:", error);
        }
    };

    /**
     * Creates a single DOM node for an event
     * @param {Object} data - Event data object
     * @param {string} id - Booking ID
     * @param {boolean} allowCancel - Whether to show cancel button
     * @returns {Node}
     */
    const createEventCard = (data, id, allowCancel = true) => {
        // Clone template content (faster than innerHTML parsing)
        const clone = DOM.templates.card.content.cloneNode(true);
        const root = clone.firstElementChild;
        const { 
            eventName, eventRating, eventOrganizers, eventPrice, 
            eventStart, eventEnd, eventFt, eventAvailability, 
            suitability, venueName, eventID 
        } = data;

        const bindings = {
            ".event-card-title": eventName,
            ".event-card-rating": eventRating,
            ".event-card-info-organizers": eventOrganizers,
            "._2": `${venueName}, Bristol`,
            "._3": eventAvailability,
            ".event-card-info-categ-text": suitability,
            ".event-card-categ": suitability,
            ".price": Formatters.currency(eventPrice),
            "._1": `${Formatters.dateShort.format(new Date(eventStart))} - ${Formatters.dateShort.format(new Date(eventEnd))}`
        };

        for (const [selector, value] of Object.entries(bindings)) {
            const els = root.querySelectorAll(selector);
            els.forEach(el => el.textContent = value);
        }

        if (eventFt) root.classList.add("ft");

        const btn = root.querySelector(".cancel-booking");
        if (allowCancel) {
            btn.dataset.eventID = eventID;
        } else {
            btn.style.display = 'none';
        }

        return clone;
    };

    /**
     * Renders a list of events to the DOM
     * @param {Array} eventList - Array of [eventData, id] tuples
     * @param {boolean} allowCancel 
     */
    const renderList = (eventList, allowCancel = true) => {
        DOM.list.innerHTML = "";
        const frag = document.createDocumentFragment();

        if (!eventList || eventList.length == 0) {
            frag.appendChild(DOM.templates.noResult.content.cloneNode(true));
        } else {
            for (let i = 0, len = eventList.length; i < len; i++) {
                const item = eventList[i];
                frag.appendChild(createEventCard(item.data, item.id, allowCancel));
            }
        }
        DOM.list.appendChild(frag);
    };

    /**
     * Updates Button States
     * @param {HTMLElement} activeBtn 
     */
    const updateNavState = (activeBtn) => {
        Object.values(DOM.buttons).forEach(btn => {
            const isActive = (btn == activeBtn);
            btn.classList.toggle('clicked', isActive);
            btn.classList.toggle('free', !isActive);
        });
    };

    /**
     * Generic Handler for Tab Switching
     * @param {string} type - 'upcoming', 'past', 'featured', 'cancelled'
     * @param {HTMLElement} btn - The clicked button
     */
    const switchTab = (type, btn) => {
        State.activeTab = type;
        const events = State.events[type];
        // Disable cancel button for past and cancelled events
        const allowCancel = (type == 'upcoming' || type == 'featured');
        
        renderList(events, allowCancel);
        updateNavState(btn);
    };

    // 1. Event Delegation for Cancel Buttons
    DOM.list.addEventListener('click', (e) => {
        if (e.target.matches('.cancel-booking')) {
            const eid = e.target.dataset.eventID;
            if (eid) cancelEvent(eid);
        }
    });

    // 2. Navigation Listeners
    DOM.buttons.upcoming.addEventListener('click', () => switchTab('upcoming', DOM.buttons.upcoming));
    DOM.buttons.past.addEventListener('click', () => switchTab('past', DOM.buttons.past));
    DOM.buttons.featured.addEventListener('click', () => switchTab('featured', DOM.buttons.featured));
    DOM.buttons.cancelled.addEventListener('click', () => switchTab('cancelled', DOM.buttons.cancelled));

    // 3. Layout Handling (Debounced)
    let resizeTimeout;
    const handleResize = () => {
        const mode = window.innerWidth <= 600 ? 'grid' : 'list';
        // Only touch DOM if class actually needs changing
        if (!DOM.list.classList.contains(mode)) {
            DOM.list.classList.remove('list', 'grid');
            DOM.list.classList.add(mode);
        }
    };

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 100);
    });

    // --- Initialization ---

    /**
     * Populates User Info Section
     * @param {Object} user 
     * @param {Object} counts 
     */
    const renderUserInfo = (user, counts) => {
        const { info } = DOM;
        info.name.textContent = `${user.FirstName} ${user.LastName}`;
        info.joined.textContent = `Member Since ${Formatters.dateLong.format(new Date(user.DateJoined))}`;
        info.email.textContent = user.Email;
        info.phone.textContent = `+44 ${user.Phone}`;
        info.counts.icon.textContent = `${user.FirstName[0]}${user.LastName[0]}`.toUpperCase();
        
        info.counts.total.textContent = counts.total;
        info.counts.upcoming.textContent = counts.upcoming;
        info.counts.past.textContent = counts.past;
        info.counts.featured.textContent = counts.featured;
        info.counts.cancelled.textContent = counts.cancelled;

        // Update Button Text
        DOM.buttons.upcoming.textContent = `Upcoming (${counts.upcoming})`;
        DOM.buttons.past.textContent = `Past (${counts.past})`;
        DOM.buttons.featured.textContent = `Featured (${counts.featured})`;
        DOM.buttons.cancelled.textContent = `Cancelled (${counts.cancelled})`;
    };

    const init = (async () => {
        try {
            handleResize();

            const info = await base.request({ 
                URL: window.location.href, 
                Data: { OP: 'GET_USER_PROFILE' } 
            });

            const now = Date.now(); // Calculate once
            const rawEvents = info.events || []; 
            const rawBookings = info.bookings || {};
            
            // 1. Identify Cancelled IDs
            const cancelledIDs = new Set();
            for (const [id, details] of Object.entries(rawBookings)) {
                if (details[1] == 'cancelled') cancelledIDs.add(Number(id));
            }
            
            rawEvents.forEach(item => {
                const eventData = item[0];
                const eventId = item[1]; 
                const start = new Date(eventData.eventStart).getTime();
                
                const stdEvent = { data: eventData, id: eventId };
                if (cancelledIDs.has(eventId)) {
                    State.events.cancelled.push(stdEvent);
                } else {
                    if (start > now) State.events.upcoming.push(stdEvent);
                    else State.events.past.push(stdEvent);
                }

                if (eventData.eventFt) State.events.featured.push(stdEvent);
            });
            console.log(State.events.cancelled) 
            console.log(State.events.upcoming) 
            console.log(State.events.past) 
            console.log(State.events.featured) 
            State.bookings = rawBookings;

            // Render Info
            renderUserInfo(info.user, {
                total: rawEvents.length,
                upcoming: State.events.upcoming.length,
                past: State.events.past.length,
                featured: State.events.featured.length,
                cancelled: State.events.cancelled.length
            });

            // Initial Tab Load
            DOM.buttons.upcoming.click();

        } catch (err) {
            console.error("Initialization failed", err);
        }
    })();

})();
