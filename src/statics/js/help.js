(() => {
    "use strict";

    // ==============================================================
    // 1. CONFIGURATION AND CONSTANTS 
    // ==============================================================

    // 1. Main Elements
    const DOM = {
        templates : {
            questionCard : document.getElementById('question-template'),
            categoryBtn : document.getElementById('category-template')
        },
        conts : {
            questionCont : document.querySelector('.FAQ-list'),
            categoryCont : document.querySelector('.category-bar')
        },
        fragments : {questionFrag : document.createDocumentFragment()},
        stateElements : {
            searchResult : document.querySelector('.search-result'),
            seachBar : document.querySelector('.article-search-bar')
        }
    };  
    
    // 2. Config variables
    const CONFIG = {}; 
    
    // 3. States
    const state = {
        FAQ : null,
        FAQCategories : {},

        questionsCache : {},
        categoryCache : [],

        animTimeout : null,

        searchFilter : new Set()
    };

    // ==============================================================
    // 2. UTILITIES 
    // ==============================================================
    const setText = (parent, sel, val) => {
        parent.querySelector(`.${sel}`).textContent = val
    }

    const openQuestion = (el) => {
        const info = state.questionsCache[el.dataset.key]

        for (const [key, info] of Object.entries(state.questionsCache)){
            if (key === el.dataset.key){
                info.questionCard.classList.toggle('opened',info.isActive)
                info.answerWrapper.classList.toggle('opened',!info.isActive)
                info.questionCard.classList.toggle('closed',!info.isActive)
                info.answerWrapper.classList.toggle('closed',info.isActive)

                info.isActive = !info.isActive
            }else{
                info.questionCard.classList.toggle('closed',false)
                info.answerWrapper.classList.toggle('closed',true)         
                info.questionCard.classList.toggle('opened',true)
                info.answerWrapper.classList.toggle('opened',false)    

                info.isActive = false
            }
        }

    }

    const setCategory = (el) => {
        for (const [k, info] of Object.entries(state.questionsCache)){
            info.isAnimated = false
        }

        const category = el.dataset.category

        const allCategoryBtn = Array.from(document.querySelectorAll('.cat-option-btn'))
        for (const el of allCategoryBtn){

            if (el.dataset.category != category){
                el.classList.toggle('cat-selected',false)
            }else{
                el.classList.toggle('cat-selected',true)
            }
        }

        renderQuestions(category)
    }

    // ==============================================================
    // 3. CORE LOGIC: QUESTION CARD ANIMATION
    // ==============================================================
    const animateCards = (questions) => {

        let timer = 0
        for (const question of questions){
            const cardInfo = state.questionsCache[question.questionID]

            if (cardInfo.isAnimated == true) continue
            setTimeout(() => {
                if (cardInfo.questionEl.classList.contains('q-a-card-anim'))
                    cardInfo.questionEl.classList.remove('q-a-card-anim')

                cardInfo.questionEl.classList.add('q-a-card-anim')   
                cardInfo.isAnimated = true  
            }, timer)

            timer += 50
        }
        
    }

    // ==============================================================
    // 4. CORE LOGIC: QUESTION CARD RENDER
    // ==============================================================
    const renderQuestions = (cat = null, filterSet = null) => {
        if (!filterSet && cat === null) return

        let converted_questions = null
        if (filterSet == null){
            converted_questions = cat == 'All' ? Object.values(state.FAQ) 
            : Array.from(state.FAQCategories[cat])
        }else{
            converted_questions = Array.from(filterSet)
        }

        const {questionFrag} = DOM.fragments
        const {questionCard} = DOM.templates

        const article_count = converted_questions.length
        DOM.conts.questionCont.innerHTML = ""
        for (const question of converted_questions){
            const clone = questionCard.content.cloneNode(true)
            const cardEl = clone.firstElementChild;
            cardEl.id = question.questionID

            setText(clone, 'question-cat', question.Category)
            setText(clone, 'question-txt', question.Question)
            setText(clone, 'answer-card', question.ModelAnswer)

            clone.querySelector('.question-icon-btn').dataset.key = question.questionID
            if (state.questionsCache[question.questionID] != undefined){
                const info = state.questionsCache[question.questionID]
                const questionCard = clone.querySelector('.question-card')
                const answerWrapper = clone.querySelector('.answer-wrapper')

                if (info.isActive){  
                    questionCard.classList.toggle('opened',true)
                    answerWrapper.classList.toggle('opened',true)
                    questionCard.classList.toggle('closed',false)
                    answerWrapper.classList.toggle('closed',false)

                    info.isActive = true 
                    info.isAnimated = true  
                    cardEl.style.display = 'flex'  
                }else{
                    info.isAnimated = false 
                }

                info.questionEl = cardEl
                info.questionCard = questionCard
                info.answerWrapper = answerWrapper   
            }else{
                state.questionsCache[question.questionID] = {
                    isAnimated: false,
                    isActive: false,
                    questionEl : cardEl,
                    questionCard : clone.querySelector('.question-card'),
                    answerWrapper : clone.querySelector('.answer-wrapper')
                }
            }

            if (filterSet){
                cardEl.style.display = 'flex'  
                state.questionsCache[question.questionID].isAnimated = true
            }

            questionFrag.append(clone)
        }

        DOM.conts.questionCont.append(questionFrag);
        DOM.stateElements.searchResult.textContent = 
        `${article_count} ${article_count == 1? 'article' : 'articles'} found`

        animateCards(converted_questions)
    }

    const renderCategories = () => {
        const {categoryBtn} = DOM.templates
        const {categoryCont} = DOM.conts

        const catFrag = document.createDocumentFragment()
        for (const cat of Object.keys(state.FAQCategories)){
            const clone =  categoryBtn.content.cloneNode(true)
            clone.firstElementChild.dataset.category = cat

            clone.firstElementChild.classList.add('cat-selected')
            clone.firstElementChild.classList.toggle('cat-selected',false)

            setText(clone, 'cat-txt-icon', cat)
            clone.querySelector('.cat-icon').classList.add(`${cat.split(" ")[0]}`)

            catFrag.append(clone)
        }

        categoryCont.append(catFrag)
        setCategory(document.querySelector('.cat-option-no-icon'))
    }
    // ==============================================================
    // 5. CORE LOGIC: SEACRH HANDLER
    // ==============================================================
    const searchHandler = () => {
        const {seachBar} = DOM.stateElements
        const {searchFilter, FAQ} = state

        searchFilter.clear()
        const val = seachBar.value.toLowerCase().trim()
        for (const [key, q] of Object.entries(FAQ)){
            if (q.Question.toLowerCase().trim().includes(val)){
                searchFilter.add(q)
            }
        }

        renderQuestions(null,searchFilter)
    }

    // ==============================================================
    // 6. INITIALIZATION
    // ==============================================================
    const setupListeners = () => {
        // A. Category listener
        DOM.conts.categoryCont.addEventListener('click',(e) => {
            const catBtn = e.target.classList.contains('cat-option-icon') || e.target.classList.contains('cat-option-no-icon')

            if (catBtn){
                setCategory(e.target)
            }
        })

        // B. Question Card
        DOM.conts.questionCont.addEventListener('click',(e) => {
            if (e.target.classList.contains('question-icon-btn')){
                openQuestion(e.target)
            } 
        })

        // C. SearchBar
        const {seachBar} = DOM.stateElements
        seachBar.addEventListener('input',searchHandler)
    }

    /**
     * Main Entry Point
     */
    (async () => {
        state.FAQ = await base.request({ URL: '/Help'});
        
        for (const [key, question] of Object.entries(state.FAQ)){

            if (state.FAQCategories[question.Category] == undefined){
                state.FAQCategories[question.Category] = []
            }

            state.FAQCategories[question.Category].push(question)              
        }

        renderQuestions()
        renderCategories()

        setupListeners()
    })();    

})();