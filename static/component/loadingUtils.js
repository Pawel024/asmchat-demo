const ensureKaTeXLoaded = (callback) => {
    if (typeof renderMathInElement !== 'undefined') {
      console.log("KaTeX is loaded.");
      callback();
    } else {
      console.log("KaTeX not yet loaded. Retrying...");
      setTimeout(() => ensureKaTeXLoaded(callback), 20);
    }
  };

const ensureMarkedLoaded = (callback) => {
// reimplement emojis when debugging is done
if (typeof marked.parse !== 'undefined') {
    console.log("Marked is loaded!");
    callback();
} else {
    console.log("Marked not yet loaded. Retrying...");
    setTimeout(() => ensureMarkedLoaded(callback), 20);
}
};

export { ensureKaTeXLoaded, ensureMarkedLoaded };