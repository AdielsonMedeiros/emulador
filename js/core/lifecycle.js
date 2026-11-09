/**
 * @fileoverview LifecycleController
 * Gerencia os estados de primeiro/segundo plano (background/foreground) da aplicacao,
 * garantindo sincronizacao deterministica de AudioContext, MainLoop e WebGL no iOS WebKit e Android Chromium.
 */

export class LifecycleController {
  /**
   * @param {Object} options
   * @param {Function} [options.getEmulator] Retorna a instancia ativa do window.EJS_emulator
   * @param {Function} [options.resumeAudioFn] Funcao delegada para destravamento do Web Audio
   */
  constructor(options = {}) {
    this.getEmulator =
      typeof options.getEmulator === "function"
        ? options.getEmulator
        : () => (typeof window !== "undefined" ? window.EJS_emulator : null);
    this.resumeAudio = typeof options.resumeAudioFn === "function" ? options.resumeAudioFn : () => {};

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
      // Background: pausa o emulador de forma limpa atraves do emu.pause()
      if (typeof emu.pause === "function" && !emu.paused) {
        try {
          emu.pause();
        } catch (e) {}
      }

      // Persiste arquivos de save (SRAM) imediatamente caso o SO purgue o processo por memoria
      if (emu.gameManager && typeof emu.gameManager.saveSaveFiles === "function") {
        try {
          emu.gameManager.saveSaveFiles();
        } catch (e) {}
      }
    } else if (state === "visible") {
      // Retorno ao primeiro plano
      this.resumeAll(emu);
    }
  }

  /**
   * Chamado em eventos de foco/exibicao (pageshow, focus).
   * @param {string} eventName
   */
  handleForegroundEvent(eventName) {
    const emu = this.getEmulator();
    if (!emu) return;
    this.resumeAll(emu);
  }

  /**
   * Destravamento por interacao direta (executado dentro de contexto de gesto do usuario).
   * No iOS WebKit, AudioContext.resume() exige confianca de gesto do usuario e e rejeitado em visibilitychange.
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
