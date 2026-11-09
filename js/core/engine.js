import { unlockAudioContext, resumeEmulatorAudio, registerAudioUnlockListeners } from "./audio.js?v=47";
import { resolveAssetUrl } from "./utils.js?v=47";
import { getVirtualGamepadSettings, getButtonInputMap } from "./gamepad-config.js?v=47";
import { AutoFireController, extractButtonId } from "./turbo.js?v=47";
import { LifecycleController } from "./lifecycle.js?v=47";

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
    this.buttonInputMap = new Map();

    this.turboController = new AutoFireController({
      simulateInputFn: (player, inputValue, state) => {
        if (
          typeof window !== "undefined" &&
          window.EJS_emulator &&
          window.EJS_emulator.gameManager &&
          typeof window.EJS_emulator.gameManager.simulateInput === "function"
        ) {
          window.EJS_emulator.gameManager.simulateInput(player, inputValue, state);
        }
      }
    });

    this.lifecycle = new LifecycleController({
      getEmulator: () => (typeof window !== "undefined" ? window.EJS_emulator : null),
      resumeAudioFn: () => resumeEmulatorAudio()
    });

    registerAudioUnlockListeners();

    if (this.viewportElement) {
      this.viewportElement.addEventListener(
        "touchstart",
        (e) => {
          if (this.lifecycle) {
            this.lifecycle.handleInteraction();
          }

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

          const touches = e.changedTouches || [e];
          for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const btn = touch.target && touch.target.closest && touch.target.closest(".ejs_virtualGamepad_button");
            if (btn) {
              const id = extractButtonId(btn);
              if (id && this.buttonInputMap.has(id)) {
                this.turboController.startPress(id, this.buttonInputMap.get(id), 0);
              }
            }
          }
        },
        { passive: true }
      );

      const handleTouchEnd = (e) => {
        if (this.lifecycle) {
          this.lifecycle.handleInteraction();
        }

        const touches = e.changedTouches || [e];
        for (let i = 0; i < touches.length; i++) {
          const touch = touches[i];
          const btn = touch.target && touch.target.closest && touch.target.closest(".ejs_virtualGamepad_button");
          if (btn) {
            const id = extractButtonId(btn);
            if (id && this.buttonInputMap.has(id)) {
              this.turboController.releasePress(id, this.buttonInputMap.get(id), 0);
            }
          }
        }
      };

      this.viewportElement.addEventListener("touchend", handleTouchEnd, { passive: true });
      this.viewportElement.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    }
  }

  setOnExit(fn) {
    this.onExitCallback = fn;
  }

  launch(game) {
    try {
      this.currentGame = game;
      this.buttonInputMap = getButtonInputMap(game.core);
      this.viewportElement.style.display = "block";

      if (this.lifecycle) {
        this.lifecycle.attach(
          typeof window !== "undefined" ? window : null,
          typeof document !== "undefined" ? document : null
        );
      }

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

      const isIOS =
        typeof navigator !== "undefined" &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

      window.EJS_threads = false;
      window.EJS_disableDatabases = true;
      window.EJS_disableLocalStorage = true;
      window.EJS_CacheLimit = 0;
      window.EJS_cacheLimit = 0;
      delete window.EJS_biosUrl;
      delete window.EJS_dontExtractBIOS;
      // No iOS WebKit, forcar core legado (WebGL 1.0) previne o vazamento de backing-store do compositor WebGL2
      window.EJS_forceLegacyCores = isIOS;

      const isArcade =
        game.core === "fbneo" ||
        game.core === "arcade" ||
        game.core === "fbalpha2012_cps1" ||
        game.core === "fbalpha2012_cps2" ||
        game.core === "mame2003_plus" ||
        game.core === "mame2003";

      if (isArcade) {
        // Reduz a profundidade grafica de 32-bit para 16-bit (economiza 50% de VRAM de sprites)
        // e calibra o clock de amostragem sonora para 22050 Hz
        window.EJS_defaultOptions = {
          "fbneo-allow-depth-32": "disabled",
          "fbneo-samplerate": "22050",
          "fbneo-sample-interpolation": "disabled",
          "fbneo-fm-interpolation": "disabled",
          "fbneo-hiscores": "disabled",
          "fbneo-memcard-mode": "disabled"
        };
      } else {
        delete window.EJS_defaultOptions;
      }

      if (game.core === "n64") {
        window.EJS_webgl = true;
        window.EJS_controlScheme = "n64";
        window.EJS_browserMode = "mobile";
      } else {
        window.EJS_webgl = false;
      }

      delete window.EJS_externalFiles;

      window.EJS_alignAudio = false;
      window.EJS_audioWorklet = false;
      // Taxa de 22050 Hz no Arcade economiza 50% de memoria em buffers Web Audio
      // e preserva a fidelidade nativa do chip de som Yamaha YM2610 do Neo-Geo
      window.EJS_sampleRate = isArcade ? 22050 : 44100;
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

      const attachCanvasWebGLGuards = (canvas) => {
        if (!canvas || canvas._webglGuardsAttached) return;
        canvas._webglGuardsAttached = true;

        canvas.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            console.warn("RetroCart: webglcontextlost interceptado com preventDefault.");
          },
          false
        );

        canvas.addEventListener(
          "webglcontextrestored",
          (e) => {
            console.log("RetroCart: webglcontextrestored disparado. Sincronizando estado...");
            resumeEmulatorAudio();
            if (window.EJS_emulator && typeof window.EJS_emulator.handleResize === "function") {
              window.EJS_emulator.handleResize();
            }
          },
          false
        );
      };

      this.layoutObserver = new MutationObserver(() => {
        enforceLayout();
        const canvas = this.targetElement.querySelector("canvas");
        if (canvas) {
          attachCanvasWebGLGuards(canvas);
        }
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
    if (this.lifecycle) {
      this.lifecycle.detach();
    }

    if (this.turboController) {
      this.turboController.cancelAll();
    }
    if (this.buttonInputMap) {
      this.buttonInputMap.clear();
    }

    if (typeof window !== "undefined" && window.EJS_emulator) {
      try {
        if (typeof window.EJS_emulator.pause === "function") {
          window.EJS_emulator.pause();
        }
      } catch (e) {}
    }

    if (this.targetElement) {
      this.targetElement.innerHTML = "";
    }
    if (this.viewportElement && this.viewportElement.style) {
      this.viewportElement.style.display = "none";
    }
    this.currentGame = null;

    if (typeof document !== "undefined" && document.fullscreenElement) {
      try {
        document.exitFullscreen().catch(() => {});
      } catch (e) {}
    }

    if (typeof screen !== "undefined" && screen.orientation && screen.orientation.unlock) {
      try {
        screen.orientation.unlock();
      } catch (e) {}
    }

    if (typeof window !== "undefined") {
      delete window.EJS_emulator;
      delete window.EJS_VirtualGamepadSettings;
      delete window.EJS_biosUrl;
      delete window.EJS_dontExtractBIOS;
      delete window.EJS_externalFiles;
    }

    if (this.layoutObserver) {
      this.layoutObserver.disconnect();
      this.layoutObserver = null;
    }

    if (typeof this.onExitCallback === "function") {
      this.onExitCallback();
    }
  }
}
