export class SettingsModule {
  constructor() {
    this.controlType = localStorage.getItem("retro_control_type") || "dpad";
    this.autoFire = localStorage.getItem("retro_autofire") === "true";
    this.inGameMode = false;
    this.engine = null;
    this.onExitGame = null;

    this.modal = document.getElementById("settings-modal");
    this.btnOpen = document.getElementById("btn-open-settings");
    this.btnClose = document.getElementById("btn-close-settings");
    this.btnDismissBottom = document.getElementById("btn-dismiss-settings");
    this.btnApplyControls = document.getElementById("btn-apply-controls");
    this.gameActionsSection = document.getElementById("modal-game-actions");

    this.btnQuickSave = document.getElementById("btn-quick-save");
    this.btnQuickLoad = document.getElementById("btn-quick-load");
    this.btnQuickRestart = document.getElementById("btn-quick-restart");
    this.btnQuickExit = document.getElementById("btn-quick-exit");

    this.initListeners();
  }

  setEngine(engine, onExitGame) {
    this.engine = engine;
    this.onExitGame = onExitGame;
  }

  open() {
    if (!this.modal) return;
    this.updateUI();
    this.modal.classList.remove("hidden");
  }

  close() {
    if (!this.modal) return;
    this.modal.classList.add("hidden");
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

    document.querySelectorAll('input[name="autofire-setting"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        this.autoFire = e.target.value === "true";
        localStorage.setItem("retro_autofire", String(this.autoFire));
        if (this.engine && this.engine.autoFire) {
          this.engine.autoFire.setEnabled(this.autoFire);
        }
      });
    });

    window.addEventListener("autofire:changed", (e) => {
      this.autoFire = Boolean(e.detail);
      const radio = document.querySelector(`input[name="autofire-setting"][value="${String(this.autoFire)}"]`);
      if (radio) radio.checked = true;
    });

    if (this.btnQuickSave) {
      this.btnQuickSave.addEventListener("click", () => {
        if (this.engine && this.engine.quickSave()) {
          this.showToast("Estado do jogo salvo com sucesso.");
        } else {
          this.showToast("Nao foi possivel salvar o estado neste momento.");
        }
      });
    }

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

    if (this.btnQuickRestart) {
      this.btnQuickRestart.addEventListener("click", () => {
        if (this.engine) {
          this.engine.restart();
          this.showToast("Jogo reiniciado.");
          this.close();
        }
      });
    }

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
