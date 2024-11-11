// below function is specifically for WebPack-type project that work with import()

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