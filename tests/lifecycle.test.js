import test from "node:test";
import assert from "node:assert/strict";
import { LifecycleController } from "../js/core/lifecycle.js";
import { EmulatorEngine } from "../js/core/engine.js";

function createMockEmulator() {
  const dummyState = new Uint8Array([1, 2, 3, 4]);
  return {
    paused: false,
    playCalled: 0,
    pauseCalled: 0,
    handleResizeCalled: 0,
    play() {
      this.paused = false;
      this.playCalled++;
    },
    pause() {
      this.paused = true;
      this.pauseCalled++;
    },
    handleResize() {
      this.handleResizeCalled++;
    },
    gameManager: {
      saveFilesCalled: 0,
      getStateCalled: 0,
      loadStateHistory: [],
      getState() {
        this.getStateCalled++;
        return dummyState;
      },
      saveSaveFiles() {
        this.saveFilesCalled++;
      },
      loadState(st) {
        this.loadStateHistory.push(st);
      }
    }
  };
}

test("LifecycleController: pausa emulador quando aba fica oculta (hidden)", () => {
  const emu = createMockEmulator();

  let resumedAudioCount = 0;
  const ctrl = new LifecycleController({
    getEmulator: () => emu,
    resumeAudioFn: () => resumedAudioCount++
  });

  ctrl.handleVisibilityChange("hidden");

  assert.equal(emu.pauseCalled, 1, "Deve chamar pause() ao ocultar");
  assert.equal(resumedAudioCount, 0, "Nao deve retomar audio em hidden");
});

test("LifecycleController: captura snapshot de RAM e persiste saves no estado hidden", () => {
  const emu = createMockEmulator();

  const ctrl = new LifecycleController({
    getEmulator: () => emu
  });

  ctrl.handleVisibilityChange("hidden");

  assert.equal(emu.gameManager.getStateCalled, 1, "Deve chamar getState() para snapshot");
  assert.equal(emu.gameManager.saveFilesCalled, 1, "Deve persistir saves nativos");
  assert.ok(ctrl.savedStateBuffer instanceof Uint8Array);
  assert.equal(ctrl.savedStateBuffer.length, 4);
});

test("LifecycleController: retoma audio e execucao quando aba fica visivel (visible) sem perda de contexto", () => {
  const emu = createMockEmulator();
  emu.paused = true;

  let resumedAudioCount = 0;
  const ctrl = new LifecycleController({
    getEmulator: () => emu,
    resumeAudioFn: () => resumedAudioCount++
  });

  // Simula troca rapida (menos de 15 segundos)
  ctrl.hiddenTimestamp = Date.now() - 2000;
  ctrl.handleVisibilityChange("visible");

  assert.equal(resumedAudioCount, 1, "Deve invocar retomada de audio");
  assert.equal(emu.playCalled, 1, "Deve chamar play() ao retornar");
  assert.equal(emu.handleResizeCalled, 1, "Deve chamar handleResize()");
});

test("LifecycleController: dispara onRequestRestore se isContextLost for true", () => {
  const emu = createMockEmulator();
  let restoreRequestedWith = null;

  const ctrl = new LifecycleController({
    getEmulator: () => emu,
    onRequestRestore: (state) => {
      restoreRequestedWith = state;
    }
  });

  ctrl.savedStateBuffer = new Uint8Array([9, 9, 9]);
  ctrl.isContextLost = true;
  ctrl.hiddenTimestamp = Date.now() - 5000;

  ctrl.handleVisibilityChange("visible");

  assert.ok(restoreRequestedWith);
  assert.deepEqual(Array.from(restoreRequestedWith), [9, 9, 9]);
  assert.equal(ctrl.isContextLost, false, "Deve resetar flag apos disparar restore");
});

test("LifecycleController: dispara onRequestRestore se background for maior que 15 segundos", () => {
  const emu = createMockEmulator();
  let restoreRequestedWith = null;

  const ctrl = new LifecycleController({
    getEmulator: () => emu,
    onRequestRestore: (state) => {
      restoreRequestedWith = state;
    }
  });

  ctrl.savedStateBuffer = new Uint8Array([5, 5, 5]);
  ctrl.isContextLost = false;
  // Simula 2 minutos de WhatsApp (120 segundos)
  ctrl.hiddenTimestamp = Date.now() - 120000;

  ctrl.handleVisibilityChange("visible");

  assert.ok(restoreRequestedWith, "Deve disparar hot-restore para segundo plano prolongado");
  assert.deepEqual(Array.from(restoreRequestedWith), [5, 5, 5]);
});

test("LifecycleController: eventos pageshow e focus restauram execucao", () => {
  const emu = createMockEmulator();
  emu.paused = true;

  let resumedAudioCount = 0;
  const ctrl = new LifecycleController({
    getEmulator: () => emu,
    resumeAudioFn: () => resumedAudioCount++
  });

  ctrl.hiddenTimestamp = Date.now() - 2000;
  ctrl.handleForegroundEvent("pageshow");
  assert.equal(resumedAudioCount, 1);
  assert.equal(emu.playCalled, 1);

  emu.paused = true;
  ctrl.hiddenTimestamp = Date.now() - 2000;
  ctrl.handleForegroundEvent("focus");
  assert.equal(resumedAudioCount, 2);
  assert.equal(emu.playCalled, 2);
});

test("LifecycleController: toque na tela (handleInteraction) destrava audio incondicionalmente e emulador se pausado", () => {
  const emu = createMockEmulator();
  emu.paused = false;

  let resumedAudioCount = 0;
  const ctrl = new LifecycleController({
    getEmulator: () => emu,
    resumeAudioFn: () => resumedAudioCount++
  });

  ctrl.handleInteraction();
  assert.equal(resumedAudioCount, 1, "Deve chamar resumeAudio incondicionalmente no toque");
  assert.equal(emu.playCalled, 0, "Nao precisa chamar play se nao estava pausado");
  assert.equal(emu.handleResizeCalled, 1, "Deve ajustar layout");

  emu.paused = true;
  ctrl.handleInteraction();
  assert.equal(resumedAudioCount, 2);
  assert.equal(emu.playCalled, 1, "Deve chamar play se estava pausado");
});

test("LifecycleController: attach e detach gerenciam listeners do window e document", () => {
  const docListeners = {};
  const winListeners = {};

  const mockDoc = {
    addEventListener: (type, fn) => { docListeners[type] = fn; },
    removeEventListener: (type) => { delete docListeners[type]; },
    visibilityState: "visible"
  };

  const mockWin = {
    addEventListener: (type, fn) => { winListeners[type] = fn; },
    removeEventListener: (type) => { delete winListeners[type]; }
  };

  const emu = createMockEmulator();

  const ctrl = new LifecycleController({
    getEmulator: () => emu,
    resumeAudioFn: () => {}
  });

  ctrl.attach(mockWin, mockDoc);
  assert.ok(docListeners["visibilitychange"]);
  assert.ok(winListeners["pageshow"]);
  assert.ok(winListeners["focus"]);

  ctrl.detach();
  assert.equal(Object.keys(docListeners).length, 0);
  assert.equal(Object.keys(winListeners).length, 0);
});

test("EmulatorEngine: inicializa LifecycleController e aciona handleInteraction no touchstart", () => {
  const listeners = {};
  const mockViewport = {
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
    style: {}
  };
  const mockTarget = {
    innerHTML: "",
    addEventListener: () => {}
  };

  const engine = new EmulatorEngine(mockViewport, mockTarget);
  assert.ok(engine.lifecycle, "LifecycleController deve ser instanciado");
  assert.equal(typeof engine.lifecycle.handleInteraction, "function");
  assert.equal(typeof engine.lifecycle.attach, "function");
  assert.equal(typeof engine.lifecycle.detach, "function");

  let resumed = false;
  engine.lifecycle.handleInteraction = () => {
    resumed = true;
  };

  listeners["touchstart"]({
    changedTouches: []
  });

  assert.equal(resumed, true, "Deve invocar handleInteraction no touchstart do viewport");
});

test("EmulatorEngine: hotRestore reinicializa mantendo viewport e registra pendingRestoreState", () => {
  const mockViewport = {
    addEventListener: () => {},
    style: { display: "block" }
  };
  const mockTarget = {
    innerHTML: "<div>active</div>",
    addEventListener: () => {}
  };

  const engine = new EmulatorEngine(mockViewport, mockTarget);
  engine.currentGame = {
    id: "smw",
    title: "Super Mario World",
    core: "snes9x",
    rom: "roms/smw.zip"
  };

  let launchCalledWith = null;
  engine.launch = (game) => {
    launchCalledWith = game;
  };

  const dummyState = new Uint8Array([42, 42]);
  engine.hotRestore(dummyState);

  assert.equal(mockViewport.style.display, "block", "Viewport deve permanecer aberto");
  assert.equal(mockTarget.innerHTML, "", "Target antigo deve ser limpo");
  assert.deepEqual(engine.pendingRestoreState, dummyState, "State deve estar pendente para aplicacao no boot");
  assert.equal(launchCalledWith.id, "smw", "Deve relancar o jogo ativo");
});
