/**
 * Configuration & Selectors
 */

const header = document.querySelector(".header");
const navHome = document.querySelector(".navHome");
const navEvent = document.querySelector(".navEvent");
const navAbout = document.querySelector(".navAbout");
const navSetting = document.querySelector(".navSettings");
const navAccount = document.querySelector(".navAccount");

const navlogin = document.querySelector(".navLogin");
const loginTxt = document.querySelector(".log-txt"); 

let state = false
let activebtn = []
const answerframe = document.querySelectorAll(".question-answer")
const answerbtn = document.querySelectorAll(".question-prompt")
const footerbtn = document.querySelectorAll(".footer-column-dropdown")
const footerframe = document.querySelectorAll(".footer-links-frame")

/**
 * Header Animation
 */
// Select all elements with the class ".child"

const navheaderbtns = document.querySelectorAll(".header-btn");
const ANIMATION_INTERVAL = 70; // Delay in ms between each child appearance
let hasAnimated = false;
let resizeTimer;

/* Triggers the staggered "in" animation for child elements */
const playAnimation = () => {
    navheaderbtns.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add("headerAnimation");
        }, ANIMATION_INTERVAL * index);
    });
    hasAnimated = true;
};

/* Resets the animation state by removing the class from all children */
const resetAnimation = () => {
    navheaderbtns.forEach(el => el.classList.remove("headerAnimation"));
    hasAnimated = false;
};

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    
    resizeTimer = setTimeout(() => {
        const width = window.innerWidth < 600

        if (width && !hasAnimated) {
            // Re-run animation if we just crossed into mobile view
            resetAnimation();
            playAnimation();
        } else if (!width) {
            // Reset the flag so it can trigger again if resized back to mobile
            hasAnimated = false;
        }
    }, 150); // 150ms delay ensures efficiency (so it does not run every resize call)
});

playAnimation();

/**
 * Navigation Links
 */
navHome.addEventListener('click', () => { window.location.href = "../Home"; });
navEvent.addEventListener('click', () => { window.location.href = "../Event"; });
navAbout.addEventListener('click', () => { window.location.href = "../About"; });
navAccount.addEventListener('click', () => { window.location.href = "../Account"; });

/**
 * Footer Buttons
 */
let currentActiveIndex = null;
const animateAnswer = (index,button) => {
    let btn = null
    let frame = null
    if (button.classList.contains("question-prompt")){
        btn = answerbtn[index]
        frame = answerframe[index]
    }else{
        btn = footerbtn[index]
        frame = footerframe[index]
    }

    // 1. If another button is open, close it first
    if (currentActiveIndex !== null && currentActiveIndex !== index) {
        if (btn.classList.contains("question-prompt")){
            answerframe[currentActiveIndex].classList.remove("is-visible");
            answerbtn[currentActiveIndex].classList.replace("rotate_increase", "rotate_decrease");
        }else{
            footerframe[currentActiveIndex].classList.remove("is-visible");
            footerbtn[currentActiveIndex].classList.replace("rotate_increase", "rotate_decrease");   
        }
    }

    // 2. Toggle the clicked button
    const isOpening = !btn.classList.contains("rotate_increase");

    if (isOpening) {
        frame.classList.add("is-visible");
        btn.classList.remove("rotate_decrease")
        btn.classList.add("rotate_increase")
        currentActiveIndex = index;
    } else {
        frame.classList.remove("is-visible");
        btn.classList.replace("rotate_increase", "rotate_decrease");
        currentActiveIndex = null;
    }
};

answerbtn.forEach((btn, i) => {
    btn.addEventListener('click', () => animateAnswer(i,btn));
});

footerbtn.forEach((btn, i) => {
    btn.addEventListener('click', () => animateAnswer(i,btn));
});

// ============= GLOBAL METHODS ==============

/**
 * Server Request Management Module
 * Handles API communication and form submission logic.
 */
class baseClass{
    constructor(){
        this.headers = new Headers({'Content-Type': 'application/json',})
    } 

    async request({URL = null, Data = null ,Type = null, Header = null}){

        // 1. Build the requestBody
        const url = URL != null ? URL : window.location.href
        const requestBody = {
            method : Type != null ? Type : 'POST',
            headers : Header != null ? Header : this.headers,
            body : Data != null ? JSON.stringify(Data) : 'No Data'
        }      
     
        // 2. Send the request
        try{
            const res = await fetch(url,requestBody); 

            // A. User Validation
            if (!res.ok) throw new Error(`Invalid server response: ${res.status}`);

            const data = await res.json();
            this.validate(data)
            
            return data
        } catch (err){
            console.warn("Network Error:",err)
        } 
    }

    getCookie = (name) => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    };

    setCookie = (name, value, days = null) => {
        let expire = ""

        // if an expiry is set
        if (days) {
        const date = new Date()
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
        expire = "; expires=" + date.toUTCString();
        }

        document.cookie = `${name}=${value || ""} ${expire}; path=/; SameSite=Strict`;    
    };

    async validate(data){
        if ( 'access_token' in data){
            this.setCookie('access',data.access_token)
        }

        if ( 'redirect_url' in data && 'linked' in data){
            return window.location.replace(`../${data.redirect_url}?linked=${btoa(data.linked)}`)
        }
    };

}

base = new baseClass()

const checklogin = async () => {
    header.classList.remove('logged-in','logged-out')

    const userState = base.getCookie("is_user_logged_in")
    header.classList.add(userState == 'true' ? 'logged-in' : 'logged-out')
};

const handleLoginState = () => {
    const userState = base.getCookie("is_user_logged_in")
    if (userState == 'true'){
        cookieStore.delete('access'); // remove access cookie
        cookieStore.delete('refresh'); // remove refresh cookie
        cookieStore.delete('is_user_logged_in'); // remove state cookie

        window.location.reload()
    }else{
       loginTxt.style.display = 'block';
       window.location.href = "../Users" 
    }

    checklogin();
}

navlogin.addEventListener('click',handleLoginState);
checklogin();
// If page is from bfcache reload
window.onpageshow = (event) => (event.persisted) ? window.location.reload() : null