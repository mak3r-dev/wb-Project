(() => {
    'use strict';

    // =======================================
    // 1. CONFIGURATION & CONSTANTS
    // =======================================  
    const DOM = {
        Btns : {
            reportType : document.querySelector(".choose-report-type"),
            currentYear : document.querySelector(".choose-current-year"),
        },

        ReportCtns : {
            revenueReport : document.querySelector(".revenue-report"),
            bookingReport : document.querySelector(".booking-report"),
            evntPerfReport : document.querySelector(".event-perf-report"),
            venueAnalyticReport : document.querySelector(".venue-analytics-report"),
            yearlySummaryReport : document.querySelector(".yearly-summary-report"),
        },

        RevenueReportObjs : {
            totalRevenue : document.querySelector(".totl-revenue"),
            avgRevenue : document.querySelector(".avg-revenue"),
            monthlyTrend : document.querySelector(".monthly-trend-li-chart"),
        },

        BookingReportObjs : {
            volumeBarChart : document.querySelector(".booking-volume-br-chart"),
        },

        EventPerfReportObjs : {
            evtCardContainer : document.querySelector(".evnt-perf-card-ctn"),
            avgTicketSold : document.querySelector(".avg-tick-sold"),
            perfBarChart : document.querySelector(".event-perf-br-chart"),
        },

        VenueReportObjs : {
           vnCardContainer : document.querySelector(".venue-analytic-card-ctn"), 
           venuePiChart : document.querySelector(".venue-analytic-pi-chart"), 
        },

        YearlyReportObjs : {
           yearlyRevLineChart : document.querySelector(".yearly-rev-growth-li-chart"),
           eventPerYearBarChart : document.querySelector(".events-per-year-br-chart"),
           message : document.querySelector(".yearly-message"),
           projEvent : document.querySelector(".proj-evnt"),
           title : document.querySelector(".yearly-sum-titl"),
        }
    };
    
    const templates = {
        eventPerfCard : document.getElementById("evnt-perf-card-template"),
        venueCard : document.getElementById("venue-card-template")
    }

    const states = {
        venues : null,
        events : null,
        bookingEntries : null,
        bookedEvents : null,
        
        calculatedData : {
            totalRevenue : 0
        },

        chosenYear : 2026,
    };

    const FMT = {
        date: new Intl.DateTimeFormat('en-GB', {month: 'short', day: '2-digit', year: 'numeric' }),
        currency: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
    };  

    // =======================================
    // 2. HELPER FUNCTIONS
    // =======================================

    const getWeeks = () => {
        let refDate = new Date()
        let weekArray = []
        for (let i = 1; i <= 7; i++) {
            const startD = refDate.getDay() == 7 ? 7 : refDate.getDay()
            const now = refDate.getDate() - startD + i

            weekArray.push(new Date(refDate.setDate(now)))
        }

        return weekArray;
    };

    const setText = (parent, sel, val) => {
        const el = parent.querySelector("." + sel);
        if (el) el.textContent = val;
    };

    const changeCurrentReport = () => {
        Object.values(DOM.ReportCtns).forEach((ctn) => {ctn.classList.remove("visible-rp-contn")})

        const currentReport = DOM.Btns.reportType.value
        Object.values(DOM.ReportCtns).forEach((ctn) => {
            if (ctn.dataset.reporttype == currentReport){
                ctn.classList.add("visible-rp-contn")
            }
        })
    }

    // =======================================
    // 3. CORE FUNCTIONS
    // =======================================    
    const loadRevenueReport = () => {
        const {totalRevenue, avgRevenue, monthlyTrend } = DOM.RevenueReportObjs

        // 1. Build Graph Data
        const xLabels = ["Jan", "Feb", "Mar", 'Apr', "May", 'Jun', 'Jul', "Aug", "Sep", "Oct", "Nov", "Dec"]
        const graphData = [0,0,0,0,0,0,0,0,0,0,0,0]

        for (const data of Object.values(states.bookedEvents)){

            // A. Calculate totalRev
            states.calculatedData.totalRevenue += data.totalPrice

            // B. Calculate the Data for Graph
            const year = data.dateTimeBooked.getFullYear();
            if (year == states.chosenYear){
                const month = data.dateTimeBooked.getMonth();
                graphData[month] += data.totalPrice
            }  
        } 
        
        // 2. Set Values
        // const graphData1 = [2983,302,2479,1575,307,4210,4685,782,1012,1462,1077,0]
        const graphOptions = {
            colors: ['#355C7D'],
            series: [{name: 'Monthly Trends',data: graphData}],
            xaxis: {
                categories: xLabels, 
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            chart: { 
                type: 'area', 
                height: 500, 
                toolbar: { show: false } 
            },
            stroke: { curve: 'smooth', width: 1.4, colors: ['#355C7D'] 
            },
            yaxis: {labels: {formatter : (val) => FMT.currency.format(val)}},   
            tooltip: { 
                theme: 'light', 
                x: { show: true }
            },  
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'dark',
                    type: "vertical",
                    shadeIntensity: 0.7,
                    opacityFrom: 1,
                    opacityTo: 0,
                }
            },
            dataLabels: { enabled: false },
            grid: { borderColor: '#f1f1f1' }
        }

        const avgRev = states.calculatedData.totalRevenue / Object.values(states.bookedEvents).length;
        
        totalRevenue.textContent = `${FMT.currency.format(states.calculatedData.totalRevenue)}`
        avgRevenue.textContent = `${FMT.currency.format(avgRev)}`

        new ApexCharts(monthlyTrend,graphOptions).render();
    };

    const loadBookingReport = () => {
        const {volumeBarChart} = DOM.BookingReportObjs

        // 1. Build Graph Data
        const xLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
        const graphData = [0,0,0,0,0,0,0]

        const weeks = getWeeks()
        for (const data of Object.values(states.bookedEvents)) {
            weeks.forEach(date => {
                if (date.toDateString() == data.dateTimeBooked.toDateString()) {
                    graphData[data.dateTimeBooked.getDay()] += 1
                }
            });
        }
        
        // const graphData1 = [3,10,3,4,8,3,19]
        const graphOptions = {
            colors: ['#355C7D'],
            chart: { 
                type: 'bar', 
                height: 450, 
                toolbar: { show: false } 
            },
            series: [{name: 'Weekly Bookings',data: graphData}],   
            plotOptions: {
                bar: {
                    borderRadius: 9, 
                    columnWidth: '70%', 
                    distributed: false,
                    colors: {
                        backgroundBarColors: ['#f2f2f2'], 
                        backgroundBarOpacity: 0.07,
                        backgroundBarRadius: 9,
                    },
                }
            },  
            dataLabels: { enabled: false },       
            xaxis: {
                categories: xLabels,
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            grid: { show: false },
            tooltip: {
                theme: 'light',
                y: { formatter: (val) => val + " Bookings" }
            }
        }

        new ApexCharts(volumeBarChart,graphOptions).render();
    }

    const loadEventReport = () => {
        const {evtCardContainer, avgTicketSold, perfBarChart} = DOM.EventPerfReportObjs  
        const {eventPerfCard} = templates
        let totalTicketSold = 0

        // 1. Build Graph Data
        let xLabels = []
        for (const evt of Object.values(states.events)) 
            xLabels.push(evt.eventName)
        
        const ticketSold = Array(xLabels.length).fill(0,0,xLabels.length)
        const evntCapacity = xLabels.map((_, i) => {
            return states.events[i].eventAvailability;
        })

        for (const data of Object.values(states.bookedEvents)) {
            const evntID = data.eventID, bookingID = data.bookingID
        
            for (const entry of Object.values(states.bookingEntries)) {
                if (entry.bookingID == bookingID){    
                    ticketSold[evntID - 1] += 1;
                }
                totalTicketSold += 1;
            }
        }
        
        const colors = {
            primary: '#54758d',
            secondary: '#bd707e', 
            track: '#e2e8f0'     
        };

        const graphOptions = {
            series: [
                {name: 'Tickets Sold',data: ticketSold},
                {name: 'Total Capacity',data: evntCapacity}
            ],
            chart: {type: 'bar',height: 350,toolbar: { show: false }},      
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 4,
                    barHeight: '80%', // Adjusts how thick the bars are
                    dataLabels: { position: 'top' },
                    distributed: false
                }
            },  
            colors: [colors.secondary, colors.track],  
            dataLabels: { enabled: false },   
            xaxis: {
                categories: xLabels,
                labels: { show: false }, // Hiding X axis like the image
                axisBorder: { show: false },
                axisTicks: { show: false }
            },     
            yaxis: {
                labels: {
                    style: { fontSize: '12px', fontWeight: 500 }
                }
            },   
            grid: {
                xaxis: { lines: { show: false } },
                yaxis: { lines: { show: false } }
            },     
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                markers: { radius: 0 }
            }, 
            tooltip: { theme: 'light' }                           
        }

        new ApexCharts(perfBarChart,graphOptions).render();

        // 2. Set Values
        const avgTickSold = (totalTicketSold / Object.values(states.events).length).toFixed(2)

        avgTicketSold.textContent = avgTickSold;

        // 3. Load Event Cards
        const evtFrag = document.createDocumentFragment()
        for (const evt of Object.values(states.events)) {
            const clone = eventPerfCard.content.cloneNode(true)
            
            let perOccupancy = (ticketSold[evt.eventID - 1] / evt.eventAvailability) * 100 
            perOccupancy = evt.eventAvailability == 0 ? 0 : perOccupancy
            
            setText(clone,"evnt-titl",evt.eventName)
            setText(clone,"evnt-occupancy",`${perOccupancy.toFixed(0)}% filled`)
            setText(clone,"evnt-perf-card-date-occupancytxt",`${FMT.date.format(evt.eventStart)}`)

            evtFrag.append(clone);
        }

        evtCardContainer.append(evtFrag)
    }  

    const loadVenueReport = () => {
        const {venuePiChart, vnCardContainer} = DOM.VenueReportObjs  
        const {venueCard} = templates

        // 1. Build Graph Data
        let xLabels = []
        for (const evt of Object.values(states.venues)) 
            xLabels.push(evt.venueName)    
        
        const vAnalytics = Array(xLabels.length).fill(0,0,xLabels.length)
        const vCapacity = Array(xLabels.length).fill(0,0,xLabels.length)
        for (const evt of Object.values(states.events)) {
            const vID = evt.venueID
            vAnalytics[vID - 1] += 1 
            
            let totlCap = states.venues[evt.venueID - 1].venueCapacity, UsedCap = 0;
            for (const bE of Object.values(states.bookedEvents)){
                if (bE.eventID == evt.eventID){
                    
                    for (const entry of Object.values(states.bookingEntries)){
                        if (bE.bookingID == entry.bookingID){
                            UsedCap += 1
                        }
                    }
                }
            }

            vCapacity[vID - 1] = [UsedCap,totlCap]
        }

        const graphOptions = {
            series: vAnalytics, 
            chart: {
                type: 'donut',
                height: 350,
            },
            dataLabels: { enabled: false },   
            labels: xLabels,
            fill: {
                opacity: 0.95
            },
            plotOptions: {
                polarArea: {
                    rings: { strokeWidth: 0 },
                    spokes: { strokeWidth: 0 }
                }
            },  
            yaxis: {show: false }, 
            legend: {position: 'bottom'},    
            theme: {
                monochrome: {
                    color : '#C06C84',
                    enabled: true,
                    shadeTo: 'light',
                    shadeIntensity: 0.5
                }
            } ,
            stroke: {
                width: 3,
                colors : ['rgb(255,255,255,0.3)'],
                lineCap: 'round',
                show : true
            },                                        
        }

        new ApexCharts(venuePiChart,graphOptions).render();

        // 3. Load Venue Cards
        const vnFrag = document.createDocumentFragment()
        for (const vn of Object.values(states.venues)) {
            const clone = venueCard.content.cloneNode(true)
            
            setText(clone,"venue-anal-card-ctn",`${vn.venueName}`)
            setText(clone,"evnt-hosted",`- ${vAnalytics[vn.venueID - 1]} Event Hosted`)
            setText(clone,"vn-anal-card-evnt-filled",
                `${vCapacity[vn.venueID - 1][0]} / ${vCapacity[vn.venueID - 1][1]} total tickets`
            )
            vnFrag.append(clone);
        }

        vnCardContainer.append(vnFrag)        
    }
    
    const loadYearlyReport = () => {
        const {yearlyRevLineChart, eventPerYearBarChart, message, projEvent, title} = DOM.YearlyReportObjs  

        // 1. Build Graph Data -> Yearly Revenue
        let xLabels = []      
        for (let i = 4; i >= 0; i--)
            xLabels.push(states.chosenYear - i);
        
        const yearREVS = [0,0,0,0,0]
        for (const booking of Object.values(states.bookedEvents)) {
            const year = booking.dateTimeBooked.getFullYear();

            for (let i=0; i < xLabels.length; i++) {
                if (xLabels[i] == year){
                    yearREVS[i] += booking.totalPrice
                } 
            }
        }

        const lineOptions = {
            colors: ['#355C7D'],
            series: [{name: 'Yearly Revenue',data: yearREVS}],
            xaxis: {
                categories: xLabels, 
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            chart: { 
                type: 'area', 
                height: 500, 
                toolbar: { show: false } 
            },
            stroke: { curve: 'smooth', width: 1.4, colors: ['#355C7D'] 
            },
            yaxis: {labels: {formatter : (val) => FMT.currency.format(val)}},   
            tooltip: { 
                theme: 'light', 
                x: { show: true }
            },  
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'dark',
                    type: "vertical",
                    shadeIntensity: 0.7,
                    opacityFrom: 1,
                    opacityTo: 0,
                }
            },
            dataLabels: { enabled: false },
            grid: { borderColor: '#f1f1f1' }
        }

        new ApexCharts(yearlyRevLineChart,lineOptions).render();

        // 2. Build Graph Data -> Events Per Year
        let totlEvents = [0,0,0,0,0]
        let highestIdx = 0, highestTotl = 0;
        const now = new Date()
        for (const evt of Object.values(states.events)) {
            const yearStart = evt.eventStart.getFullYear()

            for (let i=0; i < xLabels.length; i++) {
                if (xLabels[i] == yearStart && evt.eventStart < now){
                    totlEvents[i] += 1
                    if (totlEvents[i] > highestTotl){
                        highestIdx = i;
                        highestTotl = totlEvents[i]
                    }
                } 
            }
        }

        const barOptions = {
            colors: ['#355C7D'],
            chart: { 
                type: 'bar', 
                height: 450, 
                toolbar: { show: false } 
            },
            series: [{name: 'Yearly Events', data: totlEvents}],   
            plotOptions: {
                bar: {
                    borderRadius: 9, 
                    columnWidth: '70%', 
                    distributed: false,
                    colors: {
                        backgroundBarColors: ['#f2f2f2'], 
                        backgroundBarOpacity: 0.07,
                        backgroundBarRadius: 9,
                    },
                }
            },  
            dataLabels: { enabled: false },       
            xaxis: {
                categories: xLabels,
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            grid: { show: false },
            tooltip: {
                theme: 'light',
                y: { formatter: (val) => val + " Events" }
            }
        }    
        
        new ApexCharts(eventPerYearBarChart,barOptions).render();

        // 3. Set Values
        let avgEvts = (totlEvents[0] + totlEvents[1] + totlEvents[2] + totlEvents[3]) / 4;
        if (totlEvents[4] > avgEvts){
            message.textContent = "You are on track to beat last year's records. Keep up the good work 👍"
        }else{
           message.textContent = "You are on track to host less events this year, Work Harder! 👎" 
        }

        title.textContent = `Yearly Summary ${xLabels[4]}`
        projEvent.textContent = (avgEvts > avgEvts + totlEvents[4] ? avgEvts : 
            (totlEvents[0] > totlEvents[4] ? avgEvts + totlEvents[4] : totlEvents[4])
        ).toFixed(0)
    }

    // =======================================
    // 4. INITIALIZATION
    // =======================================   

    const init = (async () => {

        // 1. Get Required Tables -> BookedEvents, BookedEntries, Events, Venues
        const reportTables = await base.request({ 
            URL: window.location.href, 
            Data: { OP: 'GET_ADMIN_REPORT' } 
        });
        
        // 2. Convert Required Data
        // Events
        states.events = Object.values(reportTables.events).map(ev => ({
            ...ev,
            eventStart: new Date(ev.eventStart),
            eventEnd: new Date(ev.eventEnd)
        }))  
        
        // Venues
        states.venues = reportTables.venues

        // BookedEvents
        states.bookedEvents = Object.values(reportTables.bookedEvents).map(bE => ({
            ...bE,
            dateTimeBooked: new Date(bE.dateTimeBooked),
        })) 

        // Booking Entries
        states.bookingEntries = Object.values(reportTables.bookingEntries).map(bE => ({
            ...bE,
            entries: new Date(bE.entries),
        })) 


        // 3. Load Infos
        loadRevenueReport();
        loadBookingReport();
        loadEventReport();
        loadVenueReport();
        loadYearlyReport();
        changeCurrentReport();

        DOM.Btns.reportType.addEventListener("change",changeCurrentReport);
    })();

})();