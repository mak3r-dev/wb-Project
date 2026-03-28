(() => {
    "use strict";

    // =======================================
    // 1. CONFIGURATION & CONSTANTS
    // =======================================  

    const CONFIG = {
        CLASSES: {
            VALID: 'input-valid',
            INVALID: 'input-error',
            HIDDEN: 'hidden', // CSS should define: .hidden { display: none !important; }
            SELECTED: 'addon-card-selected',
            NO_SUMMARY: 'no-summary',
            ACTIVE_SUBTOTAL: 'active-subtotal' // Replaces dataset.state logic
        },
        // Stripe Appearance settings
        STRIPE: {
            APPEARANCE: {
                theme: 'none',
                variables: {
                    fontFamily: 'Manrope, sans-serif',
                    colorBackground: '#f5f5f7',
                    colorPrimary: '#0071e3',
                    borderRadius: '0.13rem',
                },
                rules: {
                    '.Block': { backgroundColor: 'rgba(172,172,172,0.35)', borderRadius: '0.7rem', color: 'white' },
                    '.Label': { fontFamily: 'Manrope, sans-serif', color: 'rgba(0,0,0,0.6)', fontSize: '0.8rem' },
                    '.Input': { 
                        backgroundColor: 'rgba(255,255,255,0.3)', 
                        border: '0.07rem solid rgba(255,255,255,0.2)', 
                        borderRadius: '0.67rem',
                        boxShadow: '0 0.0625rem 0.1875rem rgba(0,0,0,0.1)',
                        fontSize: '0.8rem'
                    },
                    '.Tab': {
                        border: '0.07rem solid rgba(255,255,255,0.2)',
                        padding: '0.75rem 1.5rem',
                        boxShadow: 'none',
                        borderRadius : '0.67rem',
                    },
                    '.Tab:hover': {color: '#635bff',},
                    '.Tab--selected': {boxShadow: '0 0 0.2rem rgba(0,0,0,0.3)',backgroundColor : 'rgba(255,255,255,0.2)',border: 'none'},                    
                    '.Input:focus': { outline: 'none' },
                }
            },
            FONTS: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&display=swap' }]
        },

        REGEX: {
            EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            WHITELIST: new Set(['test', 'standard'])
        }
    };   
    
    // =======================================
    // 2. STATE MANAGEMENT & CACHING
    // =======================================
    
    const DOM = {
        doc: document.documentElement,
        containers: {
            tickets: document.querySelector(".booking-multi-day-entries"),
            addons: document.querySelector(".add-on-container"),
            summaryDays: document.querySelector(".day-summary"),
            summaryAddons: document.querySelector(".add-on-summary"),
            userInput: document.querySelector(".user-input-summary-container"),
            confirmDayCont: document.querySelector(".confirm-days-card-cont"),
            confirmAddOnCont: document.querySelector(".confirm-add-on-card-cont"),
            confirmedDayCont: document.querySelector(".confimed-tickets-cont"),
            confirmedAddOnCont: document.querySelector(".confirmed-section-add-on-card-cont"),
        },
        inputs: {
            first: document.querySelector(".FirstName"),
            last: document.querySelector(".LastName"),
            email: document.querySelector(".Email"),
            phone: document.querySelector(".PhoneNumber")
        },
        summary: {
            name: document.querySelector(".summary-name-text"),
            email: document.querySelector(".summary-email-text"),
            phone: document.querySelector(".summary-phone-text"),
            total: document.querySelector('.summary-price-indicator'),
            subTotalDivider: document.querySelector(".sub-total-divider"),
            subTotal: document.querySelector(".booking-summary-sub-total"),
            subTotalPrice: document.querySelector(".subtotal-Price"),
            discountRange: document.querySelector(".discount-range"),
            discountPercent: document.querySelector(".discount-percent"),
            ticketInfo: document.querySelector(".booking-event-tickets-text"),
            // Containers for toggling
            boxes: {
                name: document.querySelector(".name-summary-container"),
                email: document.querySelector(".email-summary-container"),
                phone: document.querySelector(".phone-summary-container"),
            },
            placeholders: {
                noTicket: document.querySelector('.no-ticket'),
                noDetail: document.querySelector('.no-details-summary'),
            }
        },
        info: {
            name: document.querySelector(".booking-event-name"),
            loc: document.querySelector(".event-location"),
            date: document.querySelector(".event-date"),
            desc: document.querySelector(".booking-event-info-description"),
            completeBtn: document.querySelector(".booking-summary-total-button")
        },
        templates: {
            ticket: document.getElementById("template-ticket"),
            addonLabel: document.getElementById("template-addon-label"),
            addonCard: document.getElementById("template-addon-card"),
            addonList: document.getElementById("template-addon-card-list"),
            sumDay: document.getElementById("day-summary-template"),
            sumAddon: document.getElementById("add-on-summary-template"),
            confirmDay: document.getElementById("confirm-days-template"),
            confirmedDay: document.getElementById("confirmed-card-template"),
        },
        confirmation: {
            parent: document.querySelector(".booking-confirmation-container"),
            bgBlur: document.querySelector(".bg-blur"),
            loadingComp: document.querySelector(".loading-components"),
            loadingText: document.querySelector(".loading-Text"),
            confirmPayment: document.querySelector(".payment-container"),
            confirmParent: document.querySelector(".booking-container"), // The modal inner container
            cancelBtn: document.querySelector(".confirm-btn-cancel"),
            proceedBtn: document.querySelector(".confirm-btn-proceed"),
            total: document.querySelector(".confirm-total-price"),
            contact: {
                name: document.querySelector(".confirm-contact-name"),
                email: document.querySelector(".confirm-contact-email"),
                phone: document.querySelector(".confirm-contact-phone"),
            },
            texts: {
                main: document.querySelector(".confirmation-text"),
                sub: document.querySelector(".confirmation-text-1"),
            },
            confirmed: {
                parent: document.querySelector(".booking-confirmed-container"),
                refTxt: document.querySelector(".reference-bg"),
                title: document.querySelector(".event-confirmed-title"),
                loc: document.querySelector(".confirmed-loc-text"),
                calendar: document.querySelector(".confirmed-calender-text"),
                total: document.querySelector(".confirmed-total-price"),
                count: document.querySelector(".confirmed-ticket-count"),
                subTotal: document.querySelector(".confirmed-subtotal-info"),
                finalEmail: document.querySelector(".confirmation-email"),

                // Confirmed Contact Details
                name: document.querySelector(".coned-Name"),
                email: document.querySelector(".coned-Email"),
                phone: document.querySelector(".coned-Phone"),
            },
            buttons: {
                return: document.querySelector(".redirect-events"),
                print: document.querySelector(".redirect-reciept"), // Typo in HTML id preserved
                download: document.querySelector(".redirect-download"),
            }
        },
        dividers: {
            addOn : document.querySelector('.add-on-divider'),
            subTotal : document.querySelector('.sub-total-divider'),
            final : document.querySelector('.final-divider')
        },
        msg : {
            parent : document.querySelector('.final-confirmation'),
            confirmBtn : document.querySelector('.confirm-confirmation'),
            cancelBtn : document.querySelector('.cancel-confirmation'),
        }
    };  
    
    const FMT = {
        date: new Intl.DateTimeFormat('en-GB', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }),
        currency: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
        day: new Intl.DateTimeFormat('en-GB', { weekday: 'long' }),
    };    

    const REF_MAP = new Map();
    const State = {
        url: new URLSearchParams(document.location.search),
        eventDetails: null,
        suitableDiscount: null,
        tickets: {}, // Payload Data
        addOns: new Set(), // Payload Data (IDs)
        activeTicketIds: new Set(), // UI State
        activeAddonIds: new Set(), // UI State
        totalPrice: 0,
        totalTicketCount : 0,
        finalPayload: null,
        stripe: {
            instance: null,
            elements: null,
            paymentEl: null,
            intent: null,
        },
        loading: {
            timeout: null,
            interval: null,
            phrase: 'Processing Products'
        },
        response: { message: null, ref: null, total : null }
    };    

    // =======================================
    // 3. UTILITIES
    // =======================================    

    const debounce = (fn, delay = 300) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    };    

    const toggleElements = (elements, show) => {
        const displayVal = show ? '' : 'none';
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].style.display != displayVal) {
                elements[i].style.display = displayVal;
            }
        }
    };    

    // =======================================
    // 4. CORE LOGIC: RENDER & INITIALIZATION
    // =======================================
    
    const updateLayout = (total) => {
        const width = total <= 3 ? "20rem" : "27rem";
        const flow = total <= 3 ? "auto-fit" : "auto-fill";
        DOM.doc.style.setProperty('--booking-multi-days-column', `repeat(${flow}, minmax(${width}, 1fr))`);
    };    

    const renderEventInfo = (info) => {
        const { eventName, venueName, eventDesc, eventStart, eventEnd } = info;
        const dateRange = `${FMT.date.format(eventStart)} - ${FMT.date.format(eventEnd)}`;
        const location = `${venueName}, Bristol`;

        // Batch DOM updates
        DOM.info.name.textContent = eventName;
        DOM.info.loc.textContent = location;
        DOM.info.desc.textContent = eventDesc;
        DOM.info.date.textContent = dateRange;

        const { confirmed } = DOM.confirmation;
        confirmed.title.textContent = eventName;
        confirmed.loc.textContent = location;
        confirmed.calendar.textContent = dateRange;
    };    

    const renderTickets = (info) => {
        const frags = {
            main: document.createDocumentFragment(),
            summary: document.createDocumentFragment(),
            confirm: document.createDocumentFragment(),
            confirmed: document.createDocumentFragment()
        };

        const { eventStart, eventEnd, eventPrice } = info;
        const msPerDay = 86400000;
        const days = Math.ceil(Math.abs(eventEnd - eventStart) / msPerDay) + 1;

        updateLayout(days);

        const dailyPrice = Number((eventPrice / days).toFixed(2));
        DOM.summary.ticketInfo.textContent = `${FMT.currency.format(dailyPrice)} Per Day For ${days} Day(s)`;

        let currDate = new Date(eventStart);

        for (let i = 1; i <= days; i++) {
            const dateStr = FMT.date.format(currDate);
            const dayId = `day-${i}`;

            // 1. Main Ticket Card
            const clone = DOM.templates.ticket.content.cloneNode(true);
            clone.querySelector(".day-indicator").textContent = `Day ${i} (${dateStr})`;
            
            const wrapper = clone.querySelector('.day-number');
            wrapper.dataset.id = dayId;
            wrapper.dataset.price = dailyPrice;

            // 2. Summary Row
            const sumClone = DOM.templates.sumDay.content.cloneNode(true);
            const sumEl = sumClone.firstElementChild;
            sumEl.style.display = 'none';
            sumEl.querySelector('.day-date-holder').textContent = dateStr;
            const priceHolder = sumEl.querySelector('.day-price-holder');

            // 3. Confirmation Rows (Initial & Final)
            const conClone = DOM.templates.confirmDay.content.cloneNode(true);
            const conEl = conClone.firstElementChild;
            conEl.style.display = 'none';
            conEl.querySelector('.confirm-day-date').textContent = dateStr;
            const conTicketHolder = conEl.querySelector('.confirm-day-ticket');

            const conedClone = DOM.templates.confirmedDay.content.cloneNode(true);
            const conedEl = conedClone.firstElementChild;
            conedEl.style.display = 'none';
            conedEl.querySelector('.section-ticket-date').textContent = dateStr;
            conedEl.querySelector('.section-ticket-day').textContent = FMT.day.format(currDate);
            const conedTicketHolder = conedEl.querySelector('.section-ticket-total');
            const conedTicketPrice = conedEl.querySelector('.section-ticket-price');

            // Update Map & State
            State.tickets[dayId] = { 
                attendees: 0, 
                dayPrice: dailyPrice, 
                totalPrice: 0,
                date: new Date(currDate) // Store copy
            };

            REF_MAP.set(dayId, {
                uiPrice: clone.querySelector('.ticket-price'),
                uiCount: clone.querySelector('.user-ticket-price-counter'),
                sumText: priceHolder,
                conTicket: conTicketHolder,
                conedTicket: conedTicketHolder,
                conedPrice: conedTicketPrice,
                // Elements to toggle visibility
                toggles: [sumEl, conEl, conedEl] 
            });

            // Append to fragments
            frags.main.appendChild(clone);
            frags.summary.appendChild(sumEl);
            frags.confirm.appendChild(conEl);
            frags.confirmed.appendChild(conedEl);

            currDate.setDate(currDate.getDate() + 1);
        }

        DOM.containers.tickets.appendChild(frags.main);
        DOM.containers.summaryDays.appendChild(frags.summary);
        DOM.containers.confirmDayCont.appendChild(frags.confirm);
        DOM.containers.confirmedDayCont.appendChild(frags.confirmed);
    };    

    const renderAddons = (addons) => {
        if (!addons || Object.keys(addons).length < 1) {
            DOM.containers.addons.style.display = 'none';
            DOM.containers.summaryAddons.style.display = 'none';
            DOM.dividers.addOn.style.display = 'none'
            DOM.dividers.subTotal.classList.add('no-gap')
            DOM.dividers.final.classList.add('no-gap')
            return;
        }
        
        const frags = {
            main: document.createDocumentFragment(),
            sum: document.createDocumentFragment(),
            con: document.createDocumentFragment(),
            coned: document.createDocumentFragment()
        };

        let currentCat = "";
        let currentList = null;

        addons.forEach(addon => {
            // Category grouping
            if (addon.Category != currentCat) {
                currentCat = addon.Category;
                const label = DOM.templates.addonLabel.content.cloneNode(true);
                label.querySelector('.booking-user-input-label').textContent = currentCat;
                frags.main.appendChild(label);

                const list = DOM.templates.addonList.content.cloneNode(true);
                currentList = list.firstElementChild;
                frags.main.appendChild(list);
            }

            const id = `addon-${addon.addID}`;
            const price = Number(addon.Price);

            // Card Creation
            const card = DOM.templates.addonCard.content.cloneNode(true);
            const btn = card.firstElementChild;
            
            // Text Content
            card.querySelector('.booking-user-entry-list-label').textContent = addon.Name;
            card.querySelector('.booking-user-entry-list-description').textContent = addon.addOnDesc;
            card.querySelector('.booking-user-entry-list-price').textContent = FMT.currency.format(price);
            card.querySelector('.booking-user-entry-list-price-desc').textContent = addon.PriceDesc;
 
            btn.dataset.id = id;
            btn.dataset.price = price;
            btn.dataset.type = 'addon';

            // Summary Element
            const sumClone = DOM.templates.sumAddon.content.cloneNode(true);
            const sumEl = sumClone.firstElementChild;
            sumEl.style.display = 'none';
            sumEl.querySelector('.add-on-name').textContent = addon.Name;
            sumEl.querySelector('.add-on-price').textContent = FMT.currency.format(price);

            // Confirmation Elements (Simple H1s)
            const createConfirmEl = (cls) => {
                const el = document.createElement('h1');
                el.style.display = 'none';
                el.textContent = addon.Name;
                el.className = cls;
                return el;
            };
            
            const conEl = createConfirmEl('confirm-add-on-name');
            const conedEl = createConfirmEl('confirmed-add-on-name');

            REF_MAP.set(id, {
                btn,
                toggles: [sumEl, conEl, conedEl]
            });

            currentList.appendChild(card);
            frags.sum.appendChild(sumEl);
            frags.con.appendChild(conEl);
            frags.coned.appendChild(conedEl);
        });

        DOM.containers.addons.appendChild(frags.main);
        DOM.containers.summaryAddons.appendChild(frags.sum);
        DOM.containers.confirmAddOnCont.appendChild(frags.con);
        DOM.containers.confirmedAddOnCont.appendChild(frags.coned);
    };

    const determineDiscount = () => {
        const { eventStart } = State.eventDetails;
        // Calculate days difference: (Future - Now) / ms_per_day
        const daysAdvance = Math.ceil((eventStart - new Date()) / 86400000);
    };    

    // =======================================
    // 5. STATE MUTATIONS & UI UPDATES
    // =======================================
    
    const updateGlobalTotal = () => {
        const discount = State.suitableDiscount;
        let finalPrice = State.totalPrice;

        DOM.summary.subTotalPrice.textContent = FMT.currency.format(State.totalPrice);

        if (discount) {
            finalPrice -= (State.totalPrice * discount.discountPercentage) / 100;
        }

        const formattedTotal = FMT.currency.format(finalPrice);
        DOM.summary.total.textContent = formattedTotal;
        DOM.confirmation.total.textContent = formattedTotal;
        DOM.confirmation.confirmed.total.textContent = formattedTotal;

        // Subtotal Visibility Logic
        const hasActiveItems = State.activeTicketIds.size > 0 || State.activeAddonIds.size > 0;
        const showSubtotal = discount && hasActiveItems;

        const { subTotalDivider, subTotal } = DOM.summary;
        const { subTotal: conSubTotal } = DOM.confirmation.confirmed;
        
        // Toggle display only if needed
        const displayStyle = showSubtotal ? 'flex' : 'none';
          
        if (subTotal.style.display != displayStyle) {
            DOM.dividers.final.classList.toggle('no-gap',false)
            subTotalDivider.style.display = showSubtotal ? 'block' : 'none';
            subTotal.style.display = displayStyle;
            conSubTotal.style.display = displayStyle;
        }
        
        displayStyle == 'none' ? DOM.dividers.final.classList.toggle('no-gap',true) : null;
    };    

    const updateTicket = (id, change) => {
        const record = State.tickets[id];
        const refs = REF_MAP.get(id);
        const availability = State.eventDetails.eventAvailability
        
        if (change == -1 && record.attendees == 0) return;
        refs.uiCount.style.color = "black"

        record.attendees += change;
        State.totalTicketCount += change;        
        record.totalPrice = record.attendees * record.dayPrice;
        State.totalPrice += (change * record.dayPrice);
        
        refs.uiCount.textContent = record.attendees;
        refs.sumText.textContent = `${record.attendees} x ${FMT.currency.format(record.dayPrice)}`;

        const isActive = record.attendees > 0;
        
        if (isActive) {
            State.activeTicketIds.add(id);
            refs.conTicket.textContent = `${record.attendees} ticket(s)`;
            refs.conedTicket.textContent = `${record.attendees} ticket(s)`;
            
            const priceStr = FMT.currency.format(record.totalPrice);
            refs.uiPrice.textContent = priceStr;
            refs.conedPrice.textContent = priceStr;
            
            toggleElements(refs.toggles, true); 
        } else {
            State.activeTicketIds.delete(id);
            refs.uiPrice.textContent = "";
            toggleElements(refs.toggles, false);
        }

        if (change > 0 && State.totalTicketCount >= availability){
            refs.uiCount.style.color = "red"

            record.attendees -= 1
            State.totalTicketCount -= 1;
            return;
        }   

        // Layout variable update
        const heightVar = State.activeTicketIds.size > 3 ? '2.5rem' : 'max-content';
        DOM.doc.style.setProperty('--booking-confirm-day-height', heightVar);
        DOM.summary.placeholders.noTicket.style.color = 'black';
        DOM.containers.summaryDays.classList.toggle(CONFIG.CLASSES.NO_SUMMARY, State.activeTicketIds.size == 0);
        
        updateGlobalTotal();     
    };    

    const toggleAddon = (id, price) => {
        const refs = REF_MAP.get(id);
        const isSelected = State.activeAddonIds.has(id);
        const numericId = Number(id.split('-')[1]);

        if (isSelected) {
            State.activeAddonIds.delete(id);
            State.totalPrice -= price;
            State.addOns.delete(numericId);
            
            refs.btn.classList.remove(CONFIG.CLASSES.SELECTED);
            toggleElements(refs.toggles, false);
        } else {
            State.activeAddonIds.add(id);
            State.totalPrice += price;
            State.addOns.add(numericId);
            
            refs.btn.classList.add(CONFIG.CLASSES.SELECTED);
            toggleElements(refs.toggles, true);
        }

        const heightVar = State.activeAddonIds.size > 3 ? '2.5rem' : 'max-content';
        DOM.doc.style.setProperty('--booking-confirm-add-on-height', heightVar);

        DOM.containers.summaryAddons.classList.toggle(CONFIG.CLASSES.NO_SUMMARY, State.activeAddonIds.size == 0);
        updateGlobalTotal();
    };    

    const handleUserInput = () => {
        const { first, last, email, phone } = DOM.inputs;
        const { boxes, name, email: emailTxt, phone: phoneTxt } = DOM.summary;
        const { contact, confirmed } = DOM.confirmation;
        
        const updateField = (val, box, txtEl, conEl, conedEl, prefix = '') => {
            if (val) {
                const str = prefix + val;
                box.style.display = 'grid';
                txtEl.textContent = str;
                conEl.textContent = str;
                conedEl.textContent = str;
            } else {
                if (box.style.display != 'none') box.style.display = 'none';
            }
        };

        const fullName = (first.value || last.value) ? `${first.value} ${last.value}`.trim() : null;
        
        updateField(fullName, boxes.name, name, contact.name, confirmed.name);
        updateField(email.value, boxes.email, emailTxt, contact.email, confirmed.email);
        updateField(phone.value, boxes.phone, phoneTxt, contact.phone, confirmed.phone, '+44 ');

        if (email.value) confirmed.finalEmail.textContent = email.value;

        const hasInput = fullName || email.value || phone.value;
        DOM.containers.userInput.classList.toggle(CONFIG.CLASSES.NO_SUMMARY, !hasInput);
        DOM.summary.placeholders.noDetail.style.color = 'black';
    };  
    
    const validateField = (el) => {
        const val = el.value;
        const { VALID, INVALID } = CONFIG.CLASSES;
        
        if (!val) {
            el.parentElement.classList.remove(VALID, INVALID);
            return true;
        }

        if (CONFIG.REGEX.WHITELIST.has(val)) {
            el.parentElement.classList.replace(INVALID, VALID);
            return true;
        }

        let valid = false;
        let summaryTextEl = null;

        if (el == DOM.inputs.email) {
            valid = CONFIG.REGEX.EMAIL.test(val);
            summaryTextEl = DOM.summary.email;
        } else if (el == DOM.inputs.phone) {
            valid = val.length > 9 && val.length < 11;
            summaryTextEl = DOM.summary.phone;
        } else {
            // Names
            valid = val.length > 0;
            summaryTextEl = DOM.summary.name;
        }

        if (summaryTextEl) {
            summaryTextEl.style.color = valid ? 'black' : 'rgb(126, 36, 36)';
        }

        // Toggle classes efficiently
        if (valid) {
            el.parentElement.classList.add(VALID);
            el.parentElement.classList.remove(INVALID);
        } else {
            el.parentElement.classList.add(INVALID);
            el.parentElement.classList.remove(VALID);
        }

        return valid;
    };  
    
    // =======================================
    // 6. PROCESS CONTROL (LOADING & PAYMENTS)
    // =======================================    

    const toggleLoadingScreen = (show, message = State.loading.phrase) => {
        const { bgBlur, loadingComp, loadingText, parent } = DOM.confirmation;
        
        if (show) {
            bgBlur.style.display = 'grid';
            loadingComp.style.display = 'block';
            parent.style.display = 'none';
            
            loadingText.textContent = message;
            let step = 0;
            
            if (State.loading.interval) clearInterval(State.loading.interval);
            
            State.loading.interval = setInterval(() => {
                step = (step + 1) % 4;
                loadingText.textContent = `${message}${".".repeat(step)}`;
            }, 500);
        } else {
            clearInterval(State.loading.interval);
            loadingComp.style.display = 'none';
        }
    };

    const handleBookingClick = () => {
        // 1. Verify user inputs
        const {first, last, email, phone} = DOM.inputs

        const hasEmpty = [first,last,email,phone].some(el => {
            if (!el.value){
                el.parentElement.classList.add(CONFIG.CLASSES.INVALID);
                return true;
            }
            return false;
        });
        
        if (State.activeTicketIds.size < 1) return DOM.summary.placeholders.noTicket.style.color = 'red'
        if (hasEmpty) return DOM.summary.placeholders.noDetail.style.color = 'red'
        if (!validateField(email) || !validateField(phone)) return alert('Invalid Email or Phone Number');     

        toggleLoadingScreen(true);

        // 2. View Confirmation
        State.loading.timeout = setTimeout(getPaymentIntent, Math.random() * 800 + 1000);
    };

    const handleConfirmProceed = async () => {
        const btn = DOM.confirmation.proceedBtn;
        
        if (btn.dataset.state == 'payment') {
            const { error } = await State.stripe.elements.submit();

            if (error) {
                alert(error.message);
                return;
            } else{
                changeConfirmationView('confirmation');
            }

            return;
        }

        if (btn.dataset.state == 'confirmed') {
            toggleLoadingScreen(true, 'Verifying Booking');
            State.loading.timeout = setTimeout(verifyBooking, Math.random() * 800 + 1000);
        }
    };  
 
    const handleCancel = () => {
        const { bgBlur, parent, proceedBtn } = DOM.confirmation;
        
        if (proceedBtn.dataset.state == 'confirmed') {
            if (State.totalPrice == 0) {
                parent.style.display = 'none';
                bgBlur.style.display = 'none';
            } else {
                changeConfirmationView('payment');
            }

        } else if (proceedBtn.dataset.state == 'payment') {
            bgBlur.style.display = 'none';
            parent.style.display = 'none';
        }
        
        clearTimeout(State.loading.timeout);
        clearInterval(State.loading.interval);
    };  

    const verifyBooking = async () => {
        clearTimeout(State.loading.timeout);
        DOM.confirmation.confirmed.count.textContent = `${State.finalPayload.tickets.length} ticket(s)`;

        // 1. Send Info
        try {
            const response = await base.request({ 
                URL: `/Booking/Checkout?q=${State.url.get('q')}`, 
                Data: { 
                    ACTION_TYPE: 'INSERT_INFO',
                    DATA: State.finalPayload,
                    REF: State.response.ref
                }, 
            });       
            
            if (response){
                toggleLoadingScreen(true, 'Processing Payment');
                if (State.response.total != 0) {
                    State.loading.timeout = setTimeout(verifyPayment, Math.random() * 800 + 1000);
                } else {
                    State.loading.timeout = setTimeout(viewFinalConfirmation, Math.random() * 800 + 1000);
                }
            }

        } catch (err) {
            console.error("Insertion error", err);
            toggleLoadingScreen(false);
            DOM.confirmation.bgBlur.style.display = 'none';
        }
    }

    const getPaymentIntent = async () => {
        clearTimeout(State.loading.timeout);
        const { first, last, email, phone } = DOM.inputs;

        State.finalPayload = {
            eventID: State.eventDetails.eventID,
            tickets: Object.values(State.tickets).filter(t => t.attendees > 0),
            AddOns: [...State.addOns],
            discountID: State.suitableDiscount ? State.suitableDiscount.discountID : null,
            userInfo: {
                FirstName: first.value.toLowerCase().trim(),
                LastName: last.value.toLowerCase().trim(),
                Email: email.value.toLowerCase().trim(),
                Phone: phone.value.toLowerCase().trim(),
            },
        };

        try {
            const data = await base.request({ 
                URL: `/Booking/Checkout?q=${State.url.get('q')}`, 
                Data: { 
                    ACTION_TYPE: 'CALCULATE_TOTAL',
                    DATA: State.finalPayload 
                } , 
            });

            State.response.message = data.Message;
            State.response.ref = data.booking_ref;
            State.response.total = data.totalPrice;

            if (data.client_secret) {

                State.stripe.instance = Stripe(data.key);
                State.stripe.elements = State.stripe.instance.elements({
                    clientSecret: data.client_secret,
                    appearance: CONFIG.STRIPE.APPEARANCE,
                    fonts: CONFIG.STRIPE.FONTS
                });

                State.stripe.paymentEl = State.stripe.elements.create('payment');
                State.stripe.paymentEl.mount('.payment-container');
                
                changeConfirmationView('payment');
            } else {
                changeConfirmationView('confirmation');
            }

        } catch (err) {
            console.error("Payment Intent Error", err);
            toggleLoadingScreen(false);
            DOM.confirmation.bgBlur.style.display = 'none';
        }
    };    

    const changeConfirmationView = (type) => {
        const { parent, loadingComp, confirmPayment, confirmParent, cancelBtn, proceedBtn, texts } = DOM.confirmation;

        loadingComp.style.display = 'none';
        parent.style.display = 'block';
     
        if (type == 'payment') {
            confirmPayment.style.display = 'block';
            confirmParent.style.display = 'none';
            cancelBtn.textContent = 'Cancel';
            proceedBtn.textContent = 'Continue';
            texts.main.textContent = 'Payment';
            texts.sub.textContent = 'Please input your card details.';
            proceedBtn.dataset.state = 'payment';
        } else if (type == 'confirmation') {
            confirmPayment.style.display = 'none';
            confirmParent.style.display = 'block';
            proceedBtn.textContent = 'Confirm Booking';
            texts.main.textContent = 'Confirm Your Booking';
            texts.sub.textContent = 'Please review your booking details.';
            cancelBtn.textContent = State.totalPrice == 0? 'Cancel' : 'Back';
            proceedBtn.dataset.state = 'confirmed';
        }
        
        clearInterval(State.loading.interval);
    };    

    const viewFinalConfirmation = () => {
        const { parent, confirmed, bgBlur } = DOM.confirmation;
        parent.style.display = 'none'; // Hide inputs
        confirmed.parent.style.display = 'block'; // Show receipt
        confirmed.refTxt.textContent = `Booking Reference: ${State.response.ref}`;
        
        // Blur remains active for modal effect
        bgBlur.style.display = 'grid'; 
        clearTimeout(State.loading.timeout);
    };    

    const verifyPayment = async () => {
        const { error } = await State.stripe.instance.confirmPayment({
            elements: State.stripe.elements,
            confirmParams: {
                return_url: 'http://127.0.0.1:5000/Booking',
            },
            redirect: 'if_required',
        });

        if (error) {
            toggleLoadingScreen(false);
            changeConfirmationView('payment'); // Go back to payment input
            alert(error.message);
            return;
        }

        viewFinalConfirmation();
    };    

    const handleEStatus = (btn) => {
        const {parent, confirmBtn, cancelBtn} = DOM.msg
        const { bgBlur, loadingComp} = DOM.confirmation;

        const action = btn.dataset.action
        const off = () => {
            parent.style.display = 'none'
            bgBlur.style.display = 'none'
            loadingComp.style.display = 'none'  
        }

        if (action == 'confirm-availability') off()
        if (action == 'confirm-booked'){
            off()
            window.location.replace('../Event')      
        }  

        if (action == 'cancel-availability'){
            off()
            window.location.replace('../Event') 
        }

        if (action == 'cancel-booked'){
            off()
            window.location.replace('../Account')
        }  
        return
    }

    const checkEventStatus = (data) => {
        const {parent, confirmBtn, cancelBtn} = DOM.msg
        const { bgBlur, loadingComp} = DOM.confirmation;

        const check = !data.available || data.booked
        if (check) {
            // Add Listeners
            confirmBtn.addEventListener('click',() => {handleEStatus(confirmBtn)})
            cancelBtn.addEventListener('click',() => {handleEStatus(cancelBtn)})

            // Set Statics
            loadingComp.style.display = 'none'
            bgBlur.style.display = !data.available || data.booked ? 'block' : 'none'

            parent.style.display = 'grid'

            parent.classList.add(!data.available ? 'availability' : 'booked');
            confirmBtn.dataset.action = !data.available ? 'confirm-availability' : 'confirm-booked';
            cancelBtn.dataset.action = !data.available ? 'cancel-availability' : 'cancel-booked';

            return false;
        }

        return true
    }

    // =======================================
    // 7. INITIALIZATION
    // =======================================
    
    const setupEventListeners = () => {
        // Event Delegation for Tickets
        DOM.containers.tickets.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const wrapper = btn.closest('.day-number');
            if (wrapper) {
                const action = btn.classList.contains('increase-ticket-count') ? 1 : -1;
                updateTicket(wrapper.dataset.id, action);
            }
        });

        // Event Delegation for Addons
        DOM.containers.addons.addEventListener('click', (e) => {
            const target = e.target.closest('[data-type="addon"]');
            if (target && DOM.containers.addons.contains(target)) {
                toggleAddon(target.dataset.id, Number(target.dataset.price));
            }
        });

        // Input Handling with Debounce
        const onInput = debounce(handleUserInput, 50);
        const onValidate = debounce((e) => validateField(e.target), 200);

        Object.values(DOM.inputs).forEach(el => {
            el.addEventListener('input', (e) => {
                onInput();
                onValidate(e);
            });
        });

        // Buttons
        DOM.info.completeBtn.addEventListener('click', handleBookingClick);
        DOM.confirmation.cancelBtn.addEventListener('click', handleCancel);
        DOM.confirmation.proceedBtn.addEventListener('click', handleConfirmProceed);
        DOM.confirmation.buttons.return.addEventListener('click', () => window.location.replace('../Event'));
        DOM.confirmation.buttons.download.addEventListener('click',() => {window.open('/download-ticket', '_blank')})
        
    };  
    
    // Init
    (async () => {
        try {
            const searchParams = new URLSearchParams(document.location.search);
            const query = searchParams.get('q');
            if (!query) throw new Error("Missing query parameter");

            const EventName = atob(query);
            const data = await base.request({ URL: '/Booking', Data: EventName });

            const details = Array.isArray(data.eventDetails) ? data.eventDetails[0] : data.eventDetails;
            State.eventDetails = {
                ...details,
                eventStart: new Date(details.eventStart),
                eventEnd: new Date(details.eventEnd)
            };
            
            // Calculate Discounts
            if (data.discounts) {
                const range = Math.ceil((State.eventDetails.eventStart - new Date()) / 86400000);
                const discount = data.discounts.find(d => range < d.advance2 && range > d.advance1);
                
                if (discount) {
                    State.suitableDiscount = discount;
                    DOM.summary.discountRange.textContent = `Discount ${discount.advance1} - ${discount.advance2} days`;
                    DOM.summary.discountPercent.textContent = `-${discount.discountPercentage}%`;
                }
            }

            const eventStatus = checkEventStatus(data);
            if (!eventStatus) return;

            renderEventInfo(State.eventDetails);
            renderTickets(State.eventDetails);
            renderAddons(data.eventAddons);
            setupEventListeners();

        } catch (error) {
            console.error("Initialization Failed:", error);
        }

    })();      
})()