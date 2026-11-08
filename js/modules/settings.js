export class SettingsModule {
  constructor() {
    this.controlType = localStorage.getItem("retro_control_type") || "dpad";
    this.autoFire = localStorage.getItem("retro_autofire") === "true";
    this.volume = parseInt(localStorage.getItem("retro_volume") || "100", 10);
    this.inGameMode = false;
    this.wasRunningBeforeOpen = false;
    this.manualPauseState = null;
    this.engine = null;
    this.onExitGame = null;

    this.modal = document.getElementById("settings-modal");
    this.btnOpen = document.getElementById("btn-open-settings");
    this.btnClose = document.getElementById("btn-close-settings");
    this.btnDismissBottom = document.getElementById("btn-dismiss-settings");
    this.btnApplyControls = document.getElementById("btn-apply-controls");
    this.gameActionsSection = document.getElementById("modal-game-actions");

    // Volume
    this.volumeSlider = document.getElementById("volume-slider");
    this.volumeBadge = document.getElementById("volume-val-badge");

    // Gameplay actions
    this.btnQuickPause = document.getElementById("btn-quick-pause");
    this.txtQuickPause = document.getElementById("txt-quick-pause");
    this.btnQuickRestart = document.getElementById("btn-quick-restart");
    this.btnQuickSave = document.getElementById("btn-quick-save");
    this.btnQuickLoad = document.getElementById("btn-quick-load");

    // Save files (.sav)
    this.btnExportSav = document.getElementById("btn-export-sav");
    this.btnImportSav = document.getElementById("btn-import-sav");

    // Ferramentas do emulador (antigo menu hamburguer)
    this.btnOpenControlsMap = document.getElementById("btn-open-controls-map");
    this.btnOpenCheats = document.getElementById("btn-open-cheats");
    this.btnOpenCache = document.getElementById("btn-open-cache");
    this.btnOpenEngineSettings = document.getElementById("btn-open-engine-settings");

    // Exit
    this.btnQuickExit = document.getElementById("btn-quick-exit");

    this.initListeners();
  }

  setEngine(engine, onExitGame) {
    this.engine = engine;
    this.onExitGame = onExitGame;
  }

  open() {
    if (!this.modal) return;
    if (this.inGameMode && this.engine) {
      this.wasRunningBeforeOpen = !this.engine.isPaused();
      if (this.wasRunningBeforeOpen) {
        this.engine.pause();
      }
    }
    this.updateUI();
    this.modal.classList.remove("hidden");
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.add("hidden");
    if (this.inGameMode && this.engine) {
      if (this.manualPauseState === true) {
        // Usuario escolheu explicitamente manter o jogo pausado via botao
      } else {
        this.engine.resume();
      }
      this.manualPauseState = null;
      this.wasRunningBeforeOpen = false;
    }
  }

  setInGameMode(inGame) {
    this.inGameMode = Boolean(inGame);
    this.updateUI();
  }

  updateUI() {
    if (this.gameActionsSection) {
      if (this.inGameMode) {
        this.gameActionsSection.classList.remove("hidden");
      } else {
        this.gameActionsSection.classList.add("hidden");
      }
    }

    if (this.btnDismissBottom) {
      this.btnDismissBottom.textContent = this.inGameMode ? "Voltar ao Jogo" : "Fechar";
    }

    if (this.btnApplyControls) {
      this.btnApplyControls.classList.add("hidden");
    }

    if (this.volumeSlider) {
      this.volumeSlider.value = this.volume;
    }
    if (this.volumeBadge) {
      this.volumeBadge.textContent = `${this.volume}%`;
    }

    if (this.txtQuickPause && this.engine) {
      this.txtQuickPause.textContent = this.engine.isPaused() ? "Retomar Jogo" : "Pausar Jogo";
    }

    const currentRadio = document.querySelector(`input[name="control-type"][value="${this.controlType}"]`);
    if (currentRadio) currentRadio.checked = true;

    const currentAutofireRadio = document.querySelector(`input[name="autofire-setting"][value="${String(this.autoFire)}"]`);
    if (currentAutofireRadio) currentAutofireRadio.checked = true;
  }

  initListeners() {
    if (this.btnOpen) {
      this.btnOpen.addEventListener("click", () => this.open());
    }
    if (this.btnClose) {
      this.btnClose.addEventListener("click", () => this.close());
    }
    if (this.btnDismissBottom) {
      this.btnDismissBottom.addEventListener("click", () => this.close());
    }
    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    // Volume Slider
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener("input", (e) => {
        this.volume = parseInt(e.target.value, 10);
        localStorage.setItem("retro_volume", String(this.volume));
        if (this.volumeBadge) {
          this.volumeBadge.textContent = `${this.volume}%`;
        }
        if (this.engine) {
          this.engine.setVolume(this.volume);
        }
      });
    }

    // Control Type
    document.querySelectorAll('input[name="control-type"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        this.controlType = e.target.value;
        localStorage.setItem("retro_control_type", this.controlType);

        if (this.inGameMode && this.engine && this.engine.currentControlType !== this.controlType) {
          if (this.btnApplyControls) {
            this.btnApplyControls.classList.remove("hidden");
          }
        } else if (this.btnApplyControls) {
          this.btnApplyControls.classList.add("hidden");
        }
      });
    });

    if (this.btnApplyControls) {
      this.btnApplyControls.addEventListener("click", () => {
        if (this.engine) {
          this.engine.switchControlType(this.controlType);
          this.showToast("Controles atualizados para o jogo.");
        }
        this.btnApplyControls.classList.add("hidden");
        this.close();
      });
    }

    // AutoFire
    document.querySelectorAll('input[name="autofire-setting"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        this.autoFire = e.target.value === "true";
        localStorage.setItem("retro_autofire", String(this.autoFire));
        if (this.engine && this.engine.autoFire) {
          this.engine.autoFire.setEnabled(this.autoFire);
        }
        this.showToast(this.autoFire ? "Modo Auto-Fire (Turbo) ativado." : "Modo Auto-Fire desativado.");
      });
    });

    // Pausar / Retomar
    if (this.btnQuickPause) {
      this.btnQuickPause.addEventListener("click", () => {
        if (this.engine) {
          const paused = this.engine.togglePause();
          this.manualPauseState = paused;
          if (this.txtQuickPause) {
            this.txtQuickPause.textContent = paused ? "Retomar Jogo" : "Pausar Jogo";
          }
          this.showToast(paused ? "Jogo pausado." : "Jogo retomado.");
        }
      });
    }

    // Reiniciar
    if (this.btnQuickRestart) {
      this.btnQuickRestart.addEventListener("click", () => {
        if (this.engine) {
          this.engine.restart();
          this.showToast("Jogo reiniciado.");
          this.close();
        }
      });
    }

    // Salvar Estado
    if (this.btnQuickSave) {
      this.btnQuickSave.addEventListener("click", () => {
        if (this.engine && this.engine.quickSave()) {
          this.showToast("Estado do jogo salvo com sucesso.");
        } else {
          this.showToast("Nao foi possivel salvar o estado neste momento.");
        }
      });
    }

    // Carregar Estado
    if (this.btnQuickLoad) {
      this.btnQuickLoad.addEventListener("click", () => {
        if (this.engine && this.engine.quickLoad()) {
          this.showToast("Estado do jogo carregado.");
          this.close();
        } else {
          this.showToast("Nenhum estado previo encontrado para carregar.");
        }
      });
    }

    // Exportar Save (.sav)
    if (this.btnExportSav) {
      this.btnExportSav.addEventListener("click", async () => {
        if (this.engine) {
          const ok = await this.engine.exportSaveFile();
          if (ok) {
            this.showToast("Download do save (.sav) iniciado.");
          } else {
            this.showToast("Nenhum dado de save encontrado para exportar.");
          }
        }
      });
    }

    // Importar Save (.sav)
    if (this.btnImportSav) {
      this.btnImportSav.addEventListener("click", async () => {
        if (this.engine) {
          const ok = await this.engine.importSaveFile();
          if (ok) {
            this.showToast("Save (.sav) importado com sucesso. Jogo reiniciado.");
            this.close();
          } else {
            this.showToast("Importacao cancelada ou invalida.");
          }
        }
      });
    }

    // Mapear Controles Físicos
    if (this.btnOpenControlsMap) {
      this.btnOpenControlsMap.addEventListener("click", () => {
        if (this.engine && this.engine.openControlSettings()) {
          this.close();
        } else {
          this.showToast("Mapeamento indisponivel neste momento.");
        }
      });
    }

    // Cheats / Trapaças
    if (this.btnOpenCheats) {
      this.btnOpenCheats.addEventListener("click", () => {
        if (this.engine && this.engine.openCheats()) {
          this.close();
        } else {
          this.showToast("Menu de cheats indisponivel para este console.");
        }
      });
    }

    // Gerenciador de Cache
    if (this.btnOpenCache) {
      this.btnOpenCache.addEventListener("click", () => {
        if (this.engine && this.engine.openCacheManager()) {
          this.close();
        } else {
          this.showToast("Gerenciador de cache indisponivel.");
        }
      });
    }

    // Configurações da Engine
    if (this.btnOpenEngineSettings) {
      this.btnOpenEngineSettings.addEventListener("click", () => {
        if (this.engine && this.engine.openEngineSettings()) {
          this.close();
        } else {
          this.showToast("Configuracoes da engine indisponiveis.");
        }
      });
    }

    // Sair do Jogo
    if (this.btnQuickExit) {
      this.btnQuickExit.addEventListener("click", () => {
        this.close();
        if (this.onExitGame) this.onExitGame();
      });
    }
  }

  showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3500);
  }

  getControlType() {
    return this.controlType;
  }

  getAutoFire() {
    return this.autoFire;
  }
}
