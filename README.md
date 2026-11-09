# RetroCart - NFC Touch Retro Web Player

Sistema de emulacao web mobile-first ativado por aproximacao fisica NFC (Touch-to-Play), compativel com GitHub Pages. Permite que um toque fisico de cartucho com tag NFC (NTAG213/215/216) inicialize instantaneamente qualquer titulo da biblioteca em 60 FPS no iOS WebKit e Android Chromium.

---

## Arquitetura do Sistema

```text
[ Cartucho com Chip NFC ]
           │ (Aproximacao fisica no iPhone / Android)
           ▼
[ Leitura NDEF URI ] ──> https://<usuario>.github.io/<repo>/?game=smw
           │
           ▼
[ WebApp SPA (index.html) ]
     ├── Router (modules/router.js): le parametro URL (?game=id)
     ├── GameMatcher (core/matcher.js): resolucao de slug continuo / NFC payload
     ├── GameService (services/game-service.js): busca metadados em data/games.json
     └── Exibe Card com Capa e Botao de Acao
           │ (Gesto de Usuario - Requisito Web Audio / Fullscreen)
           ▼
[ EmulatorEngine (core/engine.js) ]
     ├── LifecycleController (core/lifecycle.js): previne freeze ao alternar apps (WhatsApp/background)
     ├── AutoFireController (core/turbo.js): cadencia turbo inteligente em botoes de tiro
     ├── GamepadConfig (core/gamepad-config.js): layouts calibrados por console
     ├── Audio Subsystem (core/audio.js): destravamento deterministico Web Audio / OpenAL
     └── Runtime EmulatorJS (RetroArch Wasm / WebGL)
```

---

## Modulos Principais

- **`js/core/matcher.js`**: Resolucao tolerante a falhas entre payloads NFC, slugs contiguos e titulos do catalogo.
- **`js/core/engine.js`**: Orquestrador do container de emulacao, tela cheia, orientacao horizontal e guardas de eventos touch/mouse.
- **`js/core/lifecycle.js`**: Gestao de visibilidade da pagina (`visibilitychange`, `pageshow`, `focus`) e recuperacao automatica de loops Wasm e contextos de som.
- **`js/core/turbo.js`**: Sistema *hold-to-turbo* com diferenciacao temporal (toque rapido = tiro simples, sustentado = disparo continuo a 11 Hz) exclusivo para botoes de ataque.
- **`js/core/gamepad-config.js`**: Mapeamentos ergonomicos virtuais especificos para cada sistema (Arcade 4/6 botoes, SNES, Mega Drive, GBA, N64).
- **`js/core/audio.js`**: Desbloqueio de AudioContext nativo, OpenAL e SDL2 com configuracao de audioSession no iOS.
- **`js/services/game-service.js`**: Gerenciamento e indexacao do catalogo de jogos.

---

## Cores e Plataformas Suportadas

| Console / Sistema | Core RetroArch | Taxa de Amostragem | Observacoes |
| :--- | :--- | :--- | :--- |
| **Arcade / Neo-Geo** | `fbneo` | 22050 Hz | 16-bit color depth, ROMs Non-Merged com BIOS inclusa |
| **Capcom CPS-1** | `fbalpha2012_cps1` | 22050 Hz | Otimizado para baixa latencia de audio |
| **Capcom CPS-2** | `fbalpha2012_cps2` | 22050 Hz | Mapeamento de 6 botoes arcade |
| **Super Nintendo** | `snes9x` | 44100 Hz | Proporcao de tela 4:3 mantida |
| **Sega Mega Drive**| `segaMD` | 44100 Hz | Mapeamento de 6 botoes nativo |
| **Game Boy Advance**| `mgba` | 44100 Hz | Renderizacao direta calibrada |
| **Game Boy / Color**| `gambatte` | 44100 Hz | Filtro grafico nitido |
| **Nintendo 64** | `n64` | 44100 Hz | Stick analogico continuo 360 graus |

---

## Gravacao da Tag NFC (NTAG213 / NTAG215 / NTAG216)

1. Instale o aplicativo **NFC Tools** no smartphone.
2. Selecione **Escrever (Write)** -> **Adicionar Registro (Add a record)**.
3. Escolha **URL / Link da Web**.
4. Insira a URL direta do jogo:
   ```text
   https://<seu-usuario>.github.io/<seu-repositorio>/?game=metalslugx
   ```
5. Aproxime o smartphone da tag NFC e confirme a gravacao.

---

## Adicionando Novos Jogos (`data/games.json`)

1. Adicione a ROM em `roms/<id>.zip` (para titulos de Arcade, use ROMs do conjunto FBNeo Non-Merged).
2. Adicione a capa em `covers/<id>-cover.jpg`.
3. Registre o titulo em `data/games.json`:

```json
{
  "id": "mslugx",
  "title": "Metal Slug X",
  "platform": "Arcade",
  "core": "fbneo",
  "year": 1999,
  "publisher": "SNK",
  "players": "1-2 Jogadores",
  "genre": "Acao / Tiro",
  "description": "Super Vehicle-001/II: Metal Slug X...",
  "rom": "roms/mslugx.zip",
  "cover": "covers/mslugx-cover.jpg",
  "color": "#e74c3c"
}
```

---

## Testes Automatizados

O projeto utiliza o test runner nativo do Node.js:

```bash
npm test
```

A suite cobre:
- Integridade fisica de 100% das ROMs e capas do catalogo.
- Resolucao de slugs e NFC payload pelo `GameMatcher`.
- Logica e temporizacao de cadencia do `AutoFireController`.
- Comportamento de transicao de estados e destravamento do `LifecycleController`.
