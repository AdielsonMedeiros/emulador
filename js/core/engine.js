import { unlockAudioContext, resumeEmulatorAudio, registerAudioUnlockListeners } from "./audio.js?v=35";
import { resolveAssetUrl } from "./utils.js?v=35";
import { getVirtualGamepadSettings } from "./gamepad-config.js?v=35";

export function isAllowedInteractionTarget(target) {
  if (!target || typeof target.closest !== "function") return false;
  return Boolean(
    target.closest(".ejs_virtualGamepad_open") ||
    target.closest(".ejs_menu_bar") ||
    target.closest(".ejs_popup_container") ||
    target.closest(".ejs_context_menu") ||
    target.closest(".ejs_button")
  );
}

export class EmulatorEngine {
  constructor(viewportElement, targetElement) {
    this.viewportElement = viewportElement;
    this.targetElement = targetElement;
    this.currentGame = null;
    this.onExitCallback = null;

    registerAudioUnlockListeners();

    if (this.viewportElement) {
      this.viewportElement.addEventListener(
        "touchstart",
        (e) => {
          if (
            e.target &&
            (e.target.closest(".ejs_virtualGamepad_button") ||
              e.target.closest(".ejs_dpad_main") ||
              e.target.closest(".ejs_dpad_bar") ||
              e.target.closest(".nipple"))
          ) {
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              try {
                navigator.vibrate(12);
              } catch (err) {}
            }
          }
        },
        { passive: true }
      );
    }
  }

  setOnExit(fn) {
    this.onExitCallback = fn;
  }

  launch(game) {
    try {
      this.currentGame = game;
      this.viewportElement.style.display = "block";

      try {
        if (document.documentElement && typeof document.documentElement.requestFullscreen === "function") {
          const fsPromise = document.documentElement.requestFullscreen();
          if (fsPromise && typeof fsPromise.catch === "function") {
            fsPromise.catch(() => {});
          }
        }
      } catch (e) {}

      try {
        if (screen.orientation && typeof screen.orientation.lock === "function") {
          const lockPromise = screen.orientation.lock("landscape");
          if (lockPromise && typeof lockPromise.catch === "function") {
            lockPromise.catch(() => {});
          }
        }
      } catch (e) {}

      unlockAudioContext();

      this.targetElement.innerHTML = "";
      window.EJS_player = "#game-frame";

      window.EJS_core = game.core;
      window.EJS_gameName = game.title;
      window.EJS_gameUrl = resolveAssetUrl(game.rom);
      window.EJS_color = game.color || "#6366f1";
      window.EJS_startOnLoaded = true;
      window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
      window.EJS_VirtualGamepadSettings = getVirtualGamepadSettings(game.core);

      window.EJS_threads = false;
      window.EJS_cacheLimit = 40 * 1024 * 1024;
      if (game.core === "n64") {
        window.EJS_webgl = true;
        window.EJS_controlScheme = "n64";
        window.EJS_browserMode = "mobile";
      } else {
        window.EJS_webgl = false;
      }

      delete window.EJS_biosUrl;

      window.EJS_alignAudio = false;
      window.EJS_audioWorklet = false;
      window.EJS_sampleRate = 44100;
      window.EJS_volume = 1.0;

      window.EJS_ready = () => {
        if (window.EJS_emulator) {
          window.EJS_emulator.on("exit", () => {
            if (window.EJS_emulator && window.EJS_emulator.failedToStart) {
              console.warn("Emulador reportou falha ao iniciar; mantendo viewport para diagnostico.");
              return;
            }
            this.stop();
          });

          window.EJS_emulator.on("start", () => {
            if (window.EJS_emulator.menu && typeof window.EJS_emulator.menu.close === "function") {
              window.EJS_emulator.menu.close();
            }
            resumeEmulatorAudio();
          });

          // Desativa o listener de mousemove da barra de menu no ambiente touch
          if (window.EJS_emulator.menu && window.EJS_emulator.menu.mousemoveListener) {
            try {
              window.EJS_emulator.removeEventListener(window.EJS_emulator.menu.mousemoveListener);
              window.EJS_emulator.menu.mousemoveListener = null;
            } catch (e) {}
          }
        }
      };

      // Bloqueia eventos sinteticos de mousemove e click para impedir que a barra de menu inferior suba involuntariamente durante o gameplay
      if (!this.mouseGuardsAttached && this.targetElement) {
        this.targetElement.addEventListener(
          "mousemove",
          (e) => {
            if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
              e.stopImmediatePropagation();
            }
          },
          true
        );

        this.targetElement.addEventListener(
          "click",
          (e) => {
            if (!isAllowedInteractionTarget(e.target)) {
              e.stopImmediatePropagation();
              e.preventDefault();
            }
          },
          true
        );

        this.targetElement.addEventListener(
          "touchend",
          (e) => {
            const btn = e.target && e.target.closest && e.target.closest(".ejs_button");
            if (btn) {
              btn.click();
              e.preventDefault();
            }
          },
          { passive: false }
        );

        this.targetElement.addEventListener(
          "contextmenu",
          (e) => {
            if (!isAllowedInteractionTarget(e.target)) {
              e.preventDefault();
            }
          },
          true
        );

        this.mouseGuardsAttached = true;
      }

      if (this.layoutObserver) {
        this.layoutObserver.disconnect();
        this.layoutObserver = null;
      }

      const enforceLayout = () => {
        const bl = document.querySelector(".b_l");
        if (bl) {
          bl.style.setProperty("width", "58px", "important");
          bl.style.setProperty("height", "38px", "important");
          bl.style.setProperty("top", "-100px", "important");
          bl.style.setProperty("left", "3px", "important");
          bl.style.setProperty("border-radius", "8px", "important");
          bl.style.setProperty("position", "absolute", "important");
        }
        const br = document.querySelector(".b_r");
        if (br) {
          br.style.setProperty("width", "58px", "important");
          br.style.setProperty("height", "38px", "important");
          br.style.setProperty("top", "-100px", "important");
          br.style.setProperty("right", "3px", "important");
          br.style.setProperty("border-radius", "8px", "important");
          br.style.setProperty("position", "absolute", "important");
        }
        const stick = document.querySelector(".ejs_virtualGamepad_left .b_stick");
        if (stick) {
          stick.style.setProperty("background", "transparent", "important");
          stick.style.setProperty("border", "none", "important");
          stick.style.setProperty("box-shadow", "none", "important");
        }
        const menuToggle = document.querySelector(".ejs_virtualGamepad_open");
        if (menuToggle) {
          menuToggle.style.setProperty("opacity", "1", "important");
          menuToggle.style.setProperty("display", "flex", "important");
        }
      };

      this.layoutObserver = new MutationObserver(() => {
        enforceLayout();
      });
      this.layoutObserver.observe(this.targetElement, { childList: true, subtree: true });

      const oldScript = document.getElementById("emulatorjs-loader");
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.id = "emulatorjs-loader";
      script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
      script.async = true;
      script.onerror = () => {
        console.error("Falha ao carregar motor do emulador (CDN).");
      };
      document.body.appendChild(script);
    } catch (err) {
      console.error("Erro fatal ao iniciar emulador:", err);
    }
  }

  stop() {
    if (window.EJS_emulator) {
      try {
        if (typeof window.EJS_emulator.pause === "function") {
          window.EJS_emulator.pause();
        }
      } catch (e) {}
    }

    this.targetElement.innerHTML = "";
    this.viewportElement.style.display = "none";
    this.currentGame = null;

    if (document.fullscreenElement) {
      try {
        document.exitFullscreen().catch(() => {});
      } catch (e) {}
    }

    if (screen.orientation && screen.orientation.unlock) {
      try {
        screen.orientation.unlock();
      } catch (e) {}
    }

    delete window.EJS_emulator;
    delete window.EJS_VirtualGamepadSettings;

    if (this.layoutObserver) {
      this.layoutObserver.disconnect();
      this.layoutObserver = null;
    }

    if (typeof this.onExitCallback === "function") {
      this.onExitCallback();
    }
  }
}
