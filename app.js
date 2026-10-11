(function () {
  const engine = Yakety.createEngine(window.YAKETY_MESSAGES);

  const yak = document.getElementById("yakety");
  const bubble = document.getElementById("bubble");
  const sizer = document.getElementById("bubble-sizer");
  const typed = document.getElementById("bubble-typed");
  const live = document.getElementById("live");
  const counter = document.getElementById("counter");
  const confetti = document.getElementById("confetti");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const CONFETTI_COLORS = ["var(--ncssm-blue)", "var(--ncssm-navy)", "var(--ncssm-sky)", "var(--accent-gold)", "var(--cheek)"];
  const TYPE_STEP_MS = 25;   // how often the typed text advances
  const TYPE_CHARS = 2;      // characters revealed per step
  const LONG_MESSAGE = 200;  // characters; longer messages get a smaller bubble font

  let typingTimer = null;
  let currentText = "";

  function updateCounter(n) {
    counter.textContent = n === 0
      ? "No pep talks yet. Yakety is waiting! 🐾"
      : `🐾 Pep talks collected: ${n.toLocaleString()}`;
  }

  // Restart a CSS animation class on an element.
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // force a style flush so the animation restarts
    el.classList.add(cls);
  }

  // Stop any typing in progress and clear the talking mouth. Safe to call anytime.
  function stopTyping() {
    if (typingTimer !== null) {
      clearInterval(typingTimer);
      typingTimer = null;
    }
    yak.classList.remove("talking");
  }

  function showInstantly(text) {
    stopTyping();
    typed.textContent = text;
  }

  function say(text) {
    stopTyping();
    currentText = text;
    // Screen readers get the full message once, not one character at a time.
    live.textContent = text;
    // The invisible sizer holds the full text so the bubble doesn't grow line
    // by line while the typed text catches up.
    sizer.textContent = text;
    bubble.classList.toggle("long", Array.from(text).length > LONG_MESSAGE);
    replay(bubble, "pop");

    if (reducedMotion.matches) {
      typed.textContent = text;
      return;
    }

    const chars = Array.from(text);
    let shown = 0;
    typed.textContent = "";
    yak.classList.add("talking");
    typingTimer = setInterval(() => {
      shown = Math.min(shown + TYPE_CHARS, chars.length);
      typed.textContent = chars.slice(0, shown).join("");
      if (shown >= chars.length) stopTyping();
    }, TYPE_STEP_MS);
  }

  function burst() {
    if (reducedMotion.matches) return;
    const rect = yak.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.4;

    for (let i = 0; i < 28; i++) {
      const piece = document.createElement("span");
      const isHeart = i % 5 === 0;
      piece.className = "confetti-piece" + (isHeart ? " heart" : "");
      if (isHeart) piece.textContent = "♥";
      const angle = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 120;
      piece.style.left = cx + "px";
      piece.style.top = cy + "px";
      piece.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      piece.style.setProperty("--dy", Math.sin(angle) * dist - 40 + "px");
      piece.style.setProperty("--spin", (Math.random() * 720 - 360) + "deg");
      piece.style.setProperty("--color", CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
      piece.style.animationDelay = Math.random() * 80 + "ms";
      confetti.appendChild(piece);
      // Remove each piece when its animation ends, with a timer as a backstop.
      piece.addEventListener("animationend", () => piece.remove());
      setTimeout(() => piece.remove(), 1600);
    }
  }

  // The boing class drives a one-shot animation on the body. Remove the class
  // when it ends so the idle bob takes over again.
  yak.addEventListener("animationend", (e) => {
    if (e.target.classList.contains("yak-body") && e.animationName === "boing") {
      yak.classList.remove("boing");
    }
  });

  yak.addEventListener("click", () => {
    const msg = engine.next();
    replay(yak, "boing");
    say(msg.text);
    burst();
    updateCounter(engine.count);
  });

  // If the user turns on reduced motion mid-typing, finish the message at once.
  const onMotionChange = () => {
    if (reducedMotion.matches && typingTimer !== null) showInstantly(currentText);
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", onMotionChange);
  else if (reducedMotion.addListener) reducedMotion.addListener(onMotionChange);

  updateCounter(engine.count);
})();
