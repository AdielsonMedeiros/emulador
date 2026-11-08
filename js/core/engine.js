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
    this.onExitCallback = null;

    initEmulatorPopupFix();
  }

  setOnExit(fn) {
    this.onExitCallback = fn;
  }

  setupEmulatorMenu(emulator) {
    if (!emulator || !emulator.elements || !emulator.elements.menu) return;

    const menuEl = emulator.elements.menu;
    if (menuEl.dataset.customEnhanced === "true") return;
    menuEl.dataset.customEnhanced = "true";

    // Garante que o menu inicie 100% fechado
    menuEl.classList.remove("retro_menu_open");
    menuEl.classList.add("ejs_menu_bar_hidden");

    let backdrop = document.getElementById("ejs-menu-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "ejs-menu-backdrop";
      backdrop.className = "ejs_menu_backdrop hidden";
      document.body.appendChild(backdrop);
    }

    const openMenu = () => {
      menuEl.classList.add("retro_menu_open");
      menuEl.classList.remove("ejs_menu_bar_hidden");
      backdrop.classList.remove("hidden");
    };

    const closeMenu = () => {
      menuEl.classList.remove("retro_menu_open");
      menuEl.classList.add("ejs_menu_bar_hidden");
      backdrop.classList.add("hidden");
    };

    const toggleMenu = () => {
      if (menuEl.classList.contains("retro_menu_open")) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    backdrop.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    };

    // Substitui métodos de controle do menu (ignora auto-open nativo no boot do jogo)
    if (emulator.menu) {
      emulator.menu.open = (forceByUser) => {
        if (forceByUser !== true) return;
        openMenu();
      };
      emulator.menu.close = closeMenu;
      emulator.menu.toggle = () => toggleMenu();

      // Desativa os listeners intrusivos nativos que abriam o menu ao clicar no canvas
      if (emulator.menu.mousemoveListener) {
        try {
          emulator.removeEventListener(emulator.menu.mousemoveListener);
        } catch (e) {}
      }
      emulator.createBottomMenuBarListeners = () => {};
    }

    // Força fechamento no boot
    closeMenu();

    // Tecla ESC fecha o menu
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menuEl.classList.contains("retro_menu_open")) {
        closeMenu();
      }
    });

    // Conecta o botão hambúrguer ao toggleMenu exclusivo
    const bindHamburger = () => {
      if (emulator.elements && emulator.elements.parent) {
        const hamburger = emulator.elements.parent.querySelector(".ejs_virtualGamepad_open");
        if (hamburger) {
          hamburger.style.display = "flex";
          hamburger.style.opacity = "1";
          hamburger.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
          };
        }
      }
    };
    bindHamburger();
    emulator.on("start", bindHamburger);

    let header = menuEl.querySelector(".ejs_menu_header");
    if (!header) {
      header = document.createElement("div");
      header.className = "ejs_menu_header";
      header.innerHTML = `
        <div class="ejs_menu_header_title">Menu do Jogo</div>
        <button type="button" class="ejs_menu_header_close" aria-label="Fechar">&times;</button>
      `;
      header.querySelector(".ejs_menu_header_close").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
      });
      menuEl.insertBefore(header, menuEl.firstChild);
    }

    let customSection = menuEl.querySelector(".ejs_menu_custom_section");
    if (!customSection) {
      customSection = document.createElement("div");
      customSection.className = "ejs_menu_custom_section";

      const btnControl = document.createElement("button");
      btnControl.type = "button";
      btnControl.className = "ejs_menu_custom_action_btn";
      btnControl.id = "ejs-custom-control-btn";

      const renderControlBtn = () => {
        const isAnalog = this.currentControlType === "analog";
        btnControl.classList.toggle("active", isAnalog);
        btnControl.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <div class="custom-action-texts">
            <span class="custom-action-label">Controle Touch: <strong>${isAnalog ? "Analógico (360)" : "D-Pad Clássico"}</strong></span>
            <span class="custom-action-sub">Toque para alternar para ${isAnalog ? "D-Pad Clássico" : "Analógico (360)"}</span>
          </div>
        `;
      };
      renderControlBtn();

      btnControl.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        const next = this.currentControlType === "analog" ? "dpad" : "analog";
        localStorage.setItem("retro_control_type", next);
        this.switchControlType(next);
      });

      const btnTurbo = document.createElement("button");
      btnTurbo.type = "button";
      btnTurbo.className = "ejs_menu_custom_action_btn";
      btnTurbo.id = "ejs-custom-turbo-btn";

      const renderTurboBtn = () => {
        const isEnabled = this.autoFire.enabled;
        btnTurbo.classList.toggle("active", isEnabled);
        btnTurbo.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <div class="custom-action-texts">
            <span class="custom-action-label">Auto-Fire Turbo: <strong>${isEnabled ? "ATIVADO (22Hz)" : "DESATIVADO"}</strong></span>
            <span class="custom-action-sub">${isEnabled ? "Segurar botão dispara rajadas contínuas" : "Toque normal dos botões de ação"}</span>
          </div>
        `;
      };
      renderTurboBtn();

      btnTurbo.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !this.autoFire.enabled;
        this.autoFire.setEnabled(next);
        localStorage.setItem("retro_autofire", String(next));
        renderTurboBtn();
      });

      customSection.appendChild(btnControl);
      customSection.appendChild(btnTurbo);

      if (header.nextSibling) {
        menuEl.insertBefore(customSection, header.nextSibling);
      } else {
        menuEl.appendChild(customSection);
      }
    }

    let bottomClose = menuEl.querySelector(".ejs_menu_bottom_close");
    if (!bottomClose) {
      bottomClose = document.createElement("button");
      bottomClose.type = "button";
      bottomClose.className = "ejs_menu_bottom_close";
      bottomClose.textContent = "Voltar ao Jogo";
      bottomClose.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
      });
      menuEl.appendChild(bottomClose);
    }

    emulator.on("exit", () => {
      closeMenu();
      if (typeof this.onExitCallback === "function") {
        this.onExitCallback();
      }
    });

    const exitBtns = Array.from(menuEl.querySelectorAll("button")).filter(
      (b) => b.textContent && (b.textContent.includes("Exit Emulation") || b.textContent.includes("Exit"))
    );
    exitBtns.forEach((btn) => {
      btn.classList.add("ejs_menu_exit_btn");
    });
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

    window.EJS_ready = () => {
      this.setupEmulatorMenu(window.EJS_emulator);
    };
    window.EJS_onGameStart = () => {
      this.setupEmulatorMenu(window.EJS_emulator);
    };

    const checkInterval = setInterval(() => {
      if (window.EJS_emulator && window.EJS_emulator.elements && window.EJS_emulator.elements.menu) {
        this.setupEmulatorMenu(window.EJS_emulator);
        clearInterval(checkInterval);
      }
    }, 200);
    setTimeout(() => clearInterval(checkInterval), 15000);

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
    this.currentControlType = newControlType;
    localStorage.setItem("retro_control_type", newControlType);
    this.launch(this.currentGame, newControlType, this.autoFire.enabled);
  }

  stop() {
    this.autoFire.stop();
    const backdrop = document.getElementById("ejs-menu-backdrop");
    if (backdrop) backdrop.remove();

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
    delete window.EJS_ready;
    delete window.EJS_onGameStart;
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

  pause() {
    if (!window.EJS_emulator) return false;
    if (!window.EJS_emulator.paused && typeof window.EJS_emulator.pause === "function") {
      try {
        window.EJS_emulator.pause();
      } catch (e) {}
    }
    try {
      const al = window.EJS_emulator?.gameManager?.Module?.AL;
      if (al?.currentCtx?.audioCtx?.state === "running") {
        al.currentCtx.audioCtx.suspend().catch(() => {});
      }
    } catch (e) {}
    return true;
  }

  resume() {
    if (!window.EJS_emulator) return false;
    try {
      const al = window.EJS_emulator?.gameManager?.Module?.AL;
      if (al?.currentCtx?.audioCtx?.state === "suspended") {
        al.currentCtx.audioCtx.resume().catch(() => {});
      }
    } catch (e) {}
    if (window.EJS_emulator.paused && typeof window.EJS_emulator.play === "function") {
      try {
        window.EJS_emulator.play();
      } catch (e) {}
    }
    return true;
  }

  togglePause() {
    if (!window.EJS_emulator) return false;
    if (window.EJS_emulator.paused) {
      this.resume();
      return false; // agora esta rodando
    } else {
      this.pause();
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
