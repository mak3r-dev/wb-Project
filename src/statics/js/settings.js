/**
 * Variable Config
 */

const sidebarbtns = document.querySelectorAll(".sidebar-btns")
const maincontentFrames = document.querySelectorAll(".main-content")



/**
 * View Specific Frames
 */
const activate = (element,i) => {
    sidebarbtns.forEach((el,index) => {
        if (el != element){
            el.classList.remove("active-btn")
            maincontentFrames[index].classList.remove("active-content")
        }
        maincontentFrames[i].classList.add("active-content")
        element.classList.add("active-btn")
    })
}
sidebarbtns.forEach((el,i) => {
    el.addEventListener('click',() => {activate(el,i)})
})