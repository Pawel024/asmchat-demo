import { interactionsSave } from './interactionsSaveUtils.js';
import { addBubble, bubbleQueue } from './addBubbleUtils.js';

// core function
export default function Bubbles(container, self, options = {}) {
  // options
  const animationTime = options.animationTime || 200; // how long it takes to animate chat bubble, also set in CSS
  const typeSpeed = options.typeSpeed || 5; // delay per character, to simulate the machine "typing"
  const widerBy = options.widerBy || 2; // add a little extra width to bubbles to make sure they don't break
  const sidePadding = options.sidePadding || 6; // padding on both sides of chat bubbles
  const recallInteractions = options.recallInteractions || 0; // number of interactions to be remembered and brought back upon restart
  const inputCallbackFn = options.inputCallbackFn || false; // should we display an input field?
  const responseCallbackFn = options.responseCallbackFn || false; // is there a callback function for when a user clicks on a bubble button

  let standingAnswer = "ice"; // remember where to restart convo if interrupted

  let _convo = {}; // local memory for conversation JSON object
  //--> NOTE that this object is only assigned once, per session and does not change for this
  // 		constructor name during open session.

  // local storage for recalling conversations upon restart
  const localStorageCheck = () => {
    const test = "chat-bubble-storage-test";
    try {
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      console.error(
        "Your server does not allow storing data locally. Most likely it's because you've opened this page from your hard-drive. For testing you can disable your browser's security or start a localhost environment."
      );
      return false;
    }
  };
  const localStorageAvailable = localStorageCheck() && recallInteractions > 0;
  const interactionsLS = "chat-bubble-interactions";
  const interactionsHistory =
    (localStorageAvailable &&
      JSON.parse(localStorage.getItem(interactionsLS))) ||
    [];

  // commit save to localStorage
  const interactionsSaveCommit = () => {
    if (!localStorageAvailable) return;
    localStorage.setItem(interactionsLS, JSON.stringify(interactionsHistory));
  };

  // set up the stage
  container.classList.add("bubble-container");
  const bubbleWrap = document.createElement("div");
  bubbleWrap.className = "bubble-wrap";
  container.appendChild(bubbleWrap);

  // install user input textfield
  this.typeInput = () => {
    const inputWrap = document.createElement("div");
    inputWrap.className = "input-wrap";
    const inputText = document.createElement("textarea");
    inputText.setAttribute("placeholder", "Ask me anything about aerospace structures and materials...");
    inputWrap.appendChild(inputText);
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    inputText.addEventListener("keypress", (e) => {
      // register user input
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        typeof bubbleQueue !== false ? clearTimeout(bubbleQueue) : false; // allow user to interrupt the bot
        let lastBubble = document.querySelectorAll(".bubble.say");
        lastBubble = lastBubble[lastBubble.length - 1];
        lastBubble.classList.contains("reply") &&
        !lastBubble.classList.contains("reply-freeform")
          ? lastBubble.classList.add("bubble-hidden")
          : false;
        addBubble(
          '---input---' + inputText.value,
          () => {},
          container,
          this.animationTime,
          this.typeSpeed,
          widerBy,
          sidePadding,
          bubbleWrap,
          bubbleTyping,
          interactionsSave,
          interactionsSaveCommit,
          interactionsHistory,
          localStorageAvailable,
          "reply reply-freeform"
        );
        // Send user input to chatbot engine
        fetch(`${backendUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ input: inputText.value })
        })
        .then(response => response.json())
        .then(data => {
          // Pass the response to the answer method
          this.answer(data.key, data.content);
        })
        .catch(error => console.error('Error:', error));
        inputText.value = "";
      }
    });
    container.appendChild(inputWrap);
    bubbleWrap.style.paddingBottom = "100px";
    inputText.focus();
  };
  inputCallbackFn ? this.typeInput() : false;
  
  // init typing bubble
  const bubbleTyping = document.createElement("div");
  bubbleTyping.className = "bubble-typing imagine";
  for (let dots = 0; dots < 3; dots++) {
    const dot = document.createElement("div");
    dot.className = "dot_" + dots + " dot";
    bubbleTyping.appendChild(dot);
  }
  bubbleWrap.appendChild(bubbleTyping);
  
  // accept JSON & create bubbles
  this.talk = (convo, here) => {
    // all further .talk() calls will append the conversation with additional blocks defined in convo parameter
    _convo = Object.assign(_convo, convo); // POLYFILL REQUIRED FOR OLDER BROWSERS
  
    console.log('convo:', _convo); // Debugging statement to inspect convo object
  
    this.reply(_convo[here]);
    here ? (standingAnswer = here) : false;
  };
  
  this.reply = (turn) => {
    const iceBreaker = typeof turn === "undefined";
    turn = !iceBreaker ? turn : _convo.ice;
    let questionsHTML = "";
    if (!turn) return;
  
    console.log('turn:', turn); // Debugging statement to inspect turn object
  
    if (turn.reply !== undefined) {
      turn.reply.reverse();
      for (let i = 0; i < turn.reply.length; i++) {
        ((el, count) => {
          questionsHTML +=
            '<span class="bubble-button" style="animation-delay: ' +
            animationTime / 2 * count +
            'ms" onClick="' +
            self +
            ".answer('" +
            el.answer +
            "', '" +
            el.question +
            "');this.classList.add('bubble-pick')\">" +
            el.question +
            "</span>";
        })(turn.reply[i], i);
      }
    }
  
    // Ensure turn.says is a single string
    if (typeof turn.says === "string") {
      addBubble(turn.says, () => {
        bubbleTyping.classList.remove("imagine");
        questionsHTML !== ""
          ? addBubble(questionsHTML, () => {}, container, this.animationTime, this.typeSpeed, widerBy, sidePadding, bubbleWrap, bubbleTyping, interactionsSave, interactionsSaveCommit, interactionsHistory, localStorageAvailable, "reply")
          : bubbleTyping.classList.add("imagine");
      }, container, this.animationTime, this.typeSpeed, widerBy, sidePadding, bubbleWrap, bubbleTyping, interactionsSave, interactionsSaveCommit, interactionsHistory, localStorageAvailable);
    } else {
      console.error("Error: turn.says is not a string", turn.says);
    }
  };
  
  // navigate "answers"
  this.answer = (key, content) => {
    const func = (key, content) => {
      typeof window[key] === "function" ? window[key](content) : false;
    };
    
    if (content) {
      const structured_content = {says: content};
      this.reply(structured_content);
      standingAnswer = key;

      // Add re-generated user picks to the history stack
      if (content !== undefined) {
        interactionsSave(
          '<span class="bubble-button reply-pick">' + content + "</span>",
          "reply reply-pick"
        );
      }
    } else {
      func(key, content);
    }
  };

  // recall previous interactions
  for (let i = 0; i < interactionsHistory.length; i++) {
    addBubble(
      interactionsHistory[i].say,
      () => {},
      container,
      this.animationTime,
      this.typeSpeed,
      widerBy,
      sidePadding,
      bubbleWrap,
      bubbleTyping,
      interactionsSave,
      interactionsSaveCommit,
      interactionsHistory,
      localStorageAvailable,
      interactionsHistory[i].reply,
      false,
      this.iceBreaker
    );
  }
}