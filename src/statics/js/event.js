(() => {
    "use strict";

    // 1. Main Elements
    const DOM = {

        // Viewport Layout
        layout: {
            gridBtn: document.querySelector(".item2-opt2"),
            listBtn: document.querySelector(".item2-opt1"),
            showcase: document.querySelector(".event-showcase"),
            options: document.querySelector(".item2-opts"),           
        },

        // Filter UI
        filter: {
            filterBtn: document.querySelector(".item3"),
            filterFrame: document.querySelector(".event-filter"),
            filterText: document.querySelector(".item3-text"),
            closeBtn: document.querySelector(".event-filter-close-btn"),
            categories: document.querySelectorAll(".event-categ"),
            searchBar: document.querySelector(".event-filter-searchbar"),
            priceSlider: document.querySelector(".event-filter-slider1"),
            priceIndicator: document.querySelector(".event-filter-title-one"),
            totalIndicator: document.querySelector(".event-filter-tile1"),
            featuredCheck: document.querySelector(".event-filter-ft-check"),
        },
        
        // Events UI
        list: {
            container: document.querySelector(".event-showcase-list"),
            noResult: document.querySelector(".no-result-list"),
            cardTemplate: document.getElementById('card-template'),
            noResultTemplate: document.getElementById('no-result-template'),
        },   
        
        // Calender UI
        calendar: {
            nextBtn: document.querySelector(".event-filter-calender-next"),
            prevBtn: document.querySelector(".event-filter-calender-prev"),
            grid: document.querySelector(".event-filter-calender-list"),
            monthLabel: document.querySelector(".event-filter-calender-month"),
            triggerIcon: document.querySelector(".filter-date-icon"),
            container: document.querySelector(".event-filter-calender"),
            displayText: document.querySelector(".filter-date-text"),
        }
    };  
    
    // 2. Config variables
    const CONFIG = {
        DISPLAY_THRESHOLD_PX: 890,
        MAX_PRICE_THRESHOLD: DOM.filter.priceSlider.max,
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 150,
        DAY_NAMES : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    };

    // 3. Formatters 
    const DateFmt = {
        single: new Intl.DateTimeFormat('en-GB', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }),
        rangeDiff: new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }),
        rangeSame: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        month: new Intl.DateTimeFormat('en-GB', { month: 'short' })
    };  
    
    // 3. States
    const state = {
        events: [],           // Immutable master list
        activeLayout: 'grid', // 'grid' | 'list'
        filtersVisible: true,
        now: new Date(),

        // Calendar State
        datePicker: {
            refDate: new Date(), // Current viewing month
            selection: { start: null, end: null },
            domRefs: { start: null, end: null }
        },

        // Filter Criteria
        filterCriteria: {
            search: '',
            category: null,
            dateStart: null,
            dateEnd: null,
            priceMax: 0, // Initialize to 0
            featured: false
        }
    };

    // ==============================================================
    // UTILITIES ====================================================
    // ==============================================================

    // 1. -> Helper Debounce function to limit rate of execution.
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    // 2. -> Helper date comparator
    const isSameDay = (d1, d2) => {
        return d1.getFullYear() == d2.getFullYear() &&
            d1.getMonth() == d2.getMonth() &&
            d1.getDate() == d2.getDate();
    };  
    
    // 3. -> Helper DOM creator
    const createNode = (tag, text, className) => {
        const el = document.createElement(tag);
        el.textContent = text;
        if (className) el.classList.add(className);
        return el;
    };  

    // ==============================================================
    // CORE LOGIC: FILTERING & RENDERING ============================
    // ==============================================================

    // 1. CORE -> Filter Application Logic.
    const applyFilters = () => {
        const { search, category, dateStart, dateEnd, priceMax, featured } = state.filterCriteria;
        
        // Normalize search term once
        const searchTerm = search.toLowerCase();
        const filteredEvents = state.events.filter(event => {
            // 1. Price Check 
            if (event.eventPrice < priceMax) return false;

            // 2. Featured Check
            if (featured && !event.eventFt) return false;

            // 3. Category Check
            if (category && !event.suitabilityName.toLowerCase().includes(category)) return false;

            // 4. Date Check
            const evtDate = event.eventStart; // Already a Date object
            if (dateStart) {
                if (dateEnd) {
                    // Range logic
                    if (evtDate < dateStart || evtDate > dateEnd) return false;
                } else {
                    // Single day logic
                    if (!isSameDay(evtDate, dateStart)) return false;
                }
            }

            // 5. Search Check (Most expensive, do last)
            if (searchTerm) {
                const nameMatch = event.eventName.toLowerCase().startsWith(searchTerm);
                // Only check organizers if name fails
                if (!nameMatch && !event.eventOrganizers.toLowerCase().startsWith(searchTerm)) {
                    return false;
                }
            }

            return true;
        });

        renderEventList(filteredEvents);
    };   
    
    // 2. CORE -> Renders the event cards.
    const renderEventList = (events) => {
        // Clear containers
        DOM.list.container.innerHTML = '';
        DOM.list.noResult.innerHTML = '';
        DOM.filter.totalIndicator.textContent = events.length;

        if (events.length == 0) {
            // Render No Results
            const clone = DOM.list.noResultTemplate.content.cloneNode(true);
            DOM.list.noResult.appendChild(clone);
            return;
        }

        const frag = document.createDocumentFragment();
        
        for (const event of events){
            const card = createCardNode(event);
            frag.appendChild(card);
        }
        DOM.list.container.appendChild(frag);
    };

    // 3. CORE -> Creates a single event card from template.
    const createCardNode = (eventData) => {
        const { 
            eventName, eventRating, eventOrganizers, eventPrice, 
            eventStart, eventEnd, eventFt, eventAvailability, 
            suitabilityName, venueName
        } = eventData;
        
        const clone = DOM.list.cardTemplate.content.cloneNode(true);
        const root = clone.firstElementChild;

        // Helper to set text content safely
        const setText = (sel, val) => {
            const el = root.querySelector("." + sel);
            if (el) el.textContent = val;
        };
        
        // Set repeating elements
        root.querySelectorAll(".event-card-title").forEach(el => el.textContent = eventName);
        root.querySelectorAll(".card-rating").forEach(el => el.textContent = eventRating);
        root.querySelectorAll(".event-organizers").forEach(el => el.textContent = eventOrganizers);
        root.querySelectorAll("._2").forEach(el => el.textContent = `${venueName}, Bristol`);
        root.querySelectorAll("._3").forEach(el => el.textContent = eventAvailability);

        // Set specific elements
        setText("event-card-info-categ-text", suitabilityName);
        setText("event-card-categ", suitabilityName);
        setText("_1", `${DateFmt.single.format(eventStart)} - ${DateFmt.single.format(eventEnd)}`);
        setText("price", `£${eventPrice}`);

        // Classes & Images
        const imgEl = root.querySelector(".event-card-image");

        const imgClass = (eventName.replace(/\s/g, "") == 'BristolBallonFiesta') ? "BristolBallonFiesta" : suitabilityName.replace(/\s/g, "");
        imgEl.classList.add(imgClass);

        if (eventFt) root.classList.add("ft");

        // Event Listener
        const btn = root.querySelector(".start-booking");

        if (state.now > eventStart){
            btn.style.display = 'none'
        }else{
            btn.addEventListener('click', () => {
                window.location.href = `../Booking?q=${btoa(eventName)}`;
            });
        }

        return clone;
    };

    // ==============================================================
    // MODULES: CALENDAR & LAYOUT ===================================
    // ==============================================================
    
    // 1. MODULES -> Handles layout changes from grid -> list or vice versa
    const LayoutManager = {
        toggle(mode) {
            state.activeLayout = mode
            const isGrid = mode == 'grid';
            const { showcase, options } = DOM.layout;
            
            // Use classList replace for cleaner DOM manipulation
            if (isGrid) {
                showcase.classList.replace('list', 'grid');
                options.style.background = "linear-gradient(to right, rgb(167, 167, 167, 0.3) 50% ,#2e506d 50%)";
            } else {
                showcase.classList.replace('grid', 'list');
                options.style.background = "linear-gradient(to right, #2e506d 50%, rgb(167, 167, 167, 0.3) 50%)";
            }
        },

        checkResponsive() {
            if (window.innerWidth <= CONFIG.DISPLAY_THRESHOLD_PX) {
                DOM.layout.options.style.display = "none";
                DOM.layout.showcase.style.display = state.filtersVisible ? 'none' : null
                DOM.layout.showcase.classList.replace('list','grid')
            } else {
                DOM.layout.showcase.style.display = 'grid'
                LayoutManager.toggle(state.activeLayout)
                DOM.layout.options.style.display = "grid";
            }

        }
    };

    // 2. MODULES -> Calendar Logic
    const CalendarManager = {
        render() {
            const refDate = state.datePicker.refDate;
            const year = refDate.getFullYear();
            const month = refDate.getMonth();

            DOM.calendar.monthLabel.textContent = `${DateFmt.month.format(refDate)} ${year}`;
            DOM.calendar.grid.innerHTML = "";

            const fragment = document.createDocumentFragment();

            // 1. Headers
            CONFIG.DAY_NAMES.forEach(day => fragment.append(createNode("h1", day, "event-filter-weekdays")));

            // 2. Padding (Prev Month)
            const firstDayIndex = new Date(year, month, 1).getDay(); // Sun=0
            const prevMonthLastDate = new Date(year, month, 0).getDate();
            
            for (let i = firstDayIndex; i > 0; i--) {
                const d = (prevMonthLastDate - i) + 1;
                fragment.append(createNode("h1", d, "empty-date"));
            }

            // 3. Current Days
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                const btn = createNode("button", i, "numbered-date");
                btn.dataset.day = i;
                fragment.append(btn);
            }

            // 4. Padding (Next Month)
            const lastDayIndex = new Date(year, month + 1, 0).getDay();
            const remaining = 6 - lastDayIndex; // 6 is Sat
            // If last day is Sat (6), remaining is 0. If Fri (5), remaining 1.
            if (lastDayIndex !== 6) {
                for (let i = 1; i <= remaining + 1; i++) {
                    fragment.append(createNode("h1", i, "empty-date"));
                }
            }

            DOM.calendar.grid.append(fragment);
            this.updateIndicator();
        },

        handleSelection(day, el) {
            const { datePicker, filterCriteria } = state;
            const { refDate } = datePicker;
            const selected = new Date(refDate.getFullYear(), refDate.getMonth(), day);

            // Reset logic if range is full
            if (datePicker.selection.start && datePicker.selection.end) {
                datePicker.selection.start = null;
                datePicker.selection.end = null;
                // Clear visual classes
                if (datePicker.domRefs.start) datePicker.domRefs.start.classList.remove("start", "end");
                if (datePicker.domRefs.end) datePicker.domRefs.end.classList.remove("start", "end");
            }

            if (!datePicker.selection.start) {
                // Start Selection
                datePicker.selection.start = selected;
                el.classList.add("start");
                datePicker.domRefs.start = el;
            } else {
                // End Selection
                if (selected < datePicker.selection.start) {
                    // Swapping logic
                    datePicker.selection.end = datePicker.selection.start;
                    datePicker.selection.start = selected;
                    
                    // Swap Visuals
                    const oldStart = datePicker.domRefs.start;
                    oldStart.classList.replace("start", "end");
                    el.classList.add("start");

                    datePicker.domRefs.end = oldStart;
                    datePicker.domRefs.start = el;
                } else {
                    datePicker.selection.end = selected;
                    el.classList.add("end");
                    datePicker.domRefs.end = el;
                    // Re-enforce start style
                    if (datePicker.domRefs.start) datePicker.domRefs.start.classList.add("start");
                }
            }

            // Update Global Filter State
            filterCriteria.dateStart = datePicker.selection.start;
            filterCriteria.dateEnd = datePicker.selection.end;
            
            CalendarManager.updateIndicator();
            applyFilters();
        },

        updateIndicator() {
            const { start, end } = state.datePicker.selection;
            const textEl = DOM.calendar.displayText;
            
            if (!start) {
                textEl.textContent = DateFmt.single.format(state.datePicker.refDate);
                return;
            }

            if (!end) {
                textEl.textContent = DateFmt.single.format(start);
                return;
            }
            
            const isDiffMonth = start.getMonth() !== end.getMonth();
            textEl.textContent = isDiffMonth ? DateFmt.rangeDiff.formatRange(start, end) : DateFmt.rangeSame.formatRange(start, end);
        }
    };

    // ==============================================================
    // INITIALIZATION & EVENTS ======================================
    // ==============================================================

    const initEvents = () => {
        // 1. Layout & Resize
        DOM.layout.gridBtn.addEventListener('click', () => LayoutManager.toggle("grid"));
        DOM.layout.listBtn.addEventListener('click', () => LayoutManager.toggle("list"));
        DOM.filter.priceIndicator.textContent = `£0 - £${CONFIG.MAX_PRICE_THRESHOLD}`
        window.addEventListener("resize", LayoutManager.checkResponsive);

        // 2. Filter Visibility
        DOM.filter.filterBtn.addEventListener('click',() => {
            state.filtersVisible = !state.filtersVisible
            if (state.filtersVisible) {
                DOM.filter.filterFrame.style.display = "block";
                DOM.filter.filterText.textContent = "Hide Filters";
                document.documentElement.style.setProperty('--event-card-ft-list-offset','2.5rem');
            } else {
                DOM.filter.filterFrame.style.display = "none";
                DOM.filter.filterText.textContent = "Show Filters";
                document.documentElement.style.setProperty('--event-card-ft-list-offset','0rem');
            }

            // Responsive adjustment
            if (window.innerWidth <= CONFIG.DISPLAY_THRESHOLD_PX && !state.filtersVisible) {
                DOM.layout.showcase.style.display = "grid";
            } else if (window.innerWidth <= CONFIG.DISPLAY_THRESHOLD_PX && state.filtersVisible) {
                DOM.layout.showcase.style.display = "none";
            }
         });

        // 3. Input Handlers (Debounced)
        DOM.filter.searchBar.addEventListener('input', debounce((e) => {
            state.filterCriteria.search = e.target.value.trim();
            applyFilters();
        }, 70));

        DOM.filter.priceSlider.addEventListener('input', debounce((e) => {
            const val = parseInt(e.target.value, 10);
            state.filterCriteria.priceMax = val;
            DOM.filter.priceIndicator.textContent = `£${val} - £${CONFIG.MAX_PRICE_THRESHOLD}`;
            applyFilters();
        }, 25)); // Shorter delay for slider visual feedback

        // 4. Category Tags
        DOM.filter.categories.forEach(el => {
            el.addEventListener('click', () => {
                const isActive = el.dataset.state == 'on';
                
                // Reset all visual states
                DOM.filter.categories.forEach(c => {
                    c.style.background = "rgb(46, 80, 109, 0.7)";
                    c.dataset.state = 'off';
                });

                if (isActive) {
                    state.filterCriteria.category = null;
                } else {
                    el.dataset.state = 'on';
                    el.style.background = 'rgb(192, 108, 132, 0.5)';
                    state.filterCriteria.category = el.value.toLowerCase();
                }
                applyFilters();
            });
        });

        // 5. Featured Toggle
        DOM.filter.featuredCheck.addEventListener('click', (e) => {
            state.filterCriteria.featured = e.target.checked;
            applyFilters();
        });

        // 6. Calendar Events
        DOM.calendar.nextBtn.onclick = () => {
            state.datePicker.refDate.setMonth(state.datePicker.refDate.getMonth() + 1);
            CalendarManager.render();
        };
        DOM.calendar.prevBtn.onclick = () => {
            state.datePicker.refDate.setMonth(state.datePicker.refDate.getMonth() - 1);
            CalendarManager.render();
        };
        DOM.calendar.grid.addEventListener('click', (e) => {
            if (e.target.classList.contains('numbered-date')) {
                CalendarManager.handleSelection(parseInt(e.target.dataset.day), e.target);
            }
        });

        DOM.calendar.triggerIcon.addEventListener('click', () => {
            const container = DOM.calendar.container;
            const current = container.getAttribute("data-display");
            const next = current == "0rem" ? "20rem" : "0rem";
            container.style.maxHeight = next;
            container.setAttribute("data-display", next);
        });

        // 7. Clear Filters
        DOM.filter.closeBtn.addEventListener('click', () => {
            // Reset State
            state.filterCriteria = {
                search: '', category: null, dateStart: null, dateEnd: null,
                priceMax: 0, featured: false
            };
            state.datePicker.selection = { start: null, end: null };
            
            // Reset UI
            DOM.filter.searchBar.value = "";
            DOM.filter.priceSlider.value = 0;
            DOM.filter.featuredCheck.checked = false;
            DOM.filter.priceIndicator.textContent = `£0 - £${CONFIG.MAX_PRICE_THRESHOLD}`;
            DOM.filter.categories.forEach(el => {
                el.style.background = "rgb(46, 80, 109, 0.7)";
                el.dataset.state = 'off';
            });
            CalendarManager.render(); // Reset cal visual

            applyFilters();
            
            // Mobile Toggle logic
            if (window.innerWidth <= CONFIG.DISPLAY_THRESHOLD_PX) {
                DOM.filter.filterBtn.click(); // Reuse click logic to close
            }
        });
    };    

    /**
     * Main Entry Point
     */
    (async () => {
        try {
            // Init UI
            LayoutManager.checkResponsive();
            CalendarManager.render();
            initEvents();

            // Fetch Data
            if (typeof base !== 'undefined') {
                const events = await base.request({ URL: window.location.href });
                
                state.events = []
                for (let [id, ev] of Object.entries(events)){
                    if (ev.eventStatus == 'Deleted') continue;

                    ev.eventStart = new Date(ev.eventStart)
                    ev.eventEnd = new Date(ev.eventEnd)
                    state.events.push(ev)               
                }

                // Initial Render
                renderEventList(state.events);
            } else {
                console.warn("API base object missing - Mocking data or waiting...");
            }

        } catch (err) {
            console.error("Initialization Failed:", err);
        }
    })();    

})();