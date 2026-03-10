(() => {
    'use strict';

    // =======================================
    // 1. CONFIGURATION & CONSTANTS
    // =======================================   
    const DOM = {
        sectionBtns: [
           document.querySelector(".dashboard"),
           document.querySelector(".events"),
           document.querySelector(".users"),
           document.querySelector(".bookings"),
           document.querySelector(".reports"),
        ],

        dashboardSection : {
            revenueEl : document.querySelector(".revenue-El"),
            bookingEl : document.querySelector(".booking-El"),
            eventEl : document.querySelector(".event-El"),
            userEl : document.querySelector(".user-El"),
        },

        templates : {
            recentEventCard : document.getElementById("recent-card-template"),
            eventCard : document.getElementById("event-card-template"),
            userCard : document.getElementById("user-card-template"),
            bookingCard : document.getElementById("booking-card-template"),
            noResult : document.getElementById("no-result-for-tables"),
        },

        containers : {
            recentEventCardCont : document.querySelector(".event-card-ctn"),
            eventCardCont : document.querySelector(".event-list-ctn"),
            userCardCont : document.querySelector(".user-list-ctn"),
            bookingCardCont : document.querySelector(".booking-list-ctn"),
        },

        frags : {
            recentEventFrag : document.createDocumentFragment(),
            eventCardFrag : document.createDocumentFragment(),
            userCardFrag : document.createDocumentFragment(),
            bookingCardFrag : document.createDocumentFragment(),
        },

        searchBars : {
            event : document.querySelector(".search-events"),
            user : document.querySelector(".search-user"),
            booking : document.querySelector(".search-booking"),
        },

        popups : {
            editingEvents : document.querySelector(".edit-add-events"),
            confirmation : document.querySelector(".final-confirmation"),
            editUserInfo : document.querySelector(".change-user-info"),
            editUserPass : document.querySelector(".change-password-info"),
        },

        Btns : {
            addEvents : document.querySelector(".add-btn"),
            cancelEdit : document.querySelector(".edit-add-events-cancel-btn"),
            confirmEdit : document.querySelector(".edit-add-events-confirm-btn"),
            cancelConfirm : document.querySelector(".cancel-confirmation"),
            confirmConfirm : document.querySelector(".confirm-confirmation"),
            cancelUser : document.querySelector(".user-info-cancel-btn"),
            confirmUser : document.querySelector(".user-info-confirm-btn"),    
            cancelUserP : document.querySelector(".user-pass-cancel-btn"),
            confirmUserP : document.querySelector(".user-pass-confirm-btn"),
        },

        popupEls : {
            editingEventsEls : [
                document.querySelector(".evnt-title-to-update"),
                document.querySelector(".evnt-cat-to-update"),  
                document.querySelector(".evnt-ft-to-update"),
                document.querySelector(".evnt-start-to-update"),
                document.querySelector(".evnt-end-to-update"),
                document.querySelector(".evnt-desc-to-update"),
                document.querySelector(".evnt-price-to-update"),
                document.querySelector(".evnt-availability-to-update"),    
                document.querySelector(".evnt-status-to-update"),    
                document.querySelector(".evnt-org-to-update"),
                document.querySelector(".evnt-rating-to-update"),
                document.querySelector(".venue-name-to-update"),
                document.querySelector(".venue-capacity-to-update"),
                document.querySelector(".venue-address-to-update"),
                document.querySelector(".check-indicator"),
            ],

            confirmationEls : {
                actionTxt : document.querySelector(".action-txt"),
                moralTxt : document.querySelector(".moral-txt"),
                conseqTxt : document.querySelector(".consequence-txt"),
            },

            userEls : [
                document.querySelector(".frst-name-to-update"), 
                document.querySelector(".last-name-to-update"), 
                document.querySelector(".email-to-update"), 
                document.querySelector(".phone-to-update"), 
            ],

            userPEls : {
                newP : document.querySelector(".password-to-update"), 
                newPConfirm : document.querySelector(".new-password-to-update"), 
            }
        }
    }       

    const State = {
        events : null,
        users : null,
        bookings : null,
        bookingEntries : null,

        currentEvent : null,
        currentUserID : null,
        currentBookingID : null,

        currentAction: null,
        currentOP: null,
        utils : {
            today : new Date(),    
            intKeys : ['eventPrice','eventAvailability','eventRating','venueCapacity'],
            dateKeys : ['eventStart','eventEnd']
        },

        searchSets : {
            eventSet : new Set(),
            userSet : new Set(),
            bookingSet : new Set()
        },

        ElStates : {
            cActionTxt : null,
            cMoralTxt : null,
            cConsequenceTxt : null,

            cConfirmationState : null,
        }
    }

    const CONFIG = {
        CLASSES : {
            VALID : 'input-valid',
            INVALID : 'input-error'
        },

        REGEX : {
            Date : /^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$/,
            EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            PASS: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*\[\]]).{12,}$/,
            WHITELIST: new Set(['test', 'standard', 'test123', 'standard123','test222'])       
        }
    }

    const Info = {
        evRevenues : {},
        tltBookings : {},
        tltEntries : {}
    }

    const FMT = {
        date: new Intl.DateTimeFormat('en-GB', {month: 'short', day: '2-digit', year: 'numeric' }),
        currency: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
    };   

    // =======================================
    // 2. HELPERS
    // ======================================= 

    const setText = (parent,sel, val) => {
        const el = parent.querySelector("." + sel);
        if (el) el.textContent = val;
    };

    const renderNoResult = (cont) => {
        cont.innerHTML = "";
        const noResult = DOM.templates.noResult.content.cloneNode(true)
        noResult.querySelector(".no-result-txt").textContent = 'No Results Found...'
        cont.append(noResult) 
    }

    // Change the current visible content
    const changeContent = (map) => {
        DOM.sectionBtns.forEach(el => {
            const corEl = document.querySelector(`.${el.dataset.contentmap}`)

            if(map == el.dataset.contentmap){
                corEl.style.display = "flex"
                el.classList.add('selected')
            }else{
                corEl.style.display = "none"
                el.classList.remove('selected')
            }
            
        })
    };

    const resetToggle = () => {
        const eventFt = DOM.popupEls.editingEventsEls[2]
        const indicator = DOM.popupEls.editingEventsEls[14]

        indicator.classList.replace('check-indicator-on','check-indicator-off')  
        eventFt.value = 0
    }

    // edit/add events toggle button
    const toggleButton = (state) => {
        const eventFt = DOM.popupEls.editingEventsEls[2]
        const indicator = DOM.popupEls.editingEventsEls[14]
        
        if (state){
            indicator.classList.replace('check-indicator-off','check-indicator-on')  
            eventFt.value = 1
        }else if (!state){
            indicator.classList.replace('check-indicator-on','check-indicator-off')  
            eventFt.value = 0
        }    
    };

    const setEditContent = (ev) => {
        resetToggle()
        const {editingEventsEls} = DOM.popupEls

        const ft = ev.eventFt
        for (const el of editingEventsEls){
            if (el.classList.contains('check-indicator')) continue;
            if (el.classList.contains('ft-checkbox')){
                toggleButton(ft)
                continue
            }
            if (el.dataset.key == 'eventStart' || el.dataset.key == 'eventEnd'){
                const str = ev[el.dataset.key].toISOString().split('T00')[0].trim()
                el.value = (' ' + str).slice(1);
                continue;
            }
            el.value = ev[el.dataset.key]
        }
    }

    const setAddContent = () => {
        resetToggle()
        const {editingEvents} = DOM.popups
        const titleEl = DOM.popupEls.editingEventsEls[0]

        setText(editingEvents,"section-header",`Adding ${titleEl.value.trim()}...`)
    }

    const setUserContent = (usr) => {
        const {userEls} = DOM.popupEls
        for (const el of userEls){
            if (el.dataset.key == 'Phone' && usr[el.dataset.key] == null){
                el.value = 'No Phone Number...'
                continue;
            }

            el.value = usr[el.dataset.key]
        }
    }

    // View final confirmation
    const viewFinalConfirmation = (type) => {
        const {confirmation} = DOM.popups
        const {actionTxt, moralTxt, conseqTxt} = DOM.popupEls.confirmationEls

        confirmation.classList.remove('deletion')
        confirmation.classList.remove('information')

        confirmation.classList.remove('suspend')
        confirmation.classList.remove('re-instate')
        if (type == 'delete' || type == 'suspend') {
            confirmation.style.display = 'grid'
            confirmation.classList.add('deletion')
            if (type == 'suspend') confirmation.classList.add('suspend')
        }else if (type  == 'info' || type == 're-instate'){
            confirmation.style.display = 'grid'
            confirmation.classList.add('information')
            if (type == 're-instate') confirmation.classList.add('re-instate')
        }

        actionTxt.textContent = State.ElStates.cActionTxt;
        moralTxt.textContent = State.ElStates.cMoralTxt;
        conseqTxt.textContent = State.ElStates.cConsequenceTxt;
    }

    const validateInput = (currentPopup, el) => {
        if (currentPopup == 'Events'){
            const {confirmEdit} = DOM.Btns

            // Integer Inputs
            const intEl = el == DOM.popupEls.editingEventsEls[6] ||
                          el == DOM.popupEls.editingEventsEls[7] ||
                          el == DOM.popupEls.editingEventsEls[10]

            // Date Inputs
            const dateEl = el == DOM.popupEls.editingEventsEls[3] ||
                           el == DOM.popupEls.editingEventsEls[4]

            if (intEl) return isNaN(Number(el.value)) ? false : true
            if (dateEl){
                const d = new Date(el.value)

                const valRegex = CONFIG.REGEX.Date.test(el.value)
                const valValue = isNaN(d.getTime())
                if (valRegex && !valValue){
                    if (confirmEdit.dataset.state == 'editing') return true

                    if (d > State.utils.today) return true
                    return false
                }else {
                    return false
                }  
            }
            return el.value.length < 1 ? false : true
        }

        if (currentPopup == 'User-Details'){
            if (el == DOM.popupEls.userEls[2]){
                if (CONFIG.REGEX.WHITELIST.has(el.value.trim())) return true
                return CONFIG.REGEX.EMAIL.test(el.value.trim())
            }

            return el.value.length > 1
        }

        if (currentPopup == 'User-Pass'){
            const {newP,newPConfirm} = DOM.popupEls.userPEls
            
            const newPV = newP.value.toLowerCase().trim()
            const newPVC = newPConfirm.value.toLowerCase().trim()
            if (newPV != newPVC) return false

            const { WHITELIST, PASS } = CONFIG.REGEX;
            if (WHITELIST.has(newPV) && WHITELIST.has(newPVC)){
                return true
            }

            const passRegex = PASS.test(newP.value)
            return passRegex && (newPV == newPVC)
        }
    }
    // =======================================
    // 3. CORE -> DASHBOARD TAB
    // =======================================   
    
    const renderDashboard = () => {
        const {events, bookings, users} = State
        const {revenueEl,bookingEl,eventEl,userEl} = DOM.dashboardSection
        const {recentEventCard} = DOM.templates
        const {recentEventCardCont} = DOM.containers
        const {recentEventFrag} = DOM.frags

        // Define Variables
        let totalRevenue = 0, totalBookings = 0, upcomingEvents = 0, activeUsers = 0;
        recentEventCardCont.innerHTML = "";

        Object.values(bookings).forEach(bk => {
            totalRevenue += bk.totalPrice;
            totalBookings++;
        })

        // Get upcoming events / Active users..
        Object.values(users).forEach(us => activeUsers += us.Status == 'Active' ? 1 : 0)

        // 2. Set Dynamic Cards
        let any = false
        Object.values(events).forEach(ev => {
            // Get metrics
            upcomingEvents += State.utils.today < ev.eventStart ? 1 : 0

            // Load content
            const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;

            const upcoming = State.utils.today < ev.eventStart && (ev.eventStart - State.utils.today) <= fifteenDaysInMs 
            const completed = State.utils.today > ev.eventStart && (State.utils.today - ev.eventStart) <= fifteenDaysInMs 
            
            if (upcoming || completed){
                any = true
                const clone = recentEventCard.content.cloneNode(true)

                // set info
                setText(clone,"card-titl",ev.eventName)
                setText(clone,"card-categ",upcoming ? 'upcoming' : 'completed')
                setText(clone,"card-date-loc",`${FMT.date.format(ev.eventStart)} • ${ev.venueName}, ${ev.venueAddress}`)
                setText(clone,"card-capacity",`${ev.eventAvailability}`)
                                
                if(completed) clone.querySelector(".card-categ").classList.add("completed-categ") 
                recentEventFrag.append(clone)
            }         
        })

        revenueEl.textContent = `${FMT.currency.format(totalRevenue)}`
        bookingEl.textContent = `${totalBookings}`
        eventEl.textContent = `${upcomingEvents}`
        userEl.textContent = `${activeUsers}`

        if (!any) {
            const noResult = document.createElement("h1")
            noResult.textContent = "No Recent Events..."
            noResult.classList.add("no-result")
            recentEventFrag.append(noResult) 
        }

        recentEventCardCont.append(recentEventFrag)
    };

    // =======================================
    // 4. CORE -> EVENTS TAB
    // =======================================   
    
    const renderEvents = () => {
        const {eventCard} = DOM.templates
        const {eventCardCont} = DOM.containers
        const {eventCardFrag} = DOM.frags   
        const {addEvents} = DOM.Btns

        const arrEvents = Array.from(State.searchSets.eventSet)
        if (arrEvents.length < 1){
            renderNoResult(eventCardCont)
            return;
        }

        eventCardCont.innerHTML = "";
        for (const ev of arrEvents) {
            const clone = eventCard.content.cloneNode(true)  

            setText(clone,"evnt-titl",ev.eventName)
            setText(clone,"evnt-cat",ev.suitability)

            setText(clone,"card-date",`${FMT.date.format(ev.eventStart)}`)
            setText(clone,"card-loc",`${ev.venueName}, ${ev.venueAddress}`)

            setText(clone,"card-price",`${FMT.currency.format(ev.eventPrice)}`)
            setText(clone,"card-tickets",`${ev.eventAvailability}`)

            const revenue = FMT.currency.format(Info.evRevenues[ev.eventName]? Info.evRevenues[ev.eventName] : 0)
            setText(clone,"card-revenue",`${revenue}`)
            
            const status = clone.querySelector('.card-status')
            status.classList.add(State.utils.today < ev.eventStart ? 'status-upcoming' : 'status-completed')

            // Set Button ID
            clone.querySelector(".edit-action").dataset.eventID = ev.eventID
            clone.querySelector(".delete-action").dataset.eventID = ev.eventID
            
            addEvents.dataset.eventID = ev.eventID
            eventCardFrag.append(clone)   
        }

        eventCardCont.append(eventCardFrag)
    }
    
    const editEvents = (evID, action) => {
        const {editingEvents} = DOM.popups
        const {confirmEdit} = DOM.Btns
        const event = State.events[evID]
        
        // Styles
        if (action == 'view'){
            setText(editingEvents,"section-header",`Editing Event for ${event.eventName}...`)
            setEditContent(event)
            
            editingEvents.style.display = 'grid'
            confirmEdit.textContent = 'Edit Event'
            confirmEdit.dataset.state = 'editing'
            confirmEdit.dataset.eventID = evID
        }

        // Logic
        if (action == 'edit'){
            for (const el of DOM.popupEls.editingEventsEls){
                if (el.classList.contains('check-indicator')) continue;
                if (el.classList.contains('ft-checkbox')){
                    event.eventFt = el.value != event.eventFt ? Number(el.value) : event.eventFt
                    continue;
                }

                if (!validateInput('Events',el)) return el.classList.add('input-error')
                if (State.utils.intKeys.includes(el.dataset.key)){
                    event[el.dataset.key] = Number(el.value.trim())
                    continue;
                }

                if (State.utils.dateKeys.includes(el.dataset.key)){
                    event[el.dataset.key] = new Date(el.value.trim())
                    continue;
                }

                if (el.value != event[el.dataset.key]) event[el.dataset.key] = el.value.trim()
                
            }

            State.searchSets.eventSet = new Set(Object.values(State.events))
            renderEvents()

            // Final Confirmation
            State.ElStates.cActionTxt = 'Confirm Edition?'
            State.ElStates.cMoralTxt = 'Are you sure you want to edit this event detail?'
            State.ElStates.cConsequenceTxt = 'This action is reversible.'  

            State.currentAction = 'EVENT_ACTION'
            State.currentOP = 'EDIT_EVENT'
            State.currentEvent = State.events[evID]
            viewFinalConfirmation('info')
        }
    }

    const deleteEvent = (evID) => {
        State.ElStates.cActionTxt = 'Confirm Event Deletion?'
        State.ElStates.cMoralTxt = 'Are you sure you want to delete this event?'
        State.ElStates.cConsequenceTxt = 'This action is permanent.'  

        State.currentAction = 'EVENT_ACTION'
        State.currentOP = 'DELETE_EVENT'
        State.currentEvent = State.events[evID]
        viewFinalConfirmation('delete')     
    }

    const addEvent = (action,evID) => {
        const {editingEvents} = DOM.popups
        const {confirmEdit} = DOM.Btns
        
        // Styles
        if (action == 'view'){
            DOM.popupEls.editingEventsEls[0].value = ""    
            setAddContent()
            
            for (const el of DOM.popupEls.editingEventsEls){el.value = ""}
            editingEvents.style.display = 'grid'
            confirmEdit.textContent = 'Add Event'
            confirmEdit.dataset.state = 'adding'  
            confirmEdit.dataset.eventID = evID
        }

        let newEV = State.events[evID]
        if (action == 'add'){
            for (const el of DOM.popupEls.editingEventsEls){
                el.classList.remove('input-valid','input-error')
                if (el.classList.contains('check-indicator')) continue;
                if (el.classList.contains('ft-checkbox')){ 
                    newEV['eventFt'] = Number(el.value)
                    continue;
                }    

                if (!validateInput('Events',el)) return el.classList.add('input-error')
                if (State.utils.intKeys.includes(el.dataset.key)){
                    newEV[el.dataset.key] = Number(el.value.trim())
                    continue;
                }

                if (State.utils.dateKeys.includes(el.dataset.key)){
                    newEV[el.dataset.key] = new Date(el.value.trim())
                    continue;
                }

                newEV[el.dataset.key] = el.value.trim()
            }

            State.events[Object.values(State.events).length + 1] = newEV
            State.searchSets.eventSet = new Set(Object.values(State.events))
            renderEvents()

            // Final Confirmation
            State.ElStates.cActionTxt = 'Confirm Addition?'
            State.ElStates.cMoralTxt = 'Are you sure you want to add this event?'
            State.ElStates.cConsequenceTxt = 'This action is reversible.'  

            State.currentAction = 'EVENT_ACTION'
            State.currentOP = 'ADD_EVENT'
            State.currentEvent = newEV
            viewFinalConfirmation('info')
        }
    }

    // =======================================
    // 5. CORE -> USER TAB
    // =======================================   
    const renderUsers = () => {
        const {userCard} = DOM.templates
        const {userCardCont} = DOM.containers
        const {userCardFrag} = DOM.frags  
        
        const arrUsers = Array.from(State.searchSets.userSet)
        if (arrUsers.length < 1){
            renderNoResult(userCardCont)
            return;
        }

        userCardCont.innerHTML = "";
        for (const usr of arrUsers) {
           const clone = userCard.content.cloneNode(true)   

           setText(clone,"user-name",`${usr.FirstName} ${usr.LastName}`)
           setText(clone,"user-email",`${usr.Email}`)
           
           const tltBooking = Info.tltBookings[usr.userID]
           setText(clone,"user-bookings",tltBooking ? tltBooking : 0)
           setText(clone,"user-joined",`${FMT.date.format(usr.DateJoined)}`)
            
           const status = clone.querySelector('.user-status')
           const action = clone.querySelector('.user-action')
           if (usr.Status == 'active'){ status.classList.add('user-status-active')
                action.classList.add('user-status-active')
           }
          
           if (usr.Status == 'suspended'){status.classList.add('user-status-suspended')
                action.classList.add('user-status-suspended')
           }
           
           const role = clone.querySelector('.user-role')
           role.classList.add(usr.Permission.toLowerCase() == 'admin' ? 'role-admin' : 'role-user')

            // Set Button ID
           clone.querySelector(".edit-action").dataset.userID = usr.userID
           clone.querySelector(".password-action").dataset.userID = usr.userID
           clone.querySelector(".suspend-action").dataset.userID = usr.userID

           userCardFrag.append(clone) 
        }

        userCardCont.append(userCardFrag)
    }    

    const editUser = (usrID,action) => {
        const {editUserInfo} = DOM.popups
        const {confirmUser} = DOM.Btns
        const usr = State.users[usrID]
        
        // Styles
        if (action == 'view'){
            setText(editUserInfo,"section-header",`Editing Info for ${usr.FirstName}...`)
            setUserContent(usr)

            editUserInfo.style.display = 'grid'
            confirmUser.textContent = 'Edit User'
            confirmUser.dataset.userID = usrID
        }

        // Logic
        if (action == 'edit'){
            for (const el of DOM.popupEls.userEls){
                el.classList.remove('input-valid','input-error')
                if (!validateInput('User-Details',el)) return el.classList.add('input-error')
                if (el.value != usr[el.dataset.key]) usr[el.dataset.key] = el.value.trim()
            }

            State.searchSets.userSet = new Set(Object.values(State.users))
            renderUsers()

            // Final Confirmation
            State.ElStates.cActionTxt = 'Confirm Edition?'
            State.ElStates.cMoralTxt = 'Are you sure you want to edit this user detail?'
            State.ElStates.cConsequenceTxt = 'This action is permanent.'  

            State.currentAction = 'USER_ACTION'
            State.currentOP = 'EDIT_DETAILS'
            State.currentUserID = usrID
            viewFinalConfirmation('info')
        }   
    }

    const editUserPassword = (usrID,action) => {
        const {editUserPass} = DOM.popups
        const {confirmUserP} = DOM.Btns
        const usr = State.users[usrID]

        // Styles
        if (action == 'view'){
            setText(editUserPass,"section-header",`Editing Password for ${usr.FirstName}...`)
            setUserContent(usr)

            editUserPass.style.display = 'grid'
            confirmUserP.textContent = 'Change Password'
            confirmUserP.dataset.userID = usrID
        }       

        // Logic
        const {newP,newPConfirm} = DOM.popupEls.userPEls
        if (action == 'change'){
            newP.classList.remove('input-valid','input-error')
            newPConfirm.classList.remove('input-valid','input-error')

            if (!validateInput('User-Pass',newP)) return newP.classList.add('input-error')
            if (!validateInput('User-Pass',newPConfirm)) return newPConfirm.classList.add('input-error')
            State.users[usrID].Password = newP.value.trim()

            // Final Confirmation
            State.ElStates.cActionTxt = 'Confirm Edition?'
            State.ElStates.cMoralTxt = 'Are you sure you want to edit this user Password?'
            State.ElStates.cConsequenceTxt = 'This action is permanent.'  

            State.currentAction = 'USER_ACTION'
            State.currentOP = 'EDIT_PASSWORD'
            State.currentUserID = usrID
            viewFinalConfirmation('info')
        }
    }

    const suspendUser = (usrID) => {
        const {confirmConfirm}  = DOM.Btns
        const usr = State.users[usrID]
        
        State.currentAction = 'USER_ACTION'
        State.currentUserID = usrID 
        if (usr.Status == 'active'){
            State.ElStates.cActionTxt = 'Confirm User Suspension?'
            State.ElStates.cMoralTxt = 'Are you sure you want to suspend this user?'
            State.ElStates.cConsequenceTxt = 'This action is reversible.'   

            State.currentOP = 'SUSPEND_USER'
            viewFinalConfirmation('suspend')   
        }else if(usr.Status == 'suspended'){
            State.ElStates.cActionTxt = 'Confirm User Re-instation?'
            State.ElStates.cMoralTxt = 'Are you sure you want to re-instate this user?'
            State.ElStates.cConsequenceTxt = 'This action is reversible.'   

            State.currentOP = 'UNSUSPEND_USER'
            viewFinalConfirmation('re-instate')  
        }
    }
    // =======================================               
    // 6. CORE -> BOOKINGS TAB
    // =======================================     
   const renderBookings = () => {
        const {bookingCard} = DOM.templates
        const {bookingCardCont} = DOM.containers
        const {bookingCardFrag} = DOM.frags  

        const arrBookings = Array.from(State.searchSets.bookingSet)
        if (arrBookings.length < 1){
            renderNoResult(bookingCardCont)
            return;
        }

        bookingCardCont.innerHTML = "";
        for (let i = 0; i < arrBookings.length; i++) {
            const bk = arrBookings[i]
            const clone = bookingCard.content.cloneNode(true)  

            setText(clone,"booking-ref",`${bk.bookingID}`)
            setText(clone,"booking-user",
                `${State.users[bk.userID].FirstName} ${State.users[bk.userID].LastName}`)

            setText(clone,"booking-event",`${State.events[bk.eventID].eventName}`)
            setText(clone,"booking-tickets",`${Info.tltEntries[bk.bookingID]}`)
            setText(clone,"booking-total",`${FMT.currency.format(bk.totalPrice)}`)
            setText(clone,"booking-date",`${FMT.date.format(bk.dateTimeBooked)}`)

            const status = clone.querySelector('.booking-status')
            const action = clone.querySelector('.booking-action')

            if (bk.paymentStatus.toLowerCase() == 'paid'){ 
                status.classList.add('booking-status-confirmed')
                action.classList.add('booking-status-confirmed')
            }

            if (bk.paymentStatus.toLowerCase() == 'unpaid'){
                status.classList.add('booking-status-unpaid')
                action.classList.add('booking-status-unpaid')
            }   

            if (bk.bookingStatus.toLowerCase() == 'cancelled'){
                status.classList.add('booking-status-cancelled')
                action.classList.add('booking-status-cancelled')
            }   
            
            const cAction = clone.querySelector('.cancel-action')
            cAction.dataset.bookingID = bk.bookingID
            cAction.dataset.eventID = bk.eventID
            bookingCardFrag.append(clone) 
        }

        bookingCardCont.append(bookingCardFrag)
    };    
    
    const cancelBooking = (bId,eId) => {
        const bk = State.bookings[bId]
        
        State.currentAction = 'BOOKING_ACTION'
        State.currentOP = 'CANCEL_BOOKING'
        State.currentBookingID = bId
        State.currentEvent = eId

        const validStatus = bk.bookingStatus == 'Active' && bk.paymentStatus == 'paid'
        const invalidStatus = bk.bookingStatus == 'Active' && bk.paymentStatus == 'expired'
        if (validStatus || invalidStatus){
            State.ElStates.cActionTxt = 'Confirm Booking Cancellation?'
            State.ElStates.cMoralTxt = 'Are you sure you want to cancel this booking?'
            State.ElStates.cConsequenceTxt = 'This action is permanent.'           
        }
        
        viewFinalConfirmation(validStatus ? 'delete' : 'info')     
    }

    const searchHandler = () => {
       const {event,user,booking} = DOM.searchBars 
       const {eventSet,userSet,bookingSet} = State.searchSets

        // Events Term
        eventSet.clear()
        Object.values(State.events).filter(ev => {
            const eventSearchTerm = event.value.toLowerCase();
            if (ev.eventName.toLowerCase().startsWith(eventSearchTerm))
                eventSet.add(ev)
        })

        if (event.value.length < 1){
            State.searchSets.eventSet = new Set(Object.values(State.events))
        }   

        // Users Term
        userSet.clear()
        Object.values(State.users).filter(usr => {
            const userSearchTerm = user.value.toLowerCase();
            if (usr.FirstName.toLowerCase().startsWith(userSearchTerm)
                || usr.LastName.toLowerCase().startsWith(userSearchTerm)
                || usr.Permission.toLowerCase().startsWith(userSearchTerm))

                userSet.add(usr)
        })  

        if (user.value.length < 1){
            State.searchSets.userSet = new Set(Object.values(State.users))
        }     

        // Bookings Term
        bookingSet.clear()
        Object.values(State.bookings).filter(bk => {
            const bookingSearchTerm = booking.value.toLowerCase();

            const firstName = State.users[bk.userID].FirstName.toLowerCase()
            const lastName = State.users[bk.userID].LastName.toLowerCase()
            const eventName = State.events[bk.eventID].eventName.toLowerCase()

            if (firstName.startsWith(bookingSearchTerm) 
                || lastName.startsWith(bookingSearchTerm) 
                || eventName.startsWith(bookingSearchTerm)
                || bk.bookingID.startsWith(bookingSearchTerm))

                bookingSet.add(bk)
        })   
        
        if (booking.value.length < 1){
            State.searchSets.bookingSet = new Set(Object.values(State.bookings))
        }

        renderBookings(); renderUsers(); renderEvents();
    }

    // =======================================
    // 7. INITIALIZATION
    // =======================================  
    
    const setupEventListeners = () => {

        // Sections
        DOM.sectionBtns.forEach(el => {
            el.addEventListener('click',() => {changeContent(el.dataset.contentmap)})
        })
        DOM.sectionBtns[3].click();      

        Object.values(DOM.searchBars).forEach(el => {
           el.addEventListener('input',searchHandler) 
        })

        // Final Confirmation
        const {cancelConfirm, confirmConfirm} = DOM.Btns
        const closeAll = (state) => {
            if (state == 'Confirmed'){
                Object.values(DOM.popups).forEach(el => {
                    el.style.display = 'none'
                })
            }else{
                DOM.popups.confirmation.style.display = 'none'
            }

            State.ElStates.cConfirmationState = state
            finalAction()
        }

        cancelConfirm.addEventListener('click', () => {closeAll('Denied')})
        confirmConfirm.addEventListener('click', () => {closeAll('Confirmed')})

        const {editingEvents,editUserInfo,editUserPass} = DOM.popups
        const {addEvents,confirmEdit,cancelEdit,
               confirmUser,cancelUser,confirmUserP,cancelUserP
        } = DOM.Btns

        // 1. Delegation for Event Actions
        const eventFt = DOM.popupEls.editingEventsEls[2]
        const titleEl = DOM.popupEls.editingEventsEls[0]

        eventFt.addEventListener('click',() => {
            toggleButton(eventFt.value == 1 ? 0 : 1)
        })
        DOM.containers.eventCardCont.addEventListener('click', (e) => {
            const tar = e.target
            if (tar.classList.contains('edit-action')) editEvents(tar.dataset.eventID,'view')
            if (tar.classList.contains('delete-action')) deleteEvent(tar.dataset.eventID)
            
        })

        cancelEdit.addEventListener('click',() => {editingEvents.style.display = 'none'})
        confirmEdit.addEventListener('click',() => {
            const state = confirmEdit.dataset.state

            if (state == 'editing') editEvents(confirmEdit.dataset.eventID,'edit')
            if (state == 'adding') addEvent('add',confirmEdit.dataset.eventID)
        })

        // Adding Events
        addEvents.addEventListener('click',() => {addEvent('view',addEvents.dataset.eventID)})
        titleEl.addEventListener('input',() => {
            const state = confirmEdit.dataset.state
            if (state == 'adding') setAddContent()
        })

        // 2. Delegation for User Actions
        DOM.containers.userCardCont.addEventListener('click', (e) => {
            const tar = e.target
            if (tar.classList.contains('edit-action')) editUser(Number(tar.dataset.userID),'view')
            if (tar.classList.contains('password-action')) editUserPassword(Number(tar.dataset.userID),'view')
            if (tar.classList.contains('suspend-action')) suspendUser(Number(tar.dataset.userID))
        })
        cancelUser.addEventListener('click',() => {editUserInfo.style.display = 'none'})
        confirmUser.addEventListener('click',() => {editUser(Number(confirmUser.dataset.userID),'edit')})

        cancelUserP.addEventListener('click',() => {editUserPass.style.display = 'none'})
        confirmUserP.addEventListener('click',() => {editUserPassword(Number(confirmUserP.dataset.userID),'change')})
        
        // 3. Delegation for Booking Actions
        DOM.containers.bookingCardCont.addEventListener('click', (e) => {
           const tar = e.target 
           if (tar.classList.contains('cancel-action')) 
            cancelBooking(tar.dataset.bookingID,(tar.dataset.eventID))  
        })
    }

    (async () => {
        const DATA = await base.request({ 
            URL: window.location.href, 
            Data: { OP: 'GET_ADMIN_PROFILE' } 
        });
        
        // Convert All
        State.events = {}
        for (let [id, ev] of Object.entries(DATA.events)){
            if (ev.eventStatus == 'Deleted') continue

            ev.eventStart = new Date(ev.eventStart)
            ev.eventEnd = new Date(ev.eventEnd)
            State.events[ev.eventID] = ev
        }

        State.users = {}
        for (let [id, usr] of Object.entries(DATA.users)){
            usr.DateJoined = new Date(usr.DateJoined)
            State.users[Number(id)] = usr
        }

        State.bookings = {}
        for (let [id, bk] of Object.entries(DATA.bookings)){
            bk.dateTimeBooked = new Date(bk.dateTimeBooked)
            State.bookings[bk.bookingID] = bk

            // Get Event Revenues
            const idx_e = Info.evRevenues[State.events[bk.eventID].eventName]
            Info.evRevenues[State.events[bk.eventID].eventName] = (idx_e || 0) + bk.totalPrice;

            // Get Total Bookings
            const idx_u = Info.tltBookings[bk.userID]
            Info.tltBookings[bk.userID] = (idx_u || 0) + 1;
        }

        State.bookingEntries = {}
        for (let [id, en] of Object.entries(DATA.bookingEntries)){
            en.entries = new Date(en.entries)
            State.bookingEntries[en.bookingID] = en

            // Get Total Entries
            const idx_e = Info.tltEntries[en.bookingID]
            Info.tltEntries[en.bookingID] = (idx_e || 0) + 1;    
        }

        State.searchSets.eventSet = new Set(Object.values(State.events))
        State.searchSets.userSet = new Set(Object.values(State.users))
        State.searchSets.bookingSet = new Set(Object.values(State.bookings))

        setupEventListeners()

        renderDashboard(); renderEvents()
        renderUsers(); renderBookings()
    })();

    // =======================================
    // 8. EXIT POINT
    // =======================================  
    const finalAction = async () => {
        if (State.ElStates.cConfirmationState == 'Denied') return;

        const send = async (action,op,id,data = 'Empty') => {
            const result = await base.request({ 
                URL: '/actions', 
                Data: { 
                    ACTION: action,
                    OP: op,
                    ID: id,
                    DATA: data 
                } 
            });         
            
            return result
        }

        const Action = State.currentAction

        // Event Actions
        if (Action == 'EVENT_ACTION'){
            const OP = State.currentOP
            const ID = State.currentEvent.eventID 
            const EV = State.currentEvent 

            const actionResult = await send(Action,OP,ID,EV)
            console.log("Events",actionResult)     
        }

        // User Actions
        if (Action == 'USER_ACTION'){
            const OP = State.currentOP
            const ID = State.currentUserID
            const USR = State.users[ID]

            const actionResult = await send(Action,OP,ID,USR)
            if (OP == 'EDIT_PASSWORD') handleLoginState()    
            if (OP == 'SUSPEND_USER') State.users[ID].Status = 'suspended'       
            if (OP == 'UNSUSPEND_USER') State.users[ID].Status = 'active' 
 
            console.log("Users",actionResult)  
            
            State.searchSets.userSet = new Set(Object.values(State.users))
            renderUsers()                
        }

        // Booking Actions
        if (Action == 'BOOKING_ACTION'){
            const OP = State.currentOP
            const ID = State.currentBookingID
            const EID = State.currentEvent.eventID

            const actionResult = await send(Action,OP,ID,EID)
            if (OP == 'CANCEL_BOOKING') State.bookings[ID].bookingStatus = 'cancelled'  

            console.log("Booking",actionResult)   
            
            State.searchSets.bookingSet = new Set(Object.values(State.bookings))
            renderBookings()  
        }        
    }
})();    