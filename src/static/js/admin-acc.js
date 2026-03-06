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

        buttons : {
            addEventsBtn : document.querySelector(".add-btn"),
            cancelEventBtn : document.querySelector(".edit-add-events-cancel-btn"),
            confirmEventBtn : document.querySelector(".edit-add-events-confirm-btn"),
            confirmConfirmationBtn : document.querySelector(".confirm-confirmation"),
            cancelConfirmationBtn : document.querySelector(".cancel-confirmation"),
            confirmUserInfoBtn : document.querySelector(".user-info-confirm-btn"),
            cancelUserInfoBtn : document.querySelector(".user-info-cancel-btn"),
            confirmUserPassBtn : document.querySelector(".user-pass-confirm-btn"),
            cancelUserPassBtn : document.querySelector(".user-pass-cancel-btn"),            
        },

        Inputs : {
            events : {
                eventName : document.querySelector(".evnt-title-to-update"),  
                suitability : document.querySelector(".evnt-cat-to-update"),  
                eventFt : document.querySelector(".evnt-ft-to-update"),  
                eventStart : document.querySelector(".evnt-start-to-update"),  
                eventEnd : document.querySelector(".evnt-end-to-update"),
                eventDesc : document.querySelector(".evnt-desc-to-update"),
                eventPrice : document.querySelector(".evnt-price-to-update"),
                eventAvailability : document.querySelector(".evnt-availability-to-update"),
                eventOrganizers : document.querySelector(".evnt-org-to-update"),
                eventRating : document.querySelector(".evnt-rating-to-update"),
                eventStatus : document.querySelector(".evnt-status-to-update"), 
                venueName : document.querySelector(".venue-name-to-update"),
                venueAddress : document.querySelector(".venue-address-to-update"),
                venueCapacity : document.querySelector(".venue-capacity-to-update"),
            },

            userInfo : {
                firstName : document.querySelector(".frst-name-to-update"),
                lastName : document.querySelector(".last-name-to-update"),
                email : document.querySelector(".email-to-update"),
                phone : document.querySelector(".phone-to-update"),
                password : document.querySelector(".password-to-update"),
                new_password : document.querySelector(".new-password-to-update"), 
            }
        },

        popups : {
            editingEvents : document.querySelector(".edit-add-events"),
            confirmation : document.querySelector(".final-confirmation"),
            editUserInfo : document.querySelector(".change-user-info"),
            editUserPass : document.querySelector(".change-password-info"),
        },

        templates : {
            recentEventCard : document.getElementById("recent-card-template"),
            eventCard : document.getElementById("event-card-template"),
            userCard : document.getElementById("user-card-template"),
            bookingCard : document.getElementById("booking-card-template"),
            noResultTables : document.getElementById("no-result-for-tables"),
        },

        containers : {
            recentEventCardCont : document.querySelector(".event-card-ctn"),
            eventCardCont : document.querySelector(".event-list-ctn"),
            userCardCont : document.querySelector(".user-list-ctn"),
            bookingCardCont : document.querySelector(".booking-list-ctn"),
        },

        fragments : {
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

        searchSets : {
            eventSet : new Set(),
            userSet : new Set(),
            bookingSet : new Set()
        },

        dashboardSection : {
            revenueEl : document.querySelector(".revenue-El"),
            bookingEl : document.querySelector(".booking-El"),
            eventEl : document.querySelector(".event-El"),
            userEl : document.querySelector(".user-El"),
        }
    };    

    const State = {
        infoLists : {
            events : null,
            bookings : null,
            users : null
        },

        cardRevenue : {},
        usertltBookings : {},
        bookingCache : {},
        userCache : {},
        now : new Date(),
        currentUserID : 0,
    };

    const CONFIG = {
        CLASSES : {
            VALID : 'input-valid',
            INVALID : 'input-error'
        }
    }

    const REGEX = {
      EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      PASS: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*\[\]]).{12,}$/,
      WHITELIST: new Set(['test', 'standard', 'test123', 'standard123'])       
    };

    const Updates = {
        events : {},
        userDetails: {},
    };

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

    const renderNoResult = (type, cont, val = "No Results...") => {
        if (type == 'tables'){
            cont.innerHTML = "";
            const noResult = DOM.templates.noResultTables.content.cloneNode(true)
            noResult.querySelector(".no-result-txt").textContent = val
            cont.append(noResult) 
        }
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

    // Change the current popup state -> editing / adding events
    const changeEventPopupState = (actionType = 'AddEvents', displayType = 'none', eventID) => {
        const header = DOM.popups.editingEvents.querySelector(".section-header")

        if (displayType == 'visible') {
            DOM.popups.editingEvents.style.display = 'grid'
            const {confirmEventBtn} = DOM.buttons
            confirmEventBtn.textContent = actionType == 'EditEvent' ? 'Edit Event' : 'Create Event'
            header.textContent = actionType == 'EditEvent' ? `Editing ${State.infoLists.events[eventID].eventName}...` : 'Add New Event'
            if (actionType == 'EditEvent'){
                const event = State.infoLists.events[eventID]
                for (const [key, element] of Object.entries(DOM.Inputs.events)) {
                   element.value = event[key] instanceof Date? FMT.date.format(event[key]) : event[key]
                   
                //    const ft = (key == 'eventFt') ? event[key] : null
                //    if(ft){
                //         DOM.Inputs.events.eventFt.dataset.state = 'off'
                //    }else{
                //         DOM.Inputs.events.eventFt.dataset.state = 'on'
                //    } 
                }
                toggleButton()
            }else{
                Object.values(DOM.Inputs.events).forEach(el => {
                    el.value = ""
                })
            }
        }else{
            DOM.popups.editingEvents.style.display = 'none'
        }

    }

    // Change the user popup state -> editing user details
    const changeUserInfoPopupState = (info) => {
        const header = DOM.popups.editingEvents.querySelector(".section-header")

        const {firstName, lastName, email, phone} = DOM.Inputs.userInfo
        DOM.popups.editUserInfo.style.display = 'grid'
        header.textContent = `Update details for ${info.FirstName}`

        firstName.value = info.FirstName
        lastName.value = info.LastName
        email.value = info.Email
        phone.value = info.Phone

        State.currentUserID = info.userID
    }

    // View final confirmation
    const viewFinalConfirmation = (type, actionText = '', moralText = '', conseqText = '') => {
        const {confirmation} = DOM.popups
        confirmation.classList.remove('deletion')
        confirmation.classList.remove('information')

        if (type == 'delete') {
            confirmation.style.display = 'grid'
            confirmation.classList.add('deletion')
        }else if (type  == 'info'){
            confirmation.style.display = 'grid'
            confirmation.classList.add('information')
        }else{
            confirmation.style.display = 'none'
        }

        const actionTxt = confirmation.querySelector(".action-txt")
        const moralTxt = confirmation.querySelector(".moral-txt")
        const conseqTxt = confirmation.querySelector(".consequence-txt")

        actionTxt.textContent = actionText ? actionText : "Confirm Deletion?";
        moralTxt.textContent = moralText ? moralText : "Are you sure you want to complete this action?";
        conseqTxt.textContent = conseqText ? conseqText : "This action is permanent.";
    }

    // Confirm Confirmation
    const confirmConfirmation = async () => {
        const state = DOM.buttons.confirmConfirmationBtn.dataset.state
        const user_action = DOM.buttons.confirmConfirmationBtn.dataset.user_action
        const eventName = DOM.buttons.confirmConfirmationBtn.dataset.eventName
        
        if (state.toLowerCase() == 'add_event' || state.toLowerCase() == 'edit_event'){        
            const response = await base.request({ 
                URL: window.location.href, 
                Data: { OP: state == 'add_event' ? 'ADD_EVENT' : 'EDIT_EVENT', eventData : Updates.events} 
            });
        }

        if (state.toLowerCase() == 'delete_event'){
            const response = await base.request({ URL: window.location.href, Data: { OP: "DELETE_EVENT", eventName: eventName} });
        }

        if (state.toLowerCase() == 'edit_user_details'){
            const response = await base.request({ 
                URL: window.location.href, Data: { OP: "EDIT_USER_DETAILS", usrID: State.currentUserID} 
            });
        }

        if (state.toLowerCase() == 'edit_user_password'){            
            const response = await base.request({ 
                URL: window.location.href, Data: { OP: "EDIT_USER_PASSWORD", usrID: State.currentUserID, 
                    new_pass : DOM.Inputs.userInfo.new_password.value
                } 
            });
        }

        if (state.toLowerCase() == 'edit_user_status'){
            const response = await base.request({ 
                URL: window.location.href, Data: { OP: "EDIT_USER_STATUS", usrID: State.currentUserID, 'action' : user_action} 
            });
        };

        DOM.popups.confirmation.style.display = 'none'
        DOM.popups.editingEvents.style.display = 'none'
        DOM.popups.editUserPass.style.display = 'none'
        DOM.popups.editUserInfo.style.display = 'none'
    };  

    // Update eventCreate List
    const updateEvent = () => {

        // Update Events
        Updates.events['eventName'] = DOM.Inputs.events.eventName.value
        Updates.events['suitability'] = DOM.Inputs.events.suitability.value
        Updates.events['eventFt'] = DOM.Inputs.events.eventFt.value
        Updates.events['eventStart'] = new Date(DOM.Inputs.events.eventStart.value).toISOString().split('T00')[0]
        Updates.events['eventEnd'] = new Date(DOM.Inputs.events.eventEnd.value).toISOString().split('T00')[0]
        Updates.events['eventDesc'] = DOM.Inputs.events.eventDesc.value
        Updates.events['eventPrice'] = DOM.Inputs.events.eventPrice.value
        Updates.events['eventAvailability'] = DOM.Inputs.events.eventAvailability.value
        Updates.events['eventOrganizers'] = DOM.Inputs.events.eventOrganizers.value
        Updates.events['eventRating'] = DOM.Inputs.events.eventRating.value
        Updates.events['eventStatus'] = DOM.Inputs.events.eventStatus.value
        Updates.events['venueName'] = DOM.Inputs.events.venueName.value
        Updates.events['venueAddress'] = DOM.Inputs.events.venueAddress.value
        Updates.events['venueCapacity'] = DOM.Inputs.events.venueCapacity.value

        // Update User
        Updates.userDetails['FirstName'] = DOM.Inputs.userInfo.firstName.value.toLowerCase().trim()
        Updates.userDetails['LastName'] = DOM.Inputs.userInfo.lastName.value.toLowerCase().trim()
        Updates.userDetails['Email'] = DOM.Inputs.userInfo.email.value.toLowerCase().trim()
        Updates.userDetails['Phone'] = DOM.Inputs.userInfo.firstName.value
    };

    // edit/add events toggle button
    const toggleButton = () => {
        const {eventFt} = DOM.Inputs.events

        const state = eventFt.dataset.state
        if (state == 'off'){ eventFt.dataset.state = 'on'      
            eventFt.querySelector('.check-indicator').classList.replace('check-indicator-off','check-indicator-on')  
            eventFt.value = true
        }else if (state == 'on'){eventFt.dataset.state = 'off'
            eventFt.querySelector('.check-indicator').classList.replace('check-indicator-on','check-indicator-off')  
            eventFt.value = false
        }    
    };

    const validateEventsInput = (el) => {
        const {VALID, INVALID} = CONFIG.CLASSES
        
        el.classList.remove(VALID)
        el.classList.remove(INVALID)

        const {eventName, suitability, eventFt, eventStart, eventEnd,
               eventDesc, eventPrice, eventAvailability, eventOrganizers,
               eventRating, eventStatus, venueName, venueAddress, venueCapacity
        }  = DOM.Inputs.events

        

        if (el == eventPrice || el == eventAvailability || el == eventRating || el == venueCapacity){
            if (Number(el.value) == undefined){el.classList.add(INVALID)}
            else {el.classList.add(VALID)}
        }else if (el != eventStart || el != eventEnd){
            if (el.value.length < 3){el.classList.add(INVALID)}
            else{el.classList.add(VALID)}
        }

        if (el == eventStart || el == eventEnd){
            if (new Date(el.value) == undefined) {el.classList.add(INVALID)}
            else {el.classList.add(VALID)}
        }
    }

    // =======================================
    // 2. CORE -> DISPLAY ALL INFO
    // =======================================   
    const renderDashboard = () => {
        const {events, bookings, users} = State.infoLists
        const {revenueEl,bookingEl,eventEl,userEl} = DOM.dashboardSection
        const {recentEventCard} = DOM.templates
        const {recentEventCardCont} = DOM.containers
        const {recentEventFrag} = DOM.fragments

        // Define Variables
        let totalRevenue = 0, totalBookings = 0, upcomingEvents = 0, activeUsers = 0;
        recentEventCardCont.innerHTML = "";

        // 1. Set Statics info

        // Get total revenue  / bookings   
        bookings.forEach(bk => {
            totalRevenue += bk.totalPrice;
            totalBookings++;
        })

        // Get upcoming events.
        events.forEach(ev => upcomingEvents += State.now < ev.eventStart ? 1 : 0)

        // Get Active users.
        users.forEach(us => activeUsers += us.Status == 'Active' ? 1 : 0)

        revenueEl.textContent = `${FMT.currency.format(totalRevenue)}`
        bookingEl.textContent = `${totalBookings}`
        eventEl.textContent = `${upcomingEvents}`
        userEl.textContent = `${activeUsers}`

        // 2. Set Dynamic Cards
        let any = false
        events.forEach(ev => {
            const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;

            const upcoming =  State.now < ev.eventStart && (ev.eventStart - State.now) <= fifteenDaysInMs 
            const completed = State.now > ev.eventStart && (State.now - ev.eventStart) <= fifteenDaysInMs 
            
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

        if (!any) {
            const noResult = document.createElement("h1")
            noResult.textContent = "No Recent Events..."
            noResult.classList.add("no-result")
            recentEventFrag.append(noResult) 
        }

        recentEventCardCont.append(recentEventFrag)
    };

    const renderEvents = (events) => {
        const {eventCard} = DOM.templates
        const {eventCardCont} = DOM.containers
        const {eventCardFrag} = DOM.fragments   

        if (events.size == 0){
            renderNoResult('tables',eventCardCont,'No Events Found...'); 
            return
        }
        
        eventCardCont.innerHTML = "";
        for (const [id, ev] of Object.entries(Array.from(events))) {
            const clone = eventCard.content.cloneNode(true)  

            setText(clone,"evnt-titl",ev.eventName)
            setText(clone,"evnt-cat",ev.suitability)

            setText(clone,"card-date",`${FMT.date.format(ev.eventStart)}`)
            setText(clone,"card-loc",`${ev.venueName}, ${ev.venueAddress}`)

            setText(clone,"card-price",`${FMT.currency.format(ev.eventPrice)}`)
            setText(clone,"card-tickets",`${ev.eventAvailability}`)

            const revenue = FMT.currency.format(State.cardRevenue[ev.eventName]? State.cardRevenue[ev.eventName] : 0)
            setText(clone,"card-revenue",`${revenue}`)
            
            const status = clone.querySelector('.card-status')
            status.classList.add(State.now < ev.eventStart ? 'status-upcoming' : 'status-completed')

            const edit_action = clone.querySelector('.edit-action')
            edit_action.addEventListener('click', () => {
                DOM.buttons.confirmEventBtn.dataset.state = 'edit'
                changeEventPopupState('EditEvent','visible',id)
            })

            const delete_action = clone.querySelector('.delete-action')
            delete_action.addEventListener('click', () => {
                DOM.buttons.confirmConfirmationBtn.dataset.state = 'delete_event'
                DOM.buttons.confirmConfirmationBtn.dataset.eventName = ev.eventName
                viewFinalConfirmation('delete',
                  'Confirm Event Deletion?',
                  'Are you sure you want to delete this event?',
                  'This action is permanent.'  
                )
            })
            eventCardFrag.append(clone)
            
        }

        eventCardCont.append(eventCardFrag)
    }

    const renderUsers = (users) => {
        const {userCard} = DOM.templates
        const {userCardCont} = DOM.containers
        const {userCardFrag} = DOM.fragments  
        
        if (users.size == 0){
            renderNoResult('tables',userCardCont,'No User Found...'); return
        }

        userCardCont.innerHTML = "";
        users.forEach(usr => {
           const clone = userCard.content.cloneNode(true)   

           setText(clone,"user-name",`${usr.FirstName} ${usr.LastName}`)
           setText(clone,"user-email",`${usr.Email}`)
           
           const tltBooking = State.usertltBookings[usr.userID]
           setText(clone,"user-bookings",tltBooking ? tltBooking : 0)
           setText(clone,"user-joined",`${FMT.date.format(usr.DateJoined)}`)
            
           const status = clone.querySelector('.user-status')
           const action = clone.querySelector('.user-action')
           if (usr.Status == 'Active'){ status.classList.add('user-status-active')
                action.classList.add('user-status-active')
           }
           if (usr.Status == 'Suspended'){status.classList.add('user-status-suspended')
                action.classList.add('user-status-suspended')
           }
           
           const role = clone.querySelector('.user-role')
           role.classList.add(usr.Permission.toLowerCase() == 'admin' ? 'role-admin' : 'role-user')

           const user_action = document.querySelector(".user-action");
           const edit_user_action = clone.querySelector('.edit-action')
           edit_user_action.addEventListener('click',() => {
                DOM.buttons.confirmUserInfoBtn.dataset.state = 'edit_user_details'
                changeUserInfoPopupState(usr)
           })

           const edit_pass_action = clone.querySelector('.password-action')
           edit_pass_action.addEventListener('click',() => {
                DOM.buttons.confirmUserInfoBtn.dataset.state = 'edit_user_password'
                State.currentUserID = usr.userID
                DOM.popups.editUserPass.style.display = 'grid'
           })

           const edit_status_action = clone.querySelector('.suspend-action')
           edit_status_action.addEventListener('click',() => {
                State.currentUserID = usr.userID
                DOM.buttons.confirmConfirmationBtn.dataset.state = 'edit_user_status'

                if (user_action.classList.contains('user-status-active')){
                    DOM.buttons.confirmConfirmationBtn.dataset.user_action = 'suspension'
                    viewFinalConfirmation('info',
                        'Confirm User Suspension?',
                        'Are you sure you want to suspend this user?',
                        'This action is reversible.'  
                    )  
                }else if (user_action.classList.contains('user-status-suspended')){
                    DOM.buttons.confirmConfirmationBtn.dataset.user_action = 'un-suspend'
                    viewFinalConfirmation('info',
                        'Confirm User re-instation?',
                        'Are you sure you want to re-instate this user?',
                        'This action is reversible.'  
                    )                     
                }

           })

           userCardFrag.append(clone) 
        })

        userCardCont.append(userCardFrag)
    }

    const renderBookings = (booking) => {
        const {bookingCard} = DOM.templates
        const {bookingCardCont} = DOM.containers
        const {bookingCardFrag} = DOM.fragments  

        if (booking.size == 0){
            renderNoResult('tables',bookingCardCont,'No Bookings Found...'); return
        }

        bookingCardCont.innerHTML = "";
        booking.forEach(bk => {
            const clone = bookingCard.content.cloneNode(true)  

            setText(clone,"booking-ref",`${bk.bookingID}`)
            setText(clone,"booking-user",`${State.userCache[bk.userID][0]} 
                                          ${State.userCache[bk.userID][1]}`)

            setText(clone,"booking-event",`${State.infoLists.events[bk.eventID - 1].eventName}`)
            setText(clone,"booking-total",`${bk.totalPrice}`)
            setText(clone,"booking-date",`${FMT.date.format(bk.dateTimeBooked)}`)

            const status = clone.querySelector('.booking-status')
            const action = clone.querySelector('.booking-action')

            if (bk.paymentStatus.toLowerCase() == 'confirmed'){ 
                status.classList.add('booking-status-confirmed')
                action.classList.add('booking-status-confirmed')
            }

            if (bk.paymentStatus.toLowerCase() == 'cancelled'){
                status.classList.add('booking-status-cancelled')
                action.classList.add('booking-status-cancelled')
            }   

            if (bk.paymentStatus.toLowerCase() == 'expired'){
                status.classList.add('booking-status-unpaid')
                action.classList.add('booking-status-unpaid')
            }   

            bookingCardFrag.append(clone) 
        }) 

        bookingCardCont.append(bookingCardFrag)
    };

    // =======================================
    // 3. CORE -> SEACRH HANDLER
    // =======================================   
    const searchHandler = () => {
        const {event,user,booking} = DOM.searchBars
        const {eventSet,userSet,bookingSet} = DOM.searchSets

        // 1. Events Term
        DOM.searchSets.eventSet.clear()
        State.infoLists.events.filter(ev => {
            const eventSearchTerm = event.value.toLowerCase();
            if (ev.eventName.toLowerCase().startsWith(eventSearchTerm))
                eventSet.add(ev)
        })
        
        // 2. User Term
        DOM.searchSets.userSet.clear()
        State.infoLists.users.filter(usr => {
            const userSearchTerm = user.value.toLowerCase();
            if (usr.FirstName.toLowerCase().startsWith(userSearchTerm)
                || usr.LastName.toLowerCase().startsWith(userSearchTerm)
                || usr.Permission.toLowerCase().startsWith(userSearchTerm))

                userSet.add(usr)
        })    
        
        // 3. Booking Term
        DOM.searchSets.bookingSet.clear()
        const filteredBookings = State.infoLists.bookings.filter(bk => {
            const bookingSearchTerm = booking.value.toLowerCase();

            const firstName = State.userCache[bk.userID][0].toLowerCase()
            const lastName = State.userCache[bk.userID][1].toLowerCase()
            const eventName = State.infoLists.events[bk.eventID].eventName.toLowerCase()

            if (firstName.startsWith(bookingSearchTerm) 
                || lastName.startsWith(bookingSearchTerm) 
                || eventName.startsWith(bookingSearchTerm)
                || bk.bookingID.startsWith(bookingSearchTerm))

                bookingSet.add(bk)
        })   

        renderEvents(DOM.searchSets.eventSet ? DOM.searchSets.eventSet : State.infoLists.events)
        renderUsers(DOM.searchSets.userSet ? DOM.searchSets.userSet : State.infoLists.users)
        renderBookings(DOM.searchSets.bookingSet ? DOM.searchSets.bookingSet : State.infoLists.bookings)
    };

    // =======================================
    // 4. INITIALIZATION
    // =======================================   

    const setupEventListeners = () => {

        // Sections
        DOM.sectionBtns.forEach(el => {
            el.addEventListener('click',() => {changeContent(el.dataset.contentmap)})
        })
        DOM.sectionBtns[0].click();

        // SearchBars
        Object.values(DOM.searchBars).forEach(el => {
           el.addEventListener('input',searchHandler) 
        })

        DOM.buttons.addEventsBtn.addEventListener('click',() => {
            DOM.buttons.confirmEventBtn.dataset.state = 'add'
            changeEventPopupState('AddEvents','visible')
        })
        DOM.buttons.cancelEventBtn.addEventListener('click',() => {changeEventPopupState();})
        DOM.buttons.confirmEventBtn.addEventListener('click',() => { 

            if (DOM.buttons.confirmEventBtn.dataset.state == 'add'){
                DOM.buttons.confirmConfirmationBtn.dataset.state = 'add_event'
                viewFinalConfirmation('info',
                    'Confirm Event Addition?',
                    'Are you sure you want to add this event to the database?',
                    'This action is permanent.'  
                )
            }else if(DOM.buttons.confirmEventBtn.dataset.state == 'edit'){
                DOM.buttons.confirmConfirmationBtn.dataset.state = 'edit_event'
                viewFinalConfirmation('info',
                    'Confirm Event Editing?',
                    'Are you sure you want to edit this event?',
                    'This action is permanent.'  
                )
            }

        })

        Object.values(DOM.Inputs.events).forEach(el => {
            el.addEventListener('input',() => {validateEventsInput(el)});
        })

        DOM.buttons.confirmUserInfoBtn.addEventListener('click', () => {

            const state = DOM.buttons.confirmUserInfoBtn.dataset.state
            if (state == 'edit_user_details'){
                DOM.buttons.confirmConfirmationBtn.dataset.state = 'edit_user_details'
                viewFinalConfirmation('info',
                    'Confirm User Editing?',
                    'Are you sure you want to edit this users info?',
                    'This action is permanent.'  
                )                
            }else if (state == 'edit_user_password'){
                DOM.buttons.confirmConfirmationBtn.dataset.state = 'edit_user_password'
                viewFinalConfirmation('info',
                    'Confirm User Editing?',
                    'Are you sure you want to edit this users password?',
                    'This action is permanent.'  
                )                   
            }
        })
        DOM.buttons.cancelConfirmationBtn.addEventListener('click',() => {viewFinalConfirmation('none')})
        DOM.buttons.confirmConfirmationBtn.addEventListener('click',confirmConfirmation)

        DOM.Inputs.events.eventFt.addEventListener('click',toggleButton)

        DOM.buttons.cancelUserInfoBtn.addEventListener('click', () => {
            DOM.popups.editUserInfo.style.display = 'none'
        })

        DOM.buttons.cancelUserPassBtn.addEventListener('click', () => {
            DOM.popups.editUserPass.style.display = 'none'
        })
    }

    // Init
    (async () => {
        const info = await base.request({ 
            URL: window.location.href, 
            Data: { OP: 'GET_ADMIN_PROFILE' } 
        });

        State.infoLists.events = Object.values(info.events).map(ev => ({
            ...ev,
            eventStart: new Date(ev.eventStart),
            eventEnd: new Date(ev.eventEnd)
        }))    
        State.infoLists.users = Object.values(info.users).map(usr => ({
           ...usr, 
           DateJoined: new Date(usr.DateJoined),
        }))
        State.infoLists.bookings = Object.values(info.bookings).map(bk => ({
            ...bk,
            dateTimeBooked: new Date(bk.dateTimeBooked),
        }))

        Object.values(info.bookings).forEach(bk => {
            const idx = State.cardRevenue[info.events[bk.eventID].eventName]
            State.cardRevenue[info.events[bk.eventID].eventName] = (idx || 0) + bk.totalPrice;
        })

        Object.values(info.users).forEach(usr => {
            const idx = State.userCache[usr.userID]
            if (!idx)State.userCache[usr.userID] = 0

            State.userCache[usr.userID] = [usr.FirstName,usr.LastName]
        })

        Object.values(info.bookings).forEach(bk => {
            const idx = State.usertltBookings[bk.userID]
            State.usertltBookings[bk.userID] = (idx || 0) + 1;
        })

        renderDashboard();
        renderEvents(State.infoLists.events)
        renderUsers(State.infoLists.users)
        renderBookings(State.infoLists.bookings)
        setupEventListeners();
    })(); 
})();