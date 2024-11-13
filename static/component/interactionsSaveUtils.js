// prepare next save point
export const interactionsSave = (say, reply, localStorageAvailable, interactionsHistory) => {
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