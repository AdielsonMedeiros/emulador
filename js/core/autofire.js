const ACTION_BUTTON_MAP = {
  b_y: 0,
  b_b: 1,
  b_a: 8,
  b_x: 9,
  b_c: 8
};

export class AutoFireManager {
  constructor() {
    this.enabled = localStorage.getItem("retro_autofire") === "true";
    this.activeIntervals = new Map();
    this.pill = document.getElementById("turbo-pill");
    this.observer = null;
    this.attachedButtons = new Set();

    this.initPill();
  }

  initPill() {
    if (!this.pill) return;
    this.updatePillUI();

    this.pill.addEventListener("click", (e) => {
      e.stopPropagation();
      this.enabled = !this.enabled;
      localStorage.setItem("retro_autofire", String(this.enabled));
      this.updatePillUI();
    });
  }

  updatePillUI() {
    if (!this.pill) return;
    if (this.enabled) {
      this.pill.textContent = "TURBO: ON";
      this.pill.classList.add("active");
    } else {
      this.pill.textContent = "TURBO: OFF";
      this.pill.classList.remove("active");
    }
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    this.updatePillUI();
  }

  start(viewportElement) {
    if (this.pill) {
      this.pill.classList.remove("hidden");
      this.updatePillUI();
    }

    this.cleanup();

    this.observer = new MutationObserver(() => {
      this.bindButtons(viewportElement);
    });

    this.observer.observe(viewportElement, {
      childList: true,
      subtree: true
    });

    this.bindButtons(viewportElement);
  }

  bindButtons(container) {
    const buttons = container.querySelectorAll(".b_y, .b_b, .b_a, .b_x, .b_c");
    buttons.forEach((btn) => {
      if (this.attachedButtons.has(btn)) return;
      this.attachedButtons.add(btn);

      const buttonClass = Array.from(btn.classList).find((c) => c in ACTION_BUTTON_MAP);
      if (!buttonClass) return;
      const inputCode = ACTION_BUTTON_MAP[buttonClass];

      const startHandler = (e) => {
        if (!this.enabled) return;
        e.stopPropagation();

        if (this.activeIntervals.has(buttonClass)) {
          clearInterval(this.activeIntervals.get(buttonClass));
        }

        let state = 1;
        const pulse = () => {
          if (window.EJS_emulator && window.EJS_emulator.gameManager) {
            window.EJS_emulator.gameManager.simulateInput(0, inputCode, state);
            state = state === 1 ? 0 : 1;
          }
        };

        pulse();
        const intervalId = setInterval(pulse, 45);
        this.activeIntervals.set(buttonClass, intervalId);
      };

      const stopHandler = () => {
        if (this.activeIntervals.has(buttonClass)) {
          clearInterval(this.activeIntervals.get(buttonClass));
          this.activeIntervals.delete(buttonClass);
        }

        if (window.EJS_emulator && window.EJS_emulator.gameManager) {
          window.EJS_emulator.gameManager.simulateInput(0, inputCode, 0);
        }
      };

      btn.addEventListener("touchstart", startHandler, { capture: true, passive: false });
      btn.addEventListener("touchend", stopHandler, { capture: true, passive: false });
      btn.addEventListener("touchcancel", stopHandler, { capture: true, passive: false });
      btn.addEventListener("pointerdown", startHandler, { capture: true });
      btn.addEventListener("pointerup", stopHandler, { capture: true });
      btn.addEventListener("pointercancel", stopHandler, { capture: true });
    });
  }

  cleanup() {
    this.activeIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.activeIntervals.clear();
    this.attachedButtons.clear();

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
