/**
 * Configuration & Selectors
 */
let auto_scroll = true
const scrollContainer = document.querySelector(".event-showcase-group");
const cards = document.querySelectorAll(".ft-card");
const dots = document.querySelectorAll(".dot");
const indicatorText = document.querySelector(".mobile-indicator-text");

const btnNext = document.querySelector(".indicator-btn-right");
const btnPrev = document.querySelector(".indicator-btn-left");

let activeIndex = 0; // Current index for manual navigation
let autoIndexIn = 0; // Current index for auto-move entry
let autoIndexOut = 0; // Current index for auto-move exit
let autoMoveInterval = null;

const BREAKPOINT = 992;
const interval = 5000 /* In millis*/


/* Services element */
const serviceBtns = document.querySelectorAll('.service-btn')
const serviceCard = document.querySelectorAll('.service-card')
const ratingTemplate = document.querySelector('.ratingTemplate')
const starTemplate = document.querySelector('.ratingIconTemplate')
const serviceRatingContainer = document.querySelector('.service-rating')

/**
 * Helper Functions
 */

// Updates the "1/8" counter text
const updateIndicatorText = () => {
    if (indicatorText) {
        indicatorText.textContent = `${activeIndex + 1}/${cards.length}`;
    }
};

// Handles smooth scrolling to a specific card
const scrollToCard = (index,update) => {
    const targetCard = cards[index];
    if (targetCard) {
        scrollContainer.scrollTo({
            left: targetCard.offsetLeft,
            behavior: 'smooth'
        });

        if (update){
            updateIndicatorText();
        }
    }
};

/**
 * Mouse Wheel Navigation (Horizontal Scroll)
 * Only active on mobile/tablet view
 */
scrollContainer.addEventListener("wheel", (event) => {
    if (window.innerWidth < BREAKPOINT) {
        event.preventDefault();

        // Scroll 1 card left or right based on wheel delta
        activeIndex += (activeIndex == 0)? 1 : 0;
        activeIndex -= (activeIndex == cards.length + 1)? 1 : 0; 
        activeIndex += (event.deltaY > 0)? 1 : -1;
        scrollToCard(activeIndex,true);
    }
}, { passive: false });

/**
 * Button Navigation
 */
btnNext.addEventListener("click", () => {
    if (window.innerWidth < BREAKPOINT) {
        if (activeIndex < cards.length - 1) {
            activeIndex++;
            scrollToCard(activeIndex,true);
        }
    }
});

btnPrev.addEventListener("click", () => {
    if (window.innerWidth < BREAKPOINT) {
        if (activeIndex > 0) {
            activeIndex--;
            scrollToCard(activeIndex,true);
        }
    }
});

/**
 * Auto-Move Animation (Desktop Only)
 * Manages the classes for the expanding/shrinking card effects
 */
const playAutoMoveAnimation = () => {
    // Reset index if it exceeds card count
    if (autoIndexIn >= cards.length) autoIndexIn = 0;

    // "In" Animation: Expand card and dot
    const cardIn = cards[autoIndexIn];
    const dotIn = dots[autoIndexIn];

    cardIn.classList.add("card-increase");
    cardIn.classList.remove("card-decrease");
    dotIn.classList.add("indicator-increase");
    dotIn.classList.remove("indicator-decrease");

    autoIndexIn++;

    // "Out" Animation: Shrink card and dot after a delay
    setTimeout(() => {
        if (autoIndexOut >= cards.length) autoIndexOut = 0;

        const cardOut = cards[autoIndexOut];
        const dotOut = dots[autoIndexOut];

        cardOut.classList.add("card-decrease");
        cardOut.classList.remove("card-increase");
        dotOut.classList.add("indicator-decrease");
        dotOut.classList.remove("indicator-increase");

        autoIndexOut++;
    }, interval);
};

const manageAutoMove = () => {
    clearInterval(autoMoveInterval);

    if (window.innerWidth >= BREAKPOINT && auto_scroll == true) { 
        playAutoMoveAnimation();
        autoMoveInterval = setInterval(playAutoMoveAnimation, interval);
        auto_scroll = false
    } else if (window.innerWidth < BREAKPOINT){
        // Ensure indicator is correct when switching back to mobile
        activeIndex = 0;
        auto_scroll = true
        updateIndicatorText();
    }
};

updateIndicatorText();
manageAutoMove();


/**
 * Toggle Services 
 */
const ratinginfo1 = {
    ratingNumber : 4.3,
    ratingTitle : 'First-Time Buyer',
    ratingText : "I'm always a bit hesitant to put my card details into a new site, but I noticed the secure checkout and decided to go for it. The transaction was seamless, I got an instant confirmation, and I felt completely safe throughout the process. — James T."
}

const ratinginfo2 = {
    ratingNumber : 4.7,
    ratingTitle : 'Stress-Free',
    ratingText : "I was dreading the logistics of booking our company event, but the system here was so intuitive. It took less than five minutes to secure our date and customize the package. It turned what is usually a stressful task into the easiest part of my week! — Marcus G."
}

const ratinginfo3 = {
    ratingNumber : 4.5,
    ratingTitle : 'Global Presence',
    ratingText : "Being based in a completely different time zone usually makes support difficult, but Assured Booking's 24/7 team is actually available 24/7. No matter when I reach out, I get a fast, helpful response. It makes me feel like a priority. — Sasha L."
}

const ratinginfo4 = {
    ratingNumber : 5,
    ratingTitle : 'Spontaneous Purchase',
    ratingText : "I needed a last-minute booking for a big event and didn't have the full amount ready. The flexible payment plan saved the day! I could secure my spot immediately and pay the rest over time. The approval process took literally seconds. — Rico M."
}

const ratinginfo5 = {
    ratingNumber : 4.4,
    ratingTitle : 'First-Time Buyer',
    ratingText : "I'm always a bit hesitant to put my card details into a new site, but I noticed the secure checkout and decided to go for it. The transaction was seamless, I got an instant confirmation, and I felt completely safe throughout the process. — James T."
}

const ratinginfo6 = {
    ratingNumber : 4.6,
    ratingTitle : 'Risk Free',
    ratingText : "I was nervous about trying a new brand, but their 'no-questions-asked' refund policy gave me peace of mind. It didn't end up being the right fit for me, but the return process was so seamless and professional that I'll definitely be back to try their other products. — Sarah J."
}

const addstars = (value) => {
    if (value == 5){
        return 5
    }else if (value >= 4){
        return 4
    }else if (value >= 3){
        return 3
    }else if (value >= 2){
        return 2
    }
    return 1
}

const ratingInformations = [ratinginfo1,ratinginfo2,ratinginfo3,ratinginfo4,ratinginfo5,ratinginfo6]
const addRating = (data) => {
    serviceRatingContainer.innerHTML = "";
    const newElement = ratingTemplate.content.cloneNode(true)   

    const {ratingNumber,ratingTitle,ratingText} = data
    newElement.querySelector('.rating-number').textContent = ratingNumber

    const ratingContainer = newElement.querySelector('.rating-stars')
    for (let i = 0; i < addstars(ratingNumber); i++){
        const star = starTemplate.content.cloneNode(true)

        ratingContainer.append(star)
    }
    
    newElement.querySelector('.rating-date').textContent = ratingTitle
    newElement.querySelector('.rating-text').textContent = ratingText

    serviceRatingContainer.append(newElement)
}

const toggleService = (element) => { 
  serviceBtns.forEach((el,index) => { 
    if (el == element){
        serviceCard[index].style.display = 'flex'
        addRating(ratingInformations[index])
    }else{
        serviceCard[index].style.display = 'none'
    }    
  })   
}

serviceBtns.forEach(el => {
    el.addEventListener('click',(e) => {toggleService(el)})
})
toggleService(serviceBtns[0])