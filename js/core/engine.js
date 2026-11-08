import { unlockAudioContext } from "./audio.js";
import { getAnalogGamepadSettings } from "./controls.js";
import { AutoFireManager } from "./autofire.js";

function initEmulatorPopupFix() {
  const enhance = () => {
    document.querySelectorAll(".ejs_popup_container").forEach((popup) => {
      const directButtons = Array.from(popup.children).filter(
        (el) => el.classList && el.classList.contains("ejs_button")
      );
      if (directButtons.length > 0) {
        let footer = popup.querySelector(".ejs_popup_footer_bar");
        if (!footer) {
          footer = document.createElement("div");
          footer.className = "ejs_popup_footer_bar";
          popup.appendChild(footer);
        }
        directButtons.forEach((btn) => footer.appendChild(btn));
      }

      const title = popup.querySelector("h4");
      if (title && !title.querySelector(".ejs_popup_top_close")) {
        const topClose = document.createElement("button");
        topClose.type = "button";
        topClose.className = "ejs_popup_top_close";
        topClose.innerHTML = "&times;";
        topClose.setAttribute("aria-label", "Fechar");
        topClose.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const closeBtn = Array.from(popup.querySelectorAll(".ejs_button")).find((b) =>
            b.textContent.trim().toLowerCase().includes("close")
          );
          if (closeBtn) {
            closeBtn.click();
          } else {
            popup.style.display = "none";
          }
        });
        title.appendChild(topClose);
      }
    });
  };

  const observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  enhance();
}

export class EmulatorEngine {
  constructor(viewportElement, targetElement) {
    this.viewportElement = viewportElement;
    this.targetElement = targetElement;
    this.autoFire = new AutoFireManager();
    this.currentGame = null;
    this.currentControlType = null;

    initEmulatorPopupFix();
  }

  launch(game, controlType, autoFireEnabled) {
    this.currentGame = game;
    this.currentControlType = controlType;
    this.viewportElement.style.display = "block";

    this.autoFire.setEnabled(autoFireEnabled);
    this.autoFire.start(this.viewportElement);

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }

    unlockAudioContext();

    this.targetElement.innerHTML = `<div id="game-instance" style="width:100%; height:100%;"></div>`;
    window.EJS_player = "#game-instance";

    window.EJS_core = game.core;
    window.EJS_gameName = game.title;
    window.EJS_gameUrl = game.rom;
    window.EJS_color = game.color || "#6366f1";
    window.EJS_startOnLoaded = true;
    window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";

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

    if (controlType === "analog" && game.core !== "n64") {
      window.EJS_VirtualGamepadSettings = getAnalogGamepadSettings(game.core);
    } else {
      delete window.EJS_VirtualGamepadSettings;
    }

    const oldScript = document.getElementById("emulatorjs-loader");
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.id = "emulatorjs-loader";
    script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
    script.async = true;
    document.body.appendChild(script);
  }

  switchControlType(newControlType) {
    if (!this.currentGame) return;
    this.quickSave();
    this.launch(this.currentGame, newControlType, this.autoFire.enabled);
  }

  stop() {
    this.autoFire.stop();
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
    this.currentControlType = null;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (screen.orientation && screen.orientation.unlock) {
      try { screen.orientation.unlock(); } catch (e) {}
    }

    delete window.EJS_emulator;
    const oldScript = document.getElementById("emulatorjs-loader");
    if (oldScript) oldScript.remove();
  }

  quickSave() {
    if (window.EJS_emulator && window.EJS_emulator.gameManager && typeof window.EJS_emulator.gameManager.quickSave === "function") {
      try {
        window.EJS_emulator.gameManager.quickSave();
        return true;
      } catch (e) {}
    }
    return false;
  }

  quickLoad() {
    if (window.EJS_emulator && window.EJS_emulator.gameManager && typeof window.EJS_emulator.gameManager.quickLoad === "function") {
      try {
        window.EJS_emulator.gameManager.quickLoad();
        return true;
      } catch (e) {}
    }
    return false;
  }

  restart() {
    if (window.EJS_emulator && window.EJS_emulator.gameManager && typeof window.EJS_emulator.gameManager.restart === "function") {
      try {
        window.EJS_emulator.gameManager.restart();
        return true;
      } catch (e) {}
    } else if (this.currentGame) {
      this.launch(this.currentGame, this.currentControlType, this.autoFire.enabled);
      return true;
    }
    return false;
  }
}
