/**
 * @fileoverview AutoFireController (Turbo / Rapid Fire)
 * Implementa disparo rapido inteligente via Hold-to-Turbo sem necessidade de botoes extras na tela.
 * Isola estritamente botoes de pulo (B), direcionais e sistema para preservar a precisao tatica.
 */

export class AutoFireController {
  /**
   * @param {Object} [options]
   * @param {Function} [options.simulateInputFn] Funcao delegada para enviar inputs ao emulador (player, inputValue, state)
   * @param {number} [options.delayMs=220] Tempo segurando o botao antes de ativar a cadencia turbo
   * @param {number} [options.intervalMs=65] Cadencia de alternancia dos pulsos (liga/desliga)
   * @param {string[]} [options.eligibleButtons] IDs dos botoes autorizados a ter turbo
   */
  constructor(options = {}) {
    this.simulateInput = typeof options.simulateInputFn === "function" ? options.simulateInputFn : () => {};
    this.delayMs = Number(options.delayMs) || 220;
    this.intervalMs = Number(options.intervalMs) || 65;

    // Botoes de acao/ataque autorizados para turbo (Y, X, A, B, C, Z)
    // Direcionais (stick/dpad) e Sistema (Start/Select/L/R) permanecem continuos.
    const defaultEligible = ["y", "x", "a", "b", "c", "z"];
    this.eligibleButtons = new Set(
      Array.isArray(options.eligibleButtons) && options.eligibleButtons.length > 0
        ? options.eligibleButtons.map((b) => String(b).toLowerCase())
        : defaultEligible
    );

    /** @type {Map<string, { delayTimer: any, pulseInterval: any, isPulsing: boolean, inputValue: number, player: number }>} */
    this.activeTracks = new Map();
  }

  /**
   * Verifica se o botao esta autorizado a entrar em modo auto fire.
   * @param {string} buttonId
   * @returns {boolean}
   */
  isEligible(buttonId) {
    if (!buttonId || typeof buttonId !== "string") return false;
    return this.eligibleButtons.has(buttonId.toLowerCase());
  }

  /**
   * Disparado no touchstart do botao virtual.
   * @param {string} buttonId
   * @param {number} inputValue
   * @param {number} [player=0]
   */
  startPress(buttonId, inputValue, player = 0) {
    const id = String(buttonId || "").toLowerCase();
    const existing = this.activeTracks.get(id);
    if (existing) {
      if (existing.delayTimer) clearTimeout(existing.delayTimer);
      if (existing.pulseInterval) clearInterval(existing.pulseInterval);
      this.activeTracks.delete(id);
    }

    // Envia o primeiro sinal imediatamente (responsividade instantanea para toques rapidos)
    this.simulateInput(player, inputValue, 1);

    if (!this.isEligible(id)) {
      return;
    }

    const track = {
      delayTimer: null,
      pulseInterval: null,
      isPulsing: false,
      inputValue,
      player
    };

    track.delayTimer = setTimeout(() => {
      track.isPulsing = true;
      let currentState = 1;

      track.pulseInterval = setInterval(() => {
        currentState = currentState === 1 ? 0 : 1;
        this.simulateInput(player, inputValue, currentState);
      }, this.intervalMs);
    }, this.delayMs);

    this.activeTracks.set(id, track);
  }

  /**
   * Disparado no touchend/touchcancel do botao virtual.
   * @param {string} buttonId
   * @param {number} inputValue
   * @param {number} [player=0]
   */
  releasePress(buttonId, inputValue, player = 0) {
    const id = String(buttonId || "").toLowerCase();
    const track = this.activeTracks.get(id);

    if (track) {
      if (track.delayTimer) clearTimeout(track.delayTimer);
      if (track.pulseInterval) clearInterval(track.pulseInterval);
      this.activeTracks.delete(id);
    }

    // Garante que o input retorne ao estado solto (0)
    this.simulateInput(player, inputValue, 0);
  }

  /**
   * Indica se o turbo esta ativamente pulsando para um botao.
   * @param {string} buttonId
   * @returns {boolean}
   */
  isTurboActive(buttonId) {
    const id = String(buttonId || "").toLowerCase();
    const track = this.activeTracks.get(id);
    return Boolean(track && track.isPulsing);
  }

  /**
   * Cancela todos os timers e intervalos ativos de forma limpa.
   */
  cancelAll() {
    for (const [id, track] of this.activeTracks.entries()) {
      if (track.delayTimer) clearTimeout(track.delayTimer);
      if (track.pulseInterval) clearInterval(track.pulseInterval);
      this.simulateInput(track.player, track.inputValue, 0);
    }
    this.activeTracks.clear();
  }
}

/**
 * Extrai o identificador canonico do botao a partir de um elemento HTML do gamepad virtual.
 * Exemplo: classList contendo "b_y" -> "y"
 * Elementos direcionais como "b_stick" sao explicitamente ignorados.
 * @param {HTMLElement|Object} element
 * @returns {string|null}
 */
export function extractButtonId(element) {
  if (!element || !element.classList) return null;
  const classes = Array.isArray(element.classList)
    ? element.classList
    : Array.from(element.classList || []);
  for (const c of classes) {
    if (typeof c === "string" && c.startsWith("b_") && c !== "b_stick" && c !== "b_dpad") {
      return c.slice(2).toLowerCase();
    }
  }
  return null;
}

