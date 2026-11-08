import test from "node:test";
import assert from "node:assert/strict";
import { LifecycleController } from "../js/core/lifecycle.js";
import { EmulatorEngine } from "../js/core/engine.js";

function createMockEmulator() {
  return {
    paused: false,
    playCalled: 0,
    pauseCalled: 0,
    toggleCalled: [],
    resumeMainLoopCalled: 0,
    play() {
      this.paused = false;
      this.playCalled++;
    },
    pause() {
      this.paused = true;
      this.pauseCalled++;
    },
    gameManager: {
      toggleMainLoop(val) {
        this.parent.toggleCalled.push(val);
      }
    },
    Module: {
      resumeMainLoop() {
        this.parent.resumeMainLoopCalled++;
      }
    }
  };
}

test("LifecycleController: pausa emulador quando aba fica oculta (hidden)", () => {
  const emu = createMockEmulator();
  emu.gameManager.parent = emu;
  emu.Module.parent = emu;

  let resumedAudioCount = 0;
  const ctrl = new LifecycleController({
    getEmulator: () => emu,
    resumeAudioFn: () => resumedAudioCount++
  });

  ctrl.handleVisibilityChange("hidden");

  assert.equal(emu.pauseCalled, 1, "Deve chamar pause() ao ocultar");
  assert.deepEqual(emu.toggleCalled, [0], "Deve pausar o main loop no gameManager");
  assert.equal(resumedAudioCount, 0, "Nao deve retomar audio em hidden");
});

test("LifecycleController: retoma audio e main loop quando aba fica visivel (visible)", () => {
  const emu = createMockEmulator();
  emu.paused = true;
  emu.gameManager.parent = emu;
  emu.Module.parent = emu;

  let resumedAudioCount = 0;
  const ctrl = new LifecycleController({
    getEmulator: () => emu,
    resumeAudioFn: () => resumedAudioCount++
  });

  ctrl.handleVisibilityChange("visible");

  assert.equal(resumedAudioCount, 1, "Deve invocar retomada de audio");
  assert.equal(emu.playCalled, 1, "Deve chamar play() ao retornar");
  assert.deepEqual(emu.toggleCalled, [1], "Deve ativar main loop com flag 1");
  assert.equal(emu.resumeMainLoopCalled, 1, "Deve invocar resumeMainLoop no Module");
});

test("LifecycleController: eventos pageshow e focus restauram execucao", () => {
  const emu = createMockEmulator();
  emu.paused = true;
  emu.gameManager.parent = emu;
  emu.Module.parent = emu;

  let resumedAudioCount = 0;
  const ctrl = new LifecycleController({
    getEmulator: () => emu,
    resumeAudioFn: () => resumedAudioCount++
  });

  ctrl.handleForegroundEvent("pageshow");
  assert.equal(resumedAudioCount, 1);
  assert.equal(emu.playCalled, 1);

  ctrl.handleForegroundEvent("focus");
  assert.equal(resumedAudioCount, 2);
  assert.equal(emu.playCalled, 2);
});

test("LifecycleController: toque na tela (handleInteraction) destrava se emulador estiver pausado", () => {
  const emu = createMockEmulator();
  emu.paused = true;
  emu.gameManager.parent = emu;
  emu.Module.parent = emu;

  let resumedAudioCount = 0;
  const ctrl = new LifecycleController({
    getEmulator: () => emu,
    resumeAudioFn: () => resumedAudioCount++
  });

  ctrl.handleInteraction();
  assert.equal(resumedAudioCount, 1);
  assert.equal(emu.playCalled, 1);
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
  emu.gameManager.parent = emu;
  emu.Module.parent = emu;

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
