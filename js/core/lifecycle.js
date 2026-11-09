/**
 * @fileoverview LifecycleController
 * Gerencia os estados de primeiro/segundo plano (background/foreground) da aplicacao,
 * garantindo captura de snapshot da RAM, hot-restore automatico em caso de perda de contexto WebGL
 * e sincronizacao deterministica de AudioContext no iOS WebKit e Android Chromium.
 */

export class LifecycleController {
  /**
   * @param {Object} options
   * @param {Function} [options.getEmulator] Retorna a instancia ativa do window.EJS_emulator
   * @param {Function} [options.resumeAudioFn] Funcao delegada para destravamento do Web Audio
   * @param {Function} [options.onRequestRestore] Callback acionado quando um hot-restore for necessario
   */
  constructor(options = {}) {
    this.getEmulator =
      typeof options.getEmulator === "function"
        ? options.getEmulator
        : () => (typeof window !== "undefined" ? window.EJS_emulator : null);
    this.resumeAudio = typeof options.resumeAudioFn === "function" ? options.resumeAudioFn : () => {};
    this.onRequestRestore = typeof options.onRequestRestore === "function" ? options.onRequestRestore : null;

    this.savedStateBuffer = null;
    this.hiddenTimestamp = 0;
    this.isContextLost = false;

    this.attachedWindow = null;
    this.attachedDocument = null;

    this.onVisibilityChange = null;
    this.onPageShow = null;
    this.onFocus = null;
  }

  /**
   * Chamado quando o estado de visibilidade da aba se altera.
   * @param {"hidden"|"visible"} state
   */
  handleVisibilityChange(state) {
    const emu = this.getEmulator();
    if (!emu) return;

    if (state === "hidden") {
      this.hiddenTimestamp = Date.now();

      // 1. Snapshot da memoria RAM (CPU, VRAM, progresso exato da partida)
      try {
        if (emu.gameManager && typeof emu.gameManager.getState === "function") {
          this.savedStateBuffer = emu.gameManager.getState();
        }
      } catch (e) {
        console.warn("Falha ao capturar snapshot de RAM:", e);
      }

      // 2. Persistencia de SRAM nativa (bateria)
      if (emu.gameManager && typeof emu.gameManager.saveSaveFiles === "function") {
        try {
          emu.gameManager.saveSaveFiles();
        } catch (e) {}
      }

      // 3. Pausa limpa da engine
      if (typeof emu.pause === "function" && !emu.paused) {
        try {
          emu.pause();
        } catch (e) {}
      }
    } else if (state === "visible") {
      this.handleReturn(emu, "visible");
    }
  }

  /**
   * Chamado em eventos de foco/exibicao (pageshow, focus).
   * @param {string} eventName
   */
  handleForegroundEvent(eventName) {
    const emu = this.getEmulator();
    if (!emu) return;
    this.handleReturn(emu, eventName);
  }

  /**
   * Avalia as condicoes de retorno da aba.
   * Se a GPU perdeu o contexto WebGL ou a aba ficou oculta por tempo suficiente para sofrer descarte de textura,
   * dispara o hot-restore com o snapshot salvo.
   * @param {Object} emu
   * @param {string} sourceEvent
   */
  handleReturn(emu, sourceEvent) {
    const elapsedMs = this.hiddenTimestamp ? Date.now() - this.hiddenTimestamp : 0;
    const shouldHotRestore =
      (this.isContextLost || elapsedMs >= 15000) &&
      this.savedStateBuffer !== null;

    if (shouldHotRestore && typeof this.onRequestRestore === "function") {
      const stateToRestore = this.savedStateBuffer;
      this.savedStateBuffer = null;
      this.isContextLost = false;
      this.hiddenTimestamp = 0;
      this.onRequestRestore(stateToRestore);
      return;
    }

    this.resumeAll(emu);
  }

  /**
   * Destravamento por interacao direta (executado dentro de contexto de gesto do usuario).
   */
  handleInteraction() {
    try {
      this.resumeAudio();
    } catch (e) {}

    const emu = this.getEmulator();
    if (!emu) return;

    if (emu.paused && typeof emu.play === "function") {
      try {
        emu.play();
      } catch (e) {}
    }

    if (typeof emu.handleResize === "function") {
      try {
        emu.handleResize();
      } catch (e) {}
    }
  }

  /**
   * Executa a sequencia deterministica de retomada do motor e do som.
   * @private
   */
  resumeAll(emu) {
    try {
      this.resumeAudio();
    } catch (e) {}

    if (emu) {
      if (emu.paused && typeof emu.play === "function") {
        try {
          emu.play();
        } catch (e) {}
      }

      if (typeof emu.handleResize === "function") {
        try {
          emu.handleResize();
        } catch (e) {}
      }
    }
  }

  /**
   * Conecta os listeners globais de visibilidade e primeiro plano.
   * @param {Window} [win]
   * @param {Document} [doc]
   */
  attach(win = (typeof window !== "undefined" ? window : null), doc = (typeof document !== "undefined" ? document : null)) {
    this.detach();

    if (!doc || !win) return;

    this.attachedWindow = win;
    this.attachedDocument = doc;

    this.onVisibilityChange = () => {
      this.handleVisibilityChange(doc.visibilityState);
    };

    this.onPageShow = () => {
      this.handleForegroundEvent("pageshow");
    };

    this.onFocus = () => {
      this.handleForegroundEvent("focus");
    };

    if (typeof doc.addEventListener === "function") {
      doc.addEventListener("visibilitychange", this.onVisibilityChange, { passive: true });
    }

    if (typeof win.addEventListener === "function") {
      win.addEventListener("pageshow", this.onPageShow, { passive: true });
      win.addEventListener("focus", this.onFocus, { passive: true });
    }
  }

  /**
   * Desconecta os listeners de forma limpa.
   */
  detach() {
    if (this.attachedDocument && typeof this.attachedDocument.removeEventListener === "function" && this.onVisibilityChange) {
      this.attachedDocument.removeEventListener("visibilitychange", this.onVisibilityChange);
    }

    if (this.attachedWindow && typeof this.attachedWindow.removeEventListener === "function") {
      if (this.onPageShow) this.attachedWindow.removeEventListener("pageshow", this.onPageShow);
      if (this.onFocus) this.attachedWindow.removeEventListener("focus", this.onFocus);
    }

    this.attachedDocument = null;
    this.attachedWindow = null;
    this.onVisibilityChange = null;
    this.onPageShow = null;
    this.onFocus = null;
  }
}
