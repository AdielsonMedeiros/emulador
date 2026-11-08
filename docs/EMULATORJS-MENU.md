# Documentacao das Opcoes do Menu (EmulatorJS)

## 1. Localizacao no Codigo

- **Scripts Core:** Baixados via CDN em `https://cdn.emulatorjs.org/stable/data/emulator.min.js`.
- **Integracao:** No arquivo [js/core/engine.js](file:///c:/Users/Adielson%20Medeiros/Desktop/PitangaTech/Emula/js/core/engine.js), dentro de `launch()` e `stop()`.
- **Injecao no DOM:** Montado dinamicamente dentro de `#game-frame` sob a classe CSS `.ejs_menu_bar`.

---

## 2. Analise Detalhada de Cada Opcao

### Coluna Esquerda

1. **Restart (Reiniciar):**
   - **Metodo:** `gameManager.restart()`.
   - **Funcao:** Realiza soft-reset na CPU Wasm, reiniciando a ROM do zero sem recarregar a pagina.

2. **Save State (Salvar Estado):**
   - **Metodo:** `gameManager.getState()`.
   - **Funcao:** Tira snapshot da RAM e VRAM + miniatura da tela e salva na tabela `EmulatorJS-states` do IndexedDB.

3. **Control Settings (Configuracoes de Controles):**
   - **Metodo:** Abre popup `controlMenu`.
   - **Conteudo:** Mapeamento de teclas de teclado e deteccao de controles USB/Bluetooth (Gamepads) com interface grafica do controle original.

4. **Cache Manager (Gerenciador de Cache):**
   - **Metodo:** Abre popup `openCacheMenu()`.
   - **Conteudo:** Relatorio de espaco ocupado no IndexedDB/CacheStorage por cores, BIOS, saves e ROMs, permitindo expurgo manual.

5. **Import Save File (Importar .SAV):**
   - **Metodo:** `selectFile()` -> `FS.writeFile()`.
   - **Conteudo:** Abre seletor de arquivos do sistema para carregar save de bateria nativo (.sav) para o cartucho.

6. **Context Menu (Menu de Contexto):**
   - **Metodo:** `createContextMenu()`.
   - **Conteudo:** Gaveta rapida com atalhos para Tela Cheia, Captura de Tela (Screenshot) e atalhos rapidos.

7. **Exit Emulation (Sair da Emulacao):**
   - **Metodo:** Emite evento `exit` no `window.EJS_emulator`.
   - **Funcao:** Capturado pelo `engine.js` para destruir o player, encerrar o loop Wasm e devolver o usuario ao catalogo.

---

### Coluna Direita

8. **Pause / Play (Pausar / Retomar):**
   - **Metodo:** `togglePlaying()` -> `gameManager.toggleMainLoop(0/1)`.
   - **Funcao:** Congela os ciclos de clock da emulacao e o buffer de audio da Web Audio API.

9. **Load State (Carregar Estado):**
   - **Metodo:** `gameManager.loadState()`.
   - **Conteudo:** Abre galeria visual de snapshots salvos com preview e data para restauracao imediata.

10. **Cheats (Codigos de Trapaca):**
    - **Metodo:** Abre popup `cheatMenu`.
    - **Conteudo:** Gerenciador de codigos Game Genie, GameShark e Action Replay com toggles individuais.

11. **Export Save File (Exportar .SAV):**
    - **Metodo:** `gameManager.getSaveFile()`.
    - **Funcao:** Converte a memoria SRAM virtual em arquivo binario `.sav` e faz o download direto para o dispositivo do usuario.

12. **Volume Slider (Barra de Volume):**
    - **Metodo:** `setVolume(val)`.
    - **Funcao:** Controla o no de ganho da Web Audio API de 0% (mudo) a 100%.

13. **Settings (Configuracoes Gerais):**
    - **Metodo:** Abre popup `settingsMenu`.
    - **Conteudo:** Shaders graficos (CRT, Scanlines, xBRZ), Proporcao de Tela (4:3, 16:9), Fast Forward, Rewind e latencia de audio.

