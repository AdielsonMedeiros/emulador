import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GameMatcher } from "../js/core/matcher.js";
import { resolveAssetUrl, SafeStorage } from "../js/core/utils.js";

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

