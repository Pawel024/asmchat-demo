// core function
function Bubbles(container, self, options) {
  // options
  options = typeof options !== "undefined" ? options : {}
  animationTime = options.animationTime || 200 // how long it takes to animate chat bubble, also set in CSS
  typeSpeed = options.typeSpeed || 5 // delay per character, to simulate the machine "typing"
  widerBy = options.widerBy || 2 // add a little extra width to bubbles to make sure they don't break
  sidePadding = options.sidePadding || 6 // padding on both sides of chat bubbles
  recallInteractions = options.recallInteractions || 0 // number of interactions to be remembered and brought back upon restart
  inputCallbackFn = options.inputCallbackFn || false // should we display an input field?
  responseCallbackFn = options.responseCallbackFn || false // is there a callback function for when a user clicks on a bubble button

  var standingAnswer = "ice" // remember where to restart convo if interrupted

  var _convo = {} // local memory for conversation JSON object
  //--> NOTE that this object is only assigned once, per session and does not change for this
  // 		constructor name during open session.

  // local storage for recalling conversations upon restart
  var localStorageCheck = function() {
    var test = "chat-bubble-storage-test"
    try {
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch (error) {
      console.error(
        "Your server does not allow storing data locally. Most likely it's because you've opened this page from your hard-drive. For testing you can disable your browser's security or start a localhost environment."
      )
      return false
    }
  }
  var localStorageAvailable = localStorageCheck() && recallInteractions > 0
  var interactionsLS = "chat-bubble-interactions"
  var interactionsHistory =
    (localStorageAvailable &&
      JSON.parse(localStorage.getItem(interactionsLS))) ||
    []

  // prepare next save point
  interactionsSave = function(say, reply) {
    if (!localStorageAvailable) return
    // limit number of saves
    if (interactionsHistory.length > recallInteractions)
      interactionsHistory.shift() // removes the oldest (first) save to make space

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
      return

    // save to memory
    interactionsHistory.push({ say: say, reply: reply })
  }

  // commit save to localStorage
  interactionsSaveCommit = function() {
    if (!localStorageAvailable) return
    localStorage.setItem(interactionsLS, JSON.stringify(interactionsHistory))
  }

  // set up the stage
  container.classList.add("bubble-container")
  var bubbleWrap = document.createElement("div")
  bubbleWrap.className = "bubble-wrap"
  container.appendChild(bubbleWrap)

  // install user input textfield
  this.typeInput = function(callbackFn) {
    var inputWrap = document.createElement("div");
    inputWrap.className = "input-wrap";
    var inputText = document.createElement("textarea");
    inputText.setAttribute("placeholder", "Ask me anything about aircraft performance or aerodynamics...");
    inputWrap.appendChild(inputText);
    const backendUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    inputText.addEventListener("keypress", (e) => {
      // register user input
      if (e.keyCode == 13) {
        e.preventDefault();
        typeof bubbleQueue !== false ? clearTimeout(bubbleQueue) : false; // allow user to interrupt the bot
        var lastBubble = document.querySelectorAll(".bubble.say");
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
  var bubbleTyping = document.createElement("div");
  bubbleTyping.className = "bubble-typing imagine";
  for (dots = 0; dots < 3; dots++) {
    var dot = document.createElement("div");
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
    iceBreaker = typeof turn === "undefined";
    turn = !iceBreaker ? turn : _convo.ice;
    questionsHTML = "";
    if (!turn) return;
  
    console.log('turn:', turn); // Debugging statement to inspect turn object
  
    if (turn.reply !== undefined) {
      turn.reply.reverse();
      for (var i = 0; i < turn.reply.length; i++) {
        (function (el, count) {
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
    var func = (key, content) => {
      typeof window[key] === "function" ? window[key](content) : false;
    };
    
    if (content) {
      structured_content = {says: content};
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

  function ensureKaTeXLoaded(callback) {
    if (typeof renderMathInElement !== 'undefined') {
      callback();
    } else {
      console.log("KaTeX not yet loaded. Retrying...");
      setTimeout(() => ensureKaTeXLoaded(callback), 20);
    }
  }

  // create a bubble
  var bubbleQueue = false;
  var addBubble = function(say, posted, reply, live) {
    reply = typeof reply !== "undefined" ? reply : "";
    live = typeof live !== "undefined" ? live : true; // bubbles that are not "live" are not animated and displayed differently
    var animationTime = live ? this.animationTime : 0;
    var typeSpeed = live ? this.typeSpeed : 0;
    // create bubble element
    var bubble = document.createElement("div");
    var bubbleContent = document.createElement("span");
    bubble.className = "bubble imagine " + (!live ? " history " : "") + reply;
    bubbleContent.className = "bubble-content";
    bubbleContent.innerHTML = say;
    bubble.appendChild(bubbleContent);
    bubbleWrap.insertBefore(bubble, bubbleTyping);

    // Render LaTeX equations using KaTeX
    ensureKaTeXLoaded(() => renderMathInElement(bubbleContent));

    // answer picker styles
    if (reply !== "") {
      var bubbleButtons = bubbleContent.querySelectorAll(".bubble-button");
      for (var z = 0; z < bubbleButtons.length; z++) {
        (function(el) {
          if (!el.parentNode.parentNode.classList.contains("reply-freeform"))
            el.style.width = el.offsetWidth - sidePadding * 2 + widerBy + "px";
        })(bubbleButtons[z]);
      }
      bubble.addEventListener("click", function(e) {
        if (e.target.classList.contains('bubble-button')) {
          for (var i = 0; i < bubbleButtons.length; i++) {
            (function(el) {
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
    wait = live ? animationTime * 2 : 0;
    minTypingWait = live ? animationTime * 6 : 0;
    if (say.length * typeSpeed > animationTime && reply == "") {
      wait += typeSpeed * say.length;
      wait < minTypingWait ? (wait = minTypingWait) : false;
      setTimeout(function() {
        bubbleTyping.classList.remove("imagine");
      }, animationTime);
    }
    live && setTimeout(function() {
      bubbleTyping.classList.add("imagine");
    }, wait - animationTime * 2);
    bubbleQueue = setTimeout(function() {
      bubble.classList.remove("imagine");
      var bubbleWidthCalc = bubbleContent.offsetWidth + widerBy + "px";
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
      containerHeight = container.offsetHeight;
      scrollDifference = bubbleWrap.scrollHeight - bubbleWrap.scrollTop;
      scrollHop = scrollDifference / 200;
      var scrollBubbles = function() {
        for (var i = 1; i <= scrollDifference / scrollHop; i++) {
          (function() {
            setTimeout(function() {
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
  for (var i = 0; i < interactionsHistory.length; i++) {
    addBubble(
      interactionsHistory[i].say,
      function() {},
      interactionsHistory[i].reply,
      false
    )
  }
}

// below functions are specifically for WebPack-type project that work with import()

// this function automatically adds all HTML and CSS necessary for chat-bubble to function
function prepHTML(options) {
  // options
  var options = typeof options !== "undefined" ? options : {}
  var container = options.container || "chat" // id of the container HTML element
  var relative_path = options.relative_path || "./node_modules/chat-bubble/"

  // make HTML container element
  window[container] = document.createElement("div")
  window[container].setAttribute("id", container)
  document.body.appendChild(window[container])

  // style everything
  var appendCSS = function(file) {
    var link = document.createElement("link")
    link.href = file
    link.type = "text/css"
    link.rel = "stylesheet"
    link.media = "screen,print"
    document.getElementsByTagName("head")[0].appendChild(link)
  }
  appendCSS(relative_path + "component/styles/input.css")
  appendCSS(relative_path + "component/styles/reply.css")
  appendCSS(relative_path + "component/styles/says.css")
  appendCSS(relative_path + "component/styles/setup.css")
  appendCSS(relative_path + "component/styles/typing.css")
}

// exports for es6
if (typeof exports !== "undefined") {
  exports.Bubbles = Bubbles
  exports.prepHTML = prepHTML
}
