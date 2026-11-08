# NFC Touch Retro Web Player

Sistema de emulação web mobile-first ativado por aproximação NFC (Touch-to-Play), compatível com GitHub Pages.

---

## 🏗️ Arquitetura do Sistema

```
[ Cartucho com Chip NFC ]
           │ (Aproximação física no iPhone / Android)
           ▼
[ Leitura NDEF URI ] ──> https://<usuario>.github.io/<repo>/?game=smw
           │
           ▼
[ WebApp SPA (index.html) ]
     ├── Lê parâmetro URL (?game=id)
     ├── Busca metadados em data/games.json
     └── Exibe Card com Capa e Botão de Ação
           │ (Toque do Usuário - Requisito Web Audio / Fullscreen)
           ▼
[ EmulatorJS Engine (Wasm / Canvas) ]
     ├── Descompacta ROM (.zip) sob demanda
     ├── Injeta controles Touch Virtuais na tela
     └── Executa em 60 FPS com persistência de saves (IndexedDB)
```

---

## 🏷️ Gravação da Tag NFC (NTAG213 / NTAG215 / NTAG216)

1. Instale o app gratuito **NFC Tools** no seu smartphone (Android ou iOS).
2. Vá em **Escrever (Write)** -> **Adicionar Registro (Add a record)**.
3. Escolha **URL / Link da Web**.
4. Insira a URL direta do jogo:
   ```text
   https://<seu-usuario>.github.io/<seu-repositorio>/?game=smw
   ```
5. Aproxime o smartphone da tag NFC ou adesivo embutido no cartucho e confirme a gravação.

---

## 🕹️ Adicionando Novos Jogos (`data/games.json`)

Edite o arquivo `data/games.json` para registrar os jogos:

```json
{
  "id": "smw",
  "title": "Super Mario World",
  "platform": "Super Nintendo",
  "core": "snes9x",
  "year": 1990,
  "publisher": "Nintendo",
  "players": "1-2 Jogadores",
  "genre": "Plataforma",
  "description": "Descrição do jogo aqui...",
  "rom": "roms/smw.zip",
  "cover": "covers/smw.jpg",
  "color": "#e74c3c"
}
```

### Cores (`core`) Suportados:
- `snes9x`: Super Nintendo (SNES)
- `fceumm`: Nintendo Entertainment System (NES)
- `mgba`: Game Boy Advance (GBA)
- `genesis_plus_gx`: Sega Genesis / Mega Drive / Master System
- `gambatte`: Game Boy / Game Boy Color



