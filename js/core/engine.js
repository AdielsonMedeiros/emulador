import { unlockAudioContext } from "./audio.js";
import { getAnalogGamepadSettings } from "./controls.js";
import { AutoFireManager } from "./autofire.js";

function initEmulatorPopupFix() {
  const enhance = () => {
    document.querySelectorAll(".ejs_popup_container").forEach((popup) => {
      // Ignorar e manter oculto o painel nativo de drop de arquivos de desktop
      if (popup.innerText && popup.innerText.includes("Drop save state here to load")) {
        popup.style.display = "none";
        return;
      }

      if (popup.style.display === "none") {
        return;
      }

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

  togglePause() {
    if (!window.EJS_emulator) return false;
    if (window.EJS_emulator.paused) {
      if (typeof window.EJS_emulator.play === "function") {
        window.EJS_emulator.play();
      }
      return false; // agora esta rodando
    } else {
      if (typeof window.EJS_emulator.pause === "function") {
        window.EJS_emulator.pause();
      }
      return true; // agora esta pausado
    }
  }

  isPaused() {
    return Boolean(window.EJS_emulator && window.EJS_emulator.paused);
  }

  setVolume(volPercent) {
    if (window.EJS_emulator && typeof window.EJS_emulator.setVolume === "function") {
      const vol = Math.max(0, Math.min(1, volPercent / 100));
      window.EJS_emulator.setVolume(vol);
      window.EJS_emulator.volume = vol;
      window.EJS_emulator.muted = vol === 0;
    }
  }

  openCheats() {
    if (window.EJS_emulator && window.EJS_emulator.cheatMenu) {
      window.EJS_emulator.cheatMenu.style.display = "";
      return true;
    }
    return false;
  }

  openControlSettings() {
    if (window.EJS_emulator && window.EJS_emulator.controlMenu) {
      window.EJS_emulator.controlMenu.style.display = "";
      return true;
    }
    return false;
  }

  openCacheManager() {
    if (window.EJS_emulator && typeof window.EJS_emulator.openCacheMenu === "function") {
      window.EJS_emulator.openCacheMenu();
      return true;
    }
    return false;
  }

  openEngineSettings() {
    if (window.EJS_emulator && window.EJS_emulator.settingsMenu) {
      window.EJS_emulator.settingsMenuOpen = true;
      window.EJS_emulator.settingsMenu.style.display = "";
      return true;
    }
    return false;
  }

  async exportSaveFile() {
    if (!window.EJS_emulator || !window.EJS_emulator.gameManager) return false;
    try {
      const file = await window.EJS_emulator.gameManager.getSaveFile();
      if (!file) return false;
      const blob = new Blob([file]);
      const savUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = savUrl;
      const filename = window.EJS_emulator.gameManager.getSaveFilePath
        ? window.EJS_emulator.gameManager.getSaveFilePath().split("/").pop()
        : `${this.currentGame ? this.currentGame.title : "save"}.sav`;
      a.download = filename || "game.sav";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(savUrl);
      }, 1000);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async importSaveFile() {
    if (!window.EJS_emulator || !window.EJS_emulator.selectFile) return false;
    try {
      const file = await window.EJS_emulator.selectFile();
      if (!file) return false;
      const sav = new Uint8Array(await file.arrayBuffer());
      const path = window.EJS_emulator.gameManager.getSaveFilePath();
      const paths = path.split("/");
      let cp = "";
      for (let i = 0; i < paths.length - 1; i++) {
        if (paths[i] === "") continue;
        cp += "/" + paths[i];
        if (!window.EJS_emulator.gameManager.FS.analyzePath(cp).exists) {
          window.EJS_emulator.gameManager.FS.mkdir(cp);
        }
      }
      if (window.EJS_emulator.gameManager.FS.analyzePath(path).exists) {
        window.EJS_emulator.gameManager.FS.unlink(path);
      }
      window.EJS_emulator.gameManager.FS.writeFile(path, sav);
      window.EJS_emulator.gameManager.restart();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
