export function installR1Controls({ onClick, onScrollUp, onScrollDown }) {
  // Official Creations hardware events degrade gracefully in an ordinary browser.
  window.addEventListener("sideClick", () => onClick?.());
  window.addEventListener("scrollUp", () => onScrollUp?.());
  window.addEventListener("scrollDown", () => onScrollDown?.());

  // Keyboard equivalents make desktop testing easy.
  window.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") onClick?.();
    if (event.key === "ArrowUp") onScrollUp?.();
    if (event.key === "ArrowDown") onScrollDown?.();
  });
}
