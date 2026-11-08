import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROMS_DIR = path.resolve("roms");
const TEMP_DIR = path.resolve(".tmp-merge-arcade");

/**
 * Utilitario de automacao para converter ROMs Split em Non-Merged
 * Mescla arquivos de BIOS (ex: neogeo.zip) diretamente no zip do jogo Arcade.
 *
 * Uso: node scripts/merge-arcade.mjs <rom_do_jogo.zip> [bios.zip]
 * Exemplo: node scripts/merge-arcade.mjs mslug.zip neogeo.zip
 */
function mergeArcadeRom() {
  const args = process.argv.slice(2);
  const gameFile = args[0] || "mslug.zip";
  const biosFile = args[1] || "neogeo.zip";

  const gamePath = path.join(ROMS_DIR, gameFile);
  const biosPath = path.join(ROMS_DIR, biosFile);

  if (!fs.existsSync(gamePath)) {
    console.error(`[ERRO] Arquivo do jogo nao encontrado: ${gamePath}`);
    console.log(`Baixe o jogo no navegador e salve em 'roms/${gameFile}'.`);
    process.exit(1);
  }

  if (!fs.existsSync(biosPath)) {
    console.error(`[ERRO] Arquivo da BIOS nao encontrado: ${biosPath}`);
    console.log(`Baixe a BIOS correspondente (ex: 'neogeo.zip') e salve em 'roms/${biosFile}'.`);
    process.exit(1);
  }

  console.log(`[INFO] Mesclando ${biosFile} dentro de ${gameFile}...`);

  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  try {
    // 1. Extrai a ROM do jogo na pasta temporaria
    execFileSync("tar", ["-xf", gamePath, "-C", TEMP_DIR]);

    // 2. Extrai a BIOS moderna sobre a pasta temporaria (garante que os arquivos da BIOS atualizados sobrescrevam os legados)
    execFileSync("tar", ["-xf", biosPath, "-C", TEMP_DIR]);

    // Remove arquivos de propaganda ou extensoes obsoletas
    const filesToPurge = ["downloaded.from.WWW.ROMNATION.NET.html", "sfix.sfx"];
    for (const f of filesToPurge) {
      const p = path.join(TEMP_DIR, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    // 3. Compacta tudo de volta no arquivo de destino como Non-Merged Set sem prefixo './'
    const backupPath = gamePath + ".bak";
    fs.copyFileSync(gamePath, backupPath);

    // Remove arquivo original para re-compactar
    fs.unlinkSync(gamePath);

    // Passa lista de arquivos relativos sem prefixo './'
    const entries = fs.readdirSync(TEMP_DIR);
    execFileSync("tar", ["-a", "-cf", gamePath, ...entries], { cwd: TEMP_DIR });

    // Limpa backup e temporarios
    fs.unlinkSync(backupPath);
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

    console.log(`[SUCESSO] ROM Non-Merged gerada em: ${gamePath}`);
    console.log(`O arquivo agora contem o jogo + BIOS integrados, pronto para execucao pelo EmulatorJS.`);
  } catch (err) {
    console.error("[FALHA] Erro durante a mesclagem:", err.message);
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    process.exit(1);
  }
}

mergeArcadeRom();

