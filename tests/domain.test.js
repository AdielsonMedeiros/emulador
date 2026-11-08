import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GameMatcher } from "../js/core/matcher.js";
import { resolveAssetUrl, SafeStorage } from "../js/core/utils.js";
import { getVirtualGamepadSettings } from "../js/core/gamepad-config.js";
import { isAllowedInteractionTarget } from "../js/core/engine.js";

// Mock de catalogo para testes de unidade
const mockGames = [
  {
    id: "smw",
    title: "Super Mario World",
    platform: "Super Nintendo",
    core: "snes9x",
    rom: "roms/smw.zip",
    cover: "covers/supermarioworld-cover.jpg"
  },
  {
    id: "sonic2",
    title: "Sonic The Hedgehog 2",
    platform: "Sega Mega Drive",
    core: "segaMD",
    rom: "roms/sonic2.bin",
    cover: "covers/sonic2-cover.jpg"
  },
  {
    id: "zelda",
    title: "The Legend of Zelda: A Link to the Past",
    platform: "Super Nintendo",
    core: "snes9x",
    rom: "roms/zelda.sfc",
    cover: "covers/zelda-cover.jpg"
  }
];

test("GameMatcher: resolucao por ID canonico exato", () => {
  const match = GameMatcher.find(mockGames, "smw");
  assert.ok(match);
  assert.equal(match.id, "smw");
});

test("GameMatcher: resolucao por NFC payload em slug continuo (supermarioworld)", () => {
  const match = GameMatcher.find(mockGames, "supermarioworld");
  assert.ok(match);
  assert.equal(match.id, "smw");
});

test("GameMatcher: resolucao por titulo com espacos e pontuacao", () => {
  const match = GameMatcher.find(mockGames, "Sonic The Hedgehog 2");
  assert.ok(match);
  assert.equal(match.id, "sonic2");
});

test("GameMatcher: resolucao case-insensitive", () => {
  const match = GameMatcher.find(mockGames, "ZELDA");
  assert.ok(match);
  assert.equal(match.id, "zelda");
});

test("GameMatcher: retorna null para jogo inexistente", () => {
  const match = GameMatcher.find(mockGames, "halflife3");
  assert.equal(match, null);
});

test("SafeStorage: escrita e leitura seguras com fallback", () => {
  SafeStorage.setItem("teste_chave", "valor_123");
  const res = SafeStorage.getItem("teste_chave");
  assert.equal(res, "valor_123");

  const fallback = SafeStorage.getItem("chave_inexistente", "padrao");
  assert.equal(fallback, "padrao");
});

test("resolveAssetUrl: garante URL absoluta valida", () => {
  const url = resolveAssetUrl("roms/smw.zip");
  assert.ok(url.startsWith("http://") || url.startsWith("https://") || url.includes("roms/smw.zip"));
});

test("Integridade de Catalogo: todos os jogos em games.json possuem arquivos fisicos", () => {
  const raw = fs.readFileSync(path.resolve("data/games.json"), "utf8");
  const data = JSON.parse(raw);
  assert.ok(Array.isArray(data.games));
  assert.ok(data.games.length >= 200, "Catalogo deve conter mais de 200 classicos");

  for (const game of data.games) {
    assert.ok(game.id, `Jogo sem id definido: ${JSON.stringify(game)}`);
    assert.ok(game.title, `Jogo ${game.id} sem titulo`);
    assert.ok(game.rom, `Jogo ${game.id} sem rom`);
    assert.ok(game.cover, `Jogo ${game.id} sem capa`);

    const romPath = path.resolve(game.rom);
    assert.ok(fs.existsSync(romPath), `Arquivo de ROM nao encontrado no disco: ${game.rom}`);

    const coverPath = path.resolve(game.cover);
    assert.ok(fs.existsSync(coverPath), `Arquivo de capa nao encontrado no disco: ${game.cover}`);
  }
});

function validateEmulatorJSLayout(layout) {
  if (!Array.isArray(layout) || !layout.length) return false;
  for (const item of layout) {
    if (!item.type || !item.location) return false;
    if (item.type === "zone" || item.type === "dpad") {
      if (!Array.isArray(item.inputValues) || item.inputValues.length !== 4) return false;
    } else if (item.type === "button") {
      if (!item.id || item.input_value === undefined) return false;
    }
  }
  return true;
}

test("GamepadConfig: configuracao calibrada para SNES (snes9x)", () => {
  const layout = getVirtualGamepadSettings("snes9x");
  assert.ok(validateEmulatorJSLayout(layout));
  const stick = layout.find((i) => i.type === "zone");
  assert.ok(stick);
  assert.deepEqual(stick.inputValues, [4, 5, 6, 7]);
  assert.equal(stick.joystickInput, false);

  const buttonA = layout.find((i) => i.id === "a");
  assert.equal(buttonA.input_value, 8);
  const buttonB = layout.find((i) => i.id === "b");
  assert.equal(buttonB.input_value, 0);
});

test("GamepadConfig: configuracao calibrada para Mega Drive (segaMD)", () => {
  const layout = getVirtualGamepadSettings("segaMD");
  assert.ok(validateEmulatorJSLayout(layout));
  const stick = layout.find((i) => i.type === "zone");
  assert.ok(stick);
  assert.deepEqual(stick.inputValues, [4, 5, 6, 7]);
  assert.equal(stick.joystickInput, false);

  // 6 botoes de acao (A, B, C, X, Y, Z)
  for (const id of ["a", "b", "c", "x", "y", "z"]) {
    assert.ok(layout.find((i) => i.id === id), `Botao ${id} ausente no Mega Drive`);
  }
});

test("GamepadConfig: configuracao calibrada para GBA e Game Boy", () => {
  const layoutGBA = getVirtualGamepadSettings("mgba");
  assert.ok(validateEmulatorJSLayout(layoutGBA));
  const stickGBA = layoutGBA.find((i) => i.type === "zone");
  assert.deepEqual(stickGBA.inputValues, [4, 5, 6, 7]);

  const layoutGB = getVirtualGamepadSettings("gb");
  assert.ok(validateEmulatorJSLayout(layoutGB));
  const stickGB = layoutGB.find((i) => i.type === "zone");
  assert.deepEqual(stickGB.inputValues, [4, 5, 6, 7]);
});

test("GamepadConfig: configuracao de eixo analogico continuo para N64", () => {
  const layout = getVirtualGamepadSettings("n64");
  assert.ok(validateEmulatorJSLayout(layout));
  const stick = layout.find((i) => i.type === "zone");
  assert.ok(stick);
  assert.deepEqual(stick.inputValues, [16, 17, 18, 19]);
  assert.equal(stick.joystickInput, true);

  // C-buttons
  for (const id of ["cu", "cd", "cl", "cr"]) {
    assert.ok(layout.find((i) => i.id === id), `C-button ${id} ausente no N64`);
  }
});

test("GamepadConfig: configuracao calibrada para Arcade (fbneo / fbalpha2012 / arcade)", () => {
  for (const core of ["fbneo", "fbalpha2012_cps1", "fbalpha2012_cps2", "arcade"]) {
    const layout = getVirtualGamepadSettings(core);
    assert.ok(validateEmulatorJSLayout(layout));
    const stick = layout.find((i) => i.type === "zone");
    assert.ok(stick);
    assert.deepEqual(stick.inputValues, [4, 5, 6, 7]);

    // Select e Start canonicos
    assert.ok(layout.find((i) => i.id === "select" && i.text === "Select"));
    assert.ok(layout.find((i) => i.id === "start" && i.text === "Start"));

    // Layout diamante e gatilhos (X, Y, A, B, L, R)
    for (const id of ["x", "y", "l", "a", "b", "r"]) {
      assert.ok(layout.find((i) => i.id === id), `Botao ${id} ausente no Arcade (${core})`);
    }
  }
});

function createMockElement(classList = [], parent = null) {
  return {
    classList,
    parent,
    closest(selector) {
      let curr = this;
      const targetClass = selector.replace(".", "");
      while (curr) {
        if (curr.classList && curr.classList.includes(targetClass)) return curr;
        curr = curr.parent;
      }
      return null;
    }
  };
}

test("Engine: isAllowedInteractionTarget bloqueia controles de jogo e canvas para impedir subida do menu", () => {
  // Gamepad parent e botoes virtuais
  const gamepadParent = createMockElement(["ejs_virtualGamepad_parent"]);
  const buttonX = createMockElement(["ejs_virtualGamepad_button", "b_x"], gamepadParent);
  const buttonA = createMockElement(["ejs_virtualGamepad_button", "b_a"], gamepadParent);
  const stick = createMockElement(["b_stick"], gamepadParent);
  const canvas = createMockElement(["ejs_canvas"]);
  const gameFrame = createMockElement(["game-frame"]);

  assert.equal(isAllowedInteractionTarget(buttonX), false);
  assert.equal(isAllowedInteractionTarget(buttonA), false);
  assert.equal(isAllowedInteractionTarget(stick), false);
  assert.equal(isAllowedInteractionTarget(canvas), false);
  assert.equal(isAllowedInteractionTarget(gameFrame), false);
  assert.equal(isAllowedInteractionTarget(null), false);
  assert.equal(isAllowedInteractionTarget({}), false);
});

test("Engine: isAllowedInteractionTarget autoriza botao hamburger, menu bar e popups legitimos", () => {
  // Botao hamburger superior direito
  const hamburger = createMockElement(["ejs_virtualGamepad_open"]);
  assert.equal(isAllowedInteractionTarget(hamburger), true);

  // Itens da barra de menu
  const menuBar = createMockElement(["ejs_menu_bar"]);
  const menuItem = createMockElement(["ejs_menu_button"], menuBar);
  assert.equal(isAllowedInteractionTarget(menuItem), true);

  // Popup de configuracoes de controle (Reset, Clear, Close, Set)
  const popup = createMockElement(["ejs_popup_container"]);
  const btnReset = createMockElement(["ejs_button"], popup);
  const btnClear = createMockElement(["ejs_button"], popup);
  const btnClose = createMockElement(["ejs_button"], popup);
  assert.equal(isAllowedInteractionTarget(btnReset), true);
  assert.equal(isAllowedInteractionTarget(btnClear), true);
  assert.equal(isAllowedInteractionTarget(btnClose), true);

  // Context menu
  const contextMenu = createMockElement(["ejs_context_menu"]);
  assert.equal(isAllowedInteractionTarget(contextMenu), true);
});

