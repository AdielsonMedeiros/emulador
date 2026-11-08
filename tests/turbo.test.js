import test from "node:test";
import assert from "node:assert/strict";
import { AutoFireController, extractButtonId } from "../js/core/turbo.js";
import { EmulatorEngine } from "../js/core/engine.js";

test("AutoFireController: botoes elegiveis e inelegiveis", () => {
  const af = new AutoFireController();

  // Ataque elegivel
  assert.equal(af.isEligible("y"), true, "Botao Y deve ser elegivel para turbo");
  assert.equal(af.isEligible("x"), true, "Botao X deve ser elegivel para turbo");
  assert.equal(af.isEligible("a"), true, "Botao A deve ser elegivel para turbo");

  // Pulo NUNCA elegivel
  assert.equal(af.isEligible("b"), false, "Botao B (pulo) NAO pode ter turbo");

  // Sistema e direcional NUNCA elegiveis
  assert.equal(af.isEligible("start"), false, "Start nao pode ter turbo");
  assert.equal(af.isEligible("select"), false, "Select nao pode ter turbo");
  assert.equal(af.isEligible("l"), false, "L nao pode ter turbo");
  assert.equal(af.isEligible("r"), false, "R nao pode ter turbo");
  assert.equal(af.isEligible("stick"), false, "Direcional nao pode ter turbo");
  assert.equal(af.isEligible("up"), false, "Direcional up nao pode ter turbo");
  assert.equal(af.isEligible("down"), false, "Direcional down nao pode ter turbo");
});

test("AutoFireController: toque rapido (< delay) nao ativa turbo", async () => {
  const inputs = [];
  const af = new AutoFireController({
    simulateInputFn: (p, val, state) => inputs.push({ p, val, state }),
    delayMs: 100,
    intervalMs: 30
  });

  af.startPress("y", 1);
  assert.equal(inputs.length, 1);
  assert.deepEqual(inputs[0], { p: 0, val: 1, state: 1 });

  // Solta antes do delay (apenas 40ms)
  await new Promise((r) => setTimeout(r, 40));
  af.releasePress("y", 1);

  // Aguarda passar o delay para confirmar que o turbo NAO disparou
  await new Promise((r) => setTimeout(r, 120));

  assert.equal(inputs.length, 2);
  assert.deepEqual(inputs[1], { p: 0, val: 1, state: 0 });
  assert.equal(af.isTurboActive("y"), false);
});

test("AutoFireController: segurar botao elegivel (> delay) ativa cadencia turbo", async () => {
  const inputs = [];
  const af = new AutoFireController({
    simulateInputFn: (p, val, state) => inputs.push({ p, val, state }),
    delayMs: 60,
    intervalMs: 25
  });

  af.startPress("y", 1);
  assert.equal(inputs.length, 1);
  assert.deepEqual(inputs[0], { p: 0, val: 1, state: 1 });

  // Espera ultrapassar o delay e executar ciclos de turbo
  await new Promise((r) => setTimeout(r, 220));

  assert.equal(af.isTurboActive("y"), true);
  // Deve conter alternancia de 0 e 1
  assert.ok(inputs.length >= 4, `Esperava pelo menos 4 pulsos, obteve ${inputs.length}`);
  const states = inputs.map((i) => i.state);
  assert.ok(states.includes(0) && states.includes(1), "Pulsos devem alternar entre 0 e 1");

  // Soltura deve encerrar o turbo e garantir estado 0
  af.releasePress("y", 1);
  assert.equal(af.isTurboActive("y"), false);
  const last = inputs[inputs.length - 1];
  assert.equal(last.state, 0, "Ultimo estado apos soltura deve ser sempre 0");
});

test("AutoFireController: segurar botao inelegivel (B - pulo) permanece continuo sem turbo", async () => {
  const inputs = [];
  const af = new AutoFireController({
    simulateInputFn: (p, val, state) => inputs.push({ p, val, state }),
    delayMs: 50,
    intervalMs: 20
  });

  af.startPress("b", 0);
  assert.equal(inputs.length, 1);
  assert.deepEqual(inputs[0], { p: 0, val: 0, state: 1 });

  // Espera tempo suficiente
  await new Promise((r) => setTimeout(r, 120));

  // Nao deve haver pulsos extras
  assert.equal(inputs.length, 1);
  assert.equal(af.isTurboActive("b"), false);

  af.releasePress("b", 0);
  assert.equal(inputs.length, 2);
  assert.deepEqual(inputs[1], { p: 0, val: 0, state: 0 });
});

test("AutoFireController: cancelAll limpa todos os timers e desliga inputs ativos", async () => {
  const inputs = [];
  const af = new AutoFireController({
    simulateInputFn: (p, val, state) => inputs.push({ p, val, state }),
    delayMs: 40,
    intervalMs: 20
  });

  af.startPress("y", 1);
  af.startPress("x", 9);
  await new Promise((r) => setTimeout(r, 80));

  assert.equal(af.isTurboActive("y"), true);
  assert.equal(af.isTurboActive("x"), true);

  af.cancelAll();

  assert.equal(af.isTurboActive("y"), false);
  assert.equal(af.isTurboActive("x"), false);

  const prevLen = inputs.length;
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(inputs.length, prevLen, "Nenhum pulso deve ocorrer apos cancelAll");
});

test("extractButtonId: extrai id correto de botao e descarta direcionais", () => {
  assert.equal(extractButtonId({ classList: ["ejs_virtualGamepad_button", "b_y"] }), "y");
  assert.equal(extractButtonId({ classList: ["ejs_virtualGamepad_button", "b_x"] }), "x");
  assert.equal(extractButtonId({ classList: ["ejs_virtualGamepad_button", "b_a"] }), "a");
  assert.equal(extractButtonId({ classList: ["ejs_virtualGamepad_button", "b_b"] }), "b");
  assert.equal(extractButtonId({ classList: ["ejs_virtualGamepad_button", "b_c"] }), "c");
  assert.equal(extractButtonId({ classList: ["ejs_virtualGamepad_button", "b_z"] }), "z");

  // Direcionais e stick devem retornar null
  assert.equal(extractButtonId({ classList: ["b_stick"] }), null);
  assert.equal(extractButtonId({ classList: ["ejs_dpad_main", "b_dpad"] }), null);
  assert.equal(extractButtonId({ classList: ["other_class"] }), null);
  assert.equal(extractButtonId(null), null);
  assert.equal(extractButtonId({}), null);
});

test("EmulatorEngine: touchstart e touchend em botao de tiro aciona AutoFireController", async () => {
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

  const simulatedInputs = [];
  globalThis.window = {
    EJS_emulator: {
      gameManager: {
        simulateInput: (p, val, state) => simulatedInputs.push({ p, val, state })
      }
    }
  };

  const engine = new EmulatorEngine(mockViewport, mockTarget);
  // Simula mapeamento de core Arcade
  engine.buttonInputMap = new Map([
    ["y", 1],
    ["b", 0]
  ]);

  // Simula touchstart no botao Y (ataque/tiro)
  const mockBtnY = {
    classList: ["ejs_virtualGamepad_button", "b_y"],
    closest: (selector) => (selector === ".ejs_virtualGamepad_button" ? mockBtnY : null)
  };

  listeners["touchstart"]({
    target: mockBtnY,
    changedTouches: [{ target: mockBtnY }]
  });

  assert.equal(simulatedInputs.length, 1);
  assert.deepEqual(simulatedInputs[0], { p: 0, val: 1, state: 1 });

  // Simula touchend
  listeners["touchend"]({
    target: mockBtnY,
    changedTouches: [{ target: mockBtnY }]
  });

  assert.equal(simulatedInputs.length, 2);
  assert.deepEqual(simulatedInputs[1], { p: 0, val: 1, state: 0 });

  // Simula botao de pulo B (inelegivel) - deve enviar apenas press e release sem turbo
  simulatedInputs.length = 0;
  const mockBtnB = {
    classList: ["ejs_virtualGamepad_button", "b_b"],
    closest: (selector) => (selector === ".ejs_virtualGamepad_button" ? mockBtnB : null)
  };

  listeners["touchstart"]({
    target: mockBtnB,
    changedTouches: [{ target: mockBtnB }]
  });
  assert.equal(simulatedInputs.length, 1);
  assert.deepEqual(simulatedInputs[0], { p: 0, val: 0, state: 1 });

  await new Promise((r) => setTimeout(r, 80));
  assert.equal(simulatedInputs.length, 1, "Pulo nao deve gerar pulsos adicionais");

  listeners["touchend"]({
    target: mockBtnB,
    changedTouches: [{ target: mockBtnB }]
  });
  assert.equal(simulatedInputs.length, 2);
  assert.deepEqual(simulatedInputs[1], { p: 0, val: 0, state: 0 });

  // Cleanup
  engine.stop();
  delete globalThis.window;
});

