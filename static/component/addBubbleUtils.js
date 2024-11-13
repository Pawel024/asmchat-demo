import { ensureMarkedLoaded, ensureKaTeXLoaded } from './loadingUtils.js';

// create a bubble
let bubbleQueue = false;

const addBubble = (say, posted, container, animTime, tSpeed, widerBy, sidePadding, bubbleWrap, bubbleTyping, interactionsSave, interactionsSaveCommit, interactionsHistory, localStorageAvailable, reply = "", live = true, iceBreaker = false) => {
    console.log("addBubble called with say:", say);
    const animationTime = live ? animTime : 0;
    const typeSpeed = live ? tSpeed : 0;
    // create bubble element
    const bubble = document.createElement("div");

    let isAnInput = say.startsWith('---input---');

    if (isAnInput) {
      say = say.replace('---input---', '');
    }

    // Replace \[ with $$ and \] with $$
    say = say.replace(/\\\[|\\\]/g, function(match) {
      return match === '\\[' ? '$$' : '$$';
    });

    // Replace \( with $ and \) with $
    say = say.replace(/\\\(|\\\)/g, function(match) {
      return match === '\\(' ? '$' : '$';
    });
     
    console.log("Processed say:", say);

    const bubbleContent = document.createElement("span");
    bubble.className = "bubble imagine " + (!live ? " history " : "") + reply;
    bubbleContent.className = "bubble-content";

    const setupMarked = () => {
      console.log("Setting up marked...");
      
      const { Marked } = globalThis.marked;
      const { markedHighlight } = globalThis.markedHighlight;
      const newMarked = new Marked(
        markedHighlight({
        emptyLangClass: 'hljs',
          langPrefix: 'hljs language-',
          highlight(code, lang, info) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
          }
        })
      );      

      // parse markdown
      let parsedContent = newMarked.parse(say);

      if (isAnInput) {
        parsedContent = '<div class="user-message"><span class="bubble-button bubble-pick">' + parsedContent + "</span></div>";
      } else {
        parsedContent = '<div class="bot-message">' + parsedContent + "</div>";
      }

      console.log("Parsed content:", parsedContent);

      console.log("Setting innerHTML of bubbleContent");
      bubbleContent.innerHTML = parsedContent;
      bubble.appendChild(bubbleContent);
      bubbleWrap.insertBefore(bubble, bubbleTyping);

      // Ensure KaTeX is loaded and then render LaTeX equations
      ensureKaTeXLoaded(() => {
        console.log("Rendering math in element.");
        renderMathInElement(bubbleContent, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false},
            {left: "\\[", right: "\\]", display: true},
            {left: "\\(", right: "\\)", display: false}
          ]
        });
      });
    }

    ensureMarkedLoaded(setupMarked);

    // answer picker styles
    if (reply !== "") {
      const bubbleButtons = bubbleContent.querySelectorAll(".bubble-button");
      for (let z = 0; z < bubbleButtons.length; z++) {
        ((el) => {
          if (!el.parentNode.parentNode.classList.contains("reply-freeform"))
            el.style.width = el.offsetWidth - sidePadding * 2 + widerBy + "px";
        })(bubbleButtons[z]);
      }
      bubble.addEventListener("click", (e) => {
        if (e.target.classList.contains('bubble-button')) {
          for (let i = 0; i < bubbleButtons.length; i++) {
            ((el) => {
              el.style.width = 0 + "px";
              el.classList.contains("bubble-pick") ? (el.style.width = "") : false;
              el.removeAttribute("onclick");
            })(bubbleButtons[i]);
          }
          this.classList.add("bubble-picked");
        }
      });
    }
    // time, size & animate
    let wait = live ? animationTime * 2 : 0;
    const minTypingWait = live ? animationTime * 6 : 0;
    if (say.length * typeSpeed > animationTime && reply === "") {
      wait += typeSpeed * say.length;
      wait < minTypingWait ? (wait = minTypingWait) : false;
      setTimeout(() => {
        bubbleTyping.classList.remove("imagine");
      }, animationTime);
    }
    live && setTimeout(() => {
      bubbleTyping.classList.add("imagine");
    }, wait - animationTime * 2);
    bubbleQueue = setTimeout(() => {
      bubble.classList.remove("imagine");
      const bubbleWidthCalc = bubbleContent.offsetWidth + widerBy + "px";
      bubble.style.width = reply === "" ? bubbleWidthCalc : "";
      bubble.style.width = say.includes("<img src=")
        ? "50%"
        : bubble.style.width;
      bubble.classList.add("say");
      posted();

      // save the interaction
      interactionsSave(say, reply, localStorageAvailable, interactionsHistory);
      !iceBreaker && interactionsSaveCommit(); // save point

      // animate scrolling
      const containerHeight = container.offsetHeight;
      const scrollDifference = bubbleWrap.scrollHeight - bubbleWrap.scrollTop;
      const scrollHop = scrollDifference / 200;
      const scrollBubbles = () => {
        for (let i = 1; i <= scrollDifference / scrollHop; i++) {
          (() => {
            setTimeout(() => {
              bubbleWrap.scrollHeight - bubbleWrap.scrollTop > containerHeight
                ? (bubbleWrap.scrollTop = bubbleWrap.scrollTop + scrollHop)
                : false;
            }, i * 5);
          })();
        }
      };
      setTimeout(scrollBubbles, animationTime / 2);
    }, wait + animationTime * 2);
};

export { addBubble, bubbleQueue };