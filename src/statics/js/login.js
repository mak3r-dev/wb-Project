(() => {
  "use strict";

  // 1. Elements
  const DOM = {

    // Main Elements
    parent : document.querySelector(".login-input-container"),
    switchBtn : document.querySelector(".switch-btn"),
    rememberChk  : document.querySelector(".login-input-prompt-checkbox"),
    togglePassBtn : document.querySelector('.toggle-Pass'),
    submitBtn : document.querySelector('.submit-btn'),

    // Input Elements
    inputs : {
      email: document.querySelector(".email"),
      pass: document.querySelector(".passwordField"),
      fName: document.querySelector(".FirstName"),
      lName: document.querySelector(".LastName"),      
    },

    // Message Elements
    message: {
      messageParent: document.querySelector(".message-cont"),
      messageText: document.querySelector(".message-txt"),
      messageIcon: document.querySelector(".action-icon"),
    }    

  }

  // 2. Config variables
  const CONFIG = {

    // Regex Patterns
    REGEX : {
      EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      PASS: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*\[\]]).{12,}$/,
      WHITELIST: new Set(['test', 'standard', 'test123', 'standard123'])       
    },

    // Check Patterns
    CLASSES: {
      VALID: 'input-valid',   
      INVALID: 'input-error', 
      FOCUSED: 'input-focused', 
      HIDDEN: 'remove-message',
      VISIBLE: 'view-message',
      ICON_OK: 'success',
      ICON_WARN: 'warn'
    },    

    // Network Info
    NETWORK : {
      LINK : '/Users',
      HEADERS : { 'Content-Type': 'application/json' },
      URL_PARAMS : new URLSearchParams(document.location.search)
    }

  };

  // 3. Show Message
  const showMessage = (type, text, duration = 2300) => {

    // Get Elements and classes
    const { messageParent, messageText , messageIcon } = DOM.message;
    const { ICON_OK, ICON_WARN, VISIBLE, HIDDEN } = CONFIG.CLASSES;
    
    // Validate and set Icon/Text
    type == 'success' ? messageIcon.classList.replace(ICON_WARN,type) : messageIcon.classList.replace(ICON_OK,type)
    messageText.textContent = text
    messageParent.classList.replace(HIDDEN, VISIBLE);

    // Auto-hide
    setTimeout(() => {
      messageParent.classList.replace(VISIBLE, HIDDEN)
    }, duration);

  };

  // 4. Cookie setter and getter
  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  };

  const setCookie = (name, value, days = null) => {
    let expire = ""

    // if an expiry is set
    if (days) {
      const date = new Date()
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
      expire = "; expires=" + date.toUTCString();
    }

    document.cookie = `${name}=${value || ""} ${expire}; path=/; SameSite=Strict`;    
  };

  // 5. Core Logic
  const debounce = (func, delay) => {
    let timeoutId
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const toggleAuthMode = () => {
    const newState = DOM.switchBtn.value == "signin" ? "signup" : "signin";
      
    DOM.parent.classList.replace(DOM.switchBtn.value, newState);
    DOM.switchBtn.value = newState;
  };

  // 6. Validate Field
  const validateField = (el) => {
    if (el == DOM.rememberChk) return
    const elValue = el.value
    const { VALID, INVALID } = CONFIG.CLASSES;
    const { WHITELIST, EMAIL, PASS } = CONFIG.REGEX;

    // No Value -> default border
    if (elValue.length == 0){
      el.parentElement.classList.remove(VALID, INVALID)
      return true;
    }

    // Value in WhiteList
    if (WHITELIST.has(elValue)){
      el.parentElement.classList.replace(INVALID, VALID);
      return true
    }

    // Valid inputs -> Email & Pass & Names
    let valid;
    if (elValue.length > 0) valid = true
    if ( el == DOM.inputs.email ) valid = EMAIL.test(elValue);
    else if ( el == DOM.inputs.pass ) valid = PASS.test(elValue);
    
    el.parentElement.classList.add(valid ? VALID : INVALID)
    el.parentElement.classList.remove(valid ? INVALID : VALID)
  
    return valid;
  };

  // 7. Add Event Listeners
  DOM.parent.addEventListener('focusin', (e) => {
    if (e.target.tagName == 'INPUT' && e.target != DOM.rememberChk) {
      e.target.parentElement.classList.add(CONFIG.CLASSES.FOCUSED);
    }
  });

  DOM.parent.addEventListener('focusout', (e) => {
    if (e.target.tagName == 'INPUT' && e.target != DOM.rememberChk) {
      e.target.parentElement.classList.remove(CONFIG.CLASSES.FOCUSED);
      validateField(e.target);
    }
  });

  // Wrap the function with delay
  const debouncedValidation = debounce((e) => validateField(e.target), 70);
  DOM.inputs.email.addEventListener('input',debouncedValidation)
  DOM.inputs.pass.addEventListener('input',debouncedValidation)

  // Toggle Mode
  DOM.switchBtn.addEventListener('click', toggleAuthMode);

  // Password Visibility Toggle
  DOM.togglePassBtn.addEventListener('click', () => {
    const prevType = DOM.inputs.pass.type
    DOM.inputs.pass.type = DOM.inputs.pass.type == 'password' ? 'text' : 'password';
    
    // Toggle icon class
    DOM.togglePassBtn.classList.replace(DOM.inputs.pass.type,prevType)

    // Change placeholder
    const placeholder = DOM.inputs.pass.placeholder
    DOM.inputs.pass.placeholder = (DOM.inputs.pass.type == 'password') ? '•'.repeat(placeholder.length) : "example@pass123"
    
  });
  
  // 6. Form Submission
  const submitForm = async () => {
    const mode = DOM.switchBtn.value;
    const { email, pass, fName, lName } = DOM.inputs;

    // 1. Client-side Validation
    const required = mode == 'signup' ? [fName, lName, email, pass] : [email, pass];

    const hasEmpty = required.some(el => {
      if (!el.value){
        el.parentElement.classList.add(CONFIG.CLASSES.INVALID);
        return true;
      }
      return false;
    });

    if (hasEmpty) return showMessage('warn', "Please fill all input fields", 1700);

    // Re-validate pattern 
    if (!validateField(email) || !validateField(pass)) return showMessage('warn', "Invalid Email or Password", 1700);
    
    // 2. Prepare payload
    const payload = {
      mode,
      refresh: DOM.rememberChk.checked,
      FirstName: fName.value.toLowerCase().trim() || 'None',
      LastName: lName.value.toLowerCase().trim() || 'None',
      Email: email.value.toLowerCase().trim(),
      Password: pass.value
    };

    // 3. network request
    try {
      const response = await fetch(CONFIG.NETWORK.LINK, {
        method: 'POST',
        headers: CONFIG.NETWORK.HEADERS,
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error(`Status: ${response.status}`);

      const result = await response.json();
      
      if (result) {
        
        result.message == 'Invalid Credentials!' ? showMessage('warn', result.message, 1500) : showMessage('success', result.message, 1500);
      
        if (!result.tokens){
          setTimeout(() => window.location.reload(), 1700);
          return
        }
        

        setCookie('access', result.tokens.access); // Session
        setCookie('refresh', result.tokens.refresh, 5);  // 5 Days    
        setCookie('is_user_logged_in', true)
        
        // Redirect Logic -> if valid
        if (result.redirect_for) {
            const decoded = atob(CONFIG.NETWORK.URL_PARAMS.get('linked')).split('?',3)
            const path = decoded[1] ? decoded[1] : result.redirect_for, query = decoded[2] ? decoded[2] : ""

            setTimeout(() => {
              showMessage('success', `Redirecting to ${path} Page...`, 1500);
              setTimeout(() => window.location.replace(`../${path}?${query}`), 1000);
            },2300)
            
        }
      }

      localStorage.setItem("loginState", "logged");

    } catch (err) {
      console.error("Submission Error:", err);
      showMessage('warn', "Server Error. Please try again.");
    }

  };

  // 7. Submit Triggers
  DOM.submitBtn.addEventListener('click', submitForm);
  [DOM.inputs.email, DOM.inputs.pass, DOM.inputs.fName, DOM.inputs.lName].forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key == 'Enter') submitForm();
    });
  });

  // 8. Initializations
  if (CONFIG.NETWORK.URL_PARAMS.has('linked')) {    
    const decoded_message = atob(CONFIG.NETWORK.URL_PARAMS.get('linked'))
    const linked = decoded_message.split('?',3)

    const message = linked[0] == 'signin' ? "Please sign in to continue!" : "Please sign up to continue!";
    DOM.switchBtn.value = linked[0]
    
    toggleAuthMode();
    setTimeout(() => showMessage('warn', message), 50);
  }  

  // Set initial
  toggleAuthMode();

})();