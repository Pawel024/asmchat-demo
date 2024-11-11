// core function
export function Bubbles(container, self, options = {}) {
  // options
  const animationTime = options.animationTime || 200; // how long it takes to animate chat bubble, also set in CSS
  const typeSpeed = options.typeSpeed || 5; // delay per character, to simulate the machine "typing"
  const widerBy = options.widerBy || 2; // add a little extra width to bubbles to make sure they don't break
  const sidePadding = options.sidePadding || 6; // padding on both sides of chat bubbles
  const recallInteractions = options.recallInteractions || 0; // number of interactions to be remembered and brought back upon restart
  const inputCallbackFn = options.inputCallbackFn || false; // should we display an input field?
  const responseCallbackFn = options.responseCallbackFn || false; // is there a callback function for when a user clicks on a bubble button

  var standingAnswer = "ice"; // remember where to restart convo if interrupted

  var _convo = {}; // local memory for conversation JSON object
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

  // prepare next save point
  const interactionsSave = (say, reply) => {
    if (!localStorageAvailable) return;
    // limit number of saves
    if (interactionsHistory.length > recallInteractions)
      interactionsHistory.shift(); // removes the oldest (first) save to make space

    // do not memorize buttons; only user input gets memorized:
    if (
      // `bubble-button` class name signals that it's a button
      say.includes("bubble-button") &&
      // if it is not of a type of textual reply
      reply !== "reply reply-freeform" &&
      // if it is not of a type of textual reply or memorized user choice
      reply !== "reply reply-pick"
    )
      // ...it shan't be memorized
      return;

    // save to memory
    interactionsHistory.push({ say: say, reply: reply });
  };

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
  this.typeInput = (callbackFn) => {
    const inputWrap = document.createElement("div");
    inputWrap.className = "input-wrap";
    const inputText = document.createElement("textarea");
    inputText.setAttribute("placeholder", "Ask me anything about aircraft performance or aerodynamics...");
    inputWrap.appendChild(inputText);
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    inputText.addEventListener("keypress", (e) => {
      // register user input
      if (e.key === 'Enter') {
        e.preventDefault();
        typeof bubbleQueue !== false ? clearTimeout(bubbleQueue) : false; // allow user to interrupt the bot
        let lastBubble = document.querySelectorAll(".bubble.say");
        lastBubble = lastBubble[lastBubble.length - 1];
        lastBubble.classList.contains("reply") &&
        !lastBubble.classList.contains("reply-freeform")
          ? lastBubble.classList.add("bubble-hidden")
          : false;
        addBubble(
          '<span class="bubble-button bubble-pick">' + inputText.value + "</span>",
          () => {},
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
  inputCallbackFn ? this.typeInput(inputCallbackFn) : false;
  
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
          ? addBubble(questionsHTML, () => {}, "reply")
          : bubbleTyping.classList.add("imagine");
      });
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
  
  // api for typing bubble
  this.think = () => {
    bubbleTyping.classList.remove("imagine");
    this.stop = () => {
      bubbleTyping.classList.add("imagine");
    };
  };

  const ensureKaTeXLoaded = (callback) => {
    if (typeof renderMathInElement !== 'undefined') {
      callback();
    } else {
      console.log("KaTeX not yet loaded. Retrying...");
      setTimeout(() => ensureKaTeXLoaded(callback), 20);
    }
  };

  // create a bubble
  let bubbleQueue = false;
  const addBubble = (say, posted, reply = "", live = true, iceBreaker = false) => {
    const animationTime = live ? this.animationTime : 0;
    const typeSpeed = live ? this.typeSpeed : 0;
    // create bubble element
    const bubble = document.createElement("div");

    // Custom renderer to preserve LaTeX delimiters
    const renderer = new marked.Renderer();
    renderer.text = (text) => {
      return text.replace(/\\\[/g, '\\[').replace(/\\\]/g, '\\]')
                .replace(/\\\(/g, '\\(').replace(/\\\)/g, '\\)');
    };

    // Parse the message content with Marked.js for Markdown support
    const parsedContent = marked(say, { renderer });

    const bubbleContent = document.createElement("span");
    bubble.className = "bubble imagine " + (!live ? " history " : "") + reply;
    bubbleContent.className = "bubble-content";
    bubbleContent.innerHTML = parsedContent;
    bubble.appendChild(bubbleContent);
    bubbleWrap.insertBefore(bubble, bubbleTyping);

    // Ensure KaTeX is loaded and then render LaTeX equations
    ensureKaTeXLoaded(() => {
      renderMathInElement(bubbleContent, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false},
          {left: "\\[", right: "\\]", display: true},
          {left: "\\(", right: "\\)", display: false}
        ]
      });
    });

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
    if (say.length * typeSpeed > animationTime && reply == "") {
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
      bubble.style.width = reply == "" ? bubbleWidthCalc : "";
      bubble.style.width = say.includes("<img src=")
        ? "50%"
        : bubble.style.width;
      bubble.classList.add("say");
      posted();

      // save the interaction
      interactionsSave(say, reply);
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

  // recall previous interactions
  for (let i = 0; i < interactionsHistory.length; i++) {
    addBubble(
      interactionsHistory[i].say,
      () => {},
      interactionsHistory[i].reply,
      false,
      this.iceBreaker
    );
  }
}

// below functions are specifically for WebPack-type project that work with import()

// this function automatically adds all HTML and CSS necessary for chat-bubble to function
export function prepHTML(options = {}) {
  const container = options.container || "chat"; // id of the container HTML element
  const relative_path = options.relative_path || "./node_modules/chat-bubble/";

  // make HTML container element
  window[container] = document.createElement("div");
  window[container].setAttribute("id", container);
  document.body.appendChild(window[container]);

  // style everything
  const appendCSS = (file) => {
    const link = document.createElement("link");
    link.href = file;
    link.type = "text/css";
    link.rel = "stylesheet";
    link.media = "screen,print";
    document.getElementsByTagName("head")[0].appendChild(link);
  };
  appendCSS(relative_path + "component/styles/input.css");
  appendCSS(relative_path + "component/styles/reply.css");
  appendCSS(relative_path + "component/styles/says.css");
  appendCSS(relative_path + "component/styles/setup.css");
  appendCSS(relative_path + "component/styles/typing.css");
}