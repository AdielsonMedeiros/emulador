import { unlockAudioContext } from "./audio.js";
import { resolveAssetUrl } from "./utils.js";
import { getVirtualGamepadSettings } from "./gamepad-config.js";

export class EmulatorEngine {
  constructor(viewportElement, targetElement) {
    this.viewportElement = viewportElement;
    this.targetElement = targetElement;
    this.currentGame = null;
    this.onExitCallback = null;

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
      if (game.core === "n64") {
        window.EJS_webgl = true;
        window.EJS_controlScheme = "n64";
        window.EJS_browserMode = "mobile";
      } else {
        window.EJS_webgl = false;
      }

      window.EJS_alignAudio = false;
      window.EJS_audioWorklet = false;
      window.EJS_sampleRate = 44100;
      window.EJS_volume = 1.0;

      window.EJS_ready = () => {
        if (window.EJS_emulator) {
          window.EJS_emulator.on("exit", () => {
            this.stop();
          });
        }
      };

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

    if (typeof this.onExitCallback === "function") {
      this.onExitCallback();
    }
  }
}
