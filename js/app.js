/**
 * NFC Retro Web Emulator Engine
 * Optimized for Mobile (iOS Safari & Android Chrome)
 */

/**
 * @typedef {Object} Game
 * @property {string} id
 * @property {string} title
 * @property {string} platform
 * @property {string} core
 * @property {number} year
 * @property {string} publisher
 * @property {string} players
 * @property {string} genre
 * @property {string} description
 * @property {string} rom
 * @property {string} cover
 * @property {string} color
 */

class EmulatorApp {
  constructor() {
    this.games = [];
    this.currentGame = null;
    this.selectedPlatform = "ALL";
    this.searchQuery = "";
    this.controlType = localStorage.getItem("retro_control_type") || "dpad";

    this.cardView = document.getElementById("game-card");
    this.catalogView = document.getElementById("catalog-view");
    this.emulatorViewport = document.getElementById("emulator-viewport");
    this.gameTarget = document.getElementById("game-frame");

    this.searchInput = document.getElementById("search-input");
    this.searchClear = document.getElementById("search-clear");
    this.platformChips = document.getElementById("platform-chips");
    this.catalogCount = document.getElementById("catalog-count");
    this.catalogGrid = document.getElementById("catalog-grid");
    this.emptyState = document.getElementById("empty-state");

    this.settingsModal = document.getElementById("settings-modal");
    this.btnOpenSettings = document.getElementById("btn-open-settings");
    this.btnCloseSettings = document.getElementById("btn-close-settings");

    this.init();
  }

  async init() {
    try {
      const response = await fetch(`data/games.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Falha ao carregar games.json: ${response.statusText}`);
      }
      const data = await response.json();
      this.games = data.games || [];

      this.setupSettingsModal();
      this.setupFilters();
      this.handleRoute();
      window.addEventListener("hashchange", () => this.handleRoute());
      window.addEventListener("popstate", () => this.handleRoute());
    } catch (err) {
      this.showToast(`Erro de inicializacao: ${err.message}`);
    }
  }

  setupSettingsModal() {
    if (this.btnOpenSettings && this.settingsModal) {
      this.btnOpenSettings.addEventListener("click", () => {
        this.settingsModal.classList.remove("hidden");
      });
    }

    if (this.btnCloseSettings && this.settingsModal) {
      this.btnCloseSettings.addEventListener("click", () => {
        this.settingsModal.classList.add("hidden");
      });
    }

    if (this.settingsModal) {
      this.settingsModal.addEventListener("click", (e) => {
        if (e.target === this.settingsModal) {
          this.settingsModal.classList.add("hidden");
        }
      });
    }

    const currentRadio = document.querySelector(`input[name="control-type"][value="${this.controlType}"]`);
    if (currentRadio) currentRadio.checked = true;

    document.querySelectorAll('input[name="control-type"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        this.controlType = e.target.value;
        localStorage.setItem("retro_control_type", this.controlType);
      });
    });
  }

  setupFilters() {
    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        if (this.searchClear) {
          this.searchClear.classList.toggle("hidden", !this.searchQuery);
        }
        this.renderCatalogItems();
      });
    }

    if (this.searchClear) {
      this.searchClear.addEventListener("click", () => {
        this.searchInput.value = "";
        this.searchQuery = "";
        this.searchClear.classList.add("hidden");
        this.searchInput.focus();
        this.renderCatalogItems();
      });
    }

    this.renderPlatformChips();
  }

  renderPlatformChips() {
    if (!this.platformChips) return;
    this.platformChips.innerHTML = "";

    const platformCounts = {};
    this.games.forEach((g) => {
      const p = g.platform || "Outros";
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    });

    const platforms = ["ALL", ...Object.keys(platformCounts).sort()];

    platforms.forEach((plat) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `chip ${this.selectedPlatform === plat ? "active" : ""}`;
      const name = plat === "ALL" ? "Todos" : plat;
      const count = plat === "ALL" ? this.games.length : platformCounts[plat];

      chip.innerHTML = `${name} <span class="chip-badge">${count}</span>`;
      chip.onclick = () => {
        this.selectedPlatform = plat;
        document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        this.renderCatalogItems();
      };
      this.platformChips.appendChild(chip);
    });
  }

  /**
   * Identifica o jogo via Query Param (?game=id) ou Hash (#id)
   */
  getGameIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get("game") || params.get("id");
    if (queryId) return queryId;

    const hash = window.location.hash.replace("#", "").trim();
    return hash || null;
  }

  handleRoute() {
    const gameId = this.getGameIdFromUrl();

    if (gameId) {
      const game = this.games.find((g) => g.id.toLowerCase() === gameId.toLowerCase());
      if (game) {
        this.renderGameCard(game);
        return;
      }
      this.showToast(`Jogo "${gameId}" não encontrado no catálogo.`);
    }

    this.renderCatalog();
  }

  renderGameCard(game) {
    this.currentGame = game;
    this.catalogView.classList.add("hidden");
    this.cardView.classList.remove("hidden");

    document.getElementById("card-title").textContent = game.title;
    document.getElementById("card-players").textContent = game.players;
    document.getElementById("card-year").textContent = game.year;
    document.getElementById("card-publisher").textContent = game.publisher;
    document.getElementById("card-genre").textContent = game.genre;
    document.getElementById("card-desc").textContent = game.description;

    const coverImg = document.getElementById("card-cover");
    coverImg.src = game.cover;
    coverImg.alt = game.title;
    coverImg.onerror = () => {
      coverImg.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect fill='%231a1d2e' width='400' height='260'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='18' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ESem Capa%3C/text%3E%3C/svg%3E";
    };

    const btnLaunch = document.getElementById("btn-launch");
    btnLaunch.style.backgroundColor = game.color || "#6366f1";
    btnLaunch.onclick = () => this.launchGame(game);
  }

  renderCatalog() {
    this.currentGame = null;
    this.cardView.classList.add("hidden");
    this.catalogView.classList.remove("hidden");
    this.renderCatalogItems();
  }

  renderCatalogItems() {
    if (!this.catalogGrid) return;
    this.catalogGrid.innerHTML = "";

    const filtered = this.games.filter((game) => {
      const matchesPlatform = this.selectedPlatform === "ALL" || game.platform === this.selectedPlatform;
      const q = this.searchQuery;
      const matchesQuery =
        !q ||
        game.title.toLowerCase().includes(q) ||
        (game.genre && game.genre.toLowerCase().includes(q)) ||
        (game.publisher && game.publisher.toLowerCase().includes(q)) ||
        (game.year && String(game.year).includes(q));

      return matchesPlatform && matchesQuery;
    });

    if (this.catalogCount) {
      const total = filtered.length;
      this.catalogCount.textContent = `${total} ${total === 1 ? "jogo encontrado" : "jogos encontrados"}`;
    }

    if (this.emptyState) {
      this.emptyState.classList.toggle("hidden", filtered.length > 0);
    }

    filtered.forEach((game) => {
      const item = document.createElement("a");
      item.className = "catalog-item";
      item.href = `?game=${encodeURIComponent(game.id)}`;
      item.onclick = (e) => {
        e.preventDefault();
        history.pushState(null, "", `?game=${encodeURIComponent(game.id)}`);
        this.renderGameCard(game);
      };

      item.innerHTML = `
        <img class="catalog-thumb" src="${game.cover}" alt="${game.title}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'160\\' height=\\'120\\'%3E%3Crect fill=\\'%231a1d2e\\' width=\\'160\\' height=\\'120\\'/%3E%3C/svg%3E'">
        <div class="catalog-info">
          <div class="catalog-name">${game.title}</div>
          <div class="catalog-platform">${game.platform}</div>
        </div>
      `;
      this.catalogGrid.appendChild(item);
    });
  }

  async launchGame(game) {
    try {
      // 1. Transição de UI
      this.cardView.classList.add("hidden");
      this.catalogView.classList.add("hidden");
      this.emulatorViewport.style.display = "block";

      // 2. Trava orientação horizontal & Fullscreen (se suportado pelo SO/Browser)
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }

      // 3. Desbloqueio explícito do AudioContext para Mobile Safari / Android Chrome
      this.unlockAudioContext();

      // 4. Parâmetros EmulatorJS (libretro/Wasm)
      window.EJS_player = "#game-frame";
      window.EJS_core = game.core;
      window.EJS_gameName = game.title;
      window.EJS_gameUrl = game.rom;
      window.EJS_color = game.color || "#6366f1";
      window.EJS_startOnLoaded = true;
      window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";

      // Otimizações de performance e compatibilidade mobile (sem dependência de headers COOP/COEP)
      window.EJS_threads = false;
      if (game.core === "n64") {
        window.EJS_webgl = true;
        window.EJS_controlScheme = "n64";
        window.EJS_browserMode = "mobile";
      } else {
        window.EJS_webgl = false; // Canvas 2D nativo tem menor latência para 16-bits
      }
      window.EJS_alignAudio = false;
      window.EJS_audioWorklet = false;
      window.EJS_sampleRate = 44100;
      window.EJS_volume = 1.0;

      // 4.1 Controle Analogico se configurado
      if (this.controlType === "analog" && game.core !== "n64") {
        window.EJS_VirtualGamepadSettings = this.getAnalogGamepadSettings(game.core);
      } else if (game.core !== "n64") {
        delete window.EJS_VirtualGamepadSettings;
      }

      // 5. Injeção do Loader Wasm
      const script = document.createElement("script");
      script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
      script.async = true;
      script.onerror = () => {
        this.showToast("Falha ao carregar o motor do emulador (CDN).");
      };
      document.body.appendChild(script);
    } catch (err) {
      this.showToast(`Erro ao iniciar emulador: ${err.message}`);
    }
  }

  unlockAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
    }
  }

  getAnalogGamepadSettings(core) {
    if (core === "segaMD") {
      return [
        { type: "button", text: "C", id: "c", location: "right", top: 40, left: 80, bold: true, input_value: 8 },
        { type: "button", text: "B", id: "b", location: "right", top: 80, left: 40, bold: true, input_value: 1 },
        { type: "button", text: "A", id: "a", location: "right", top: 40, bold: true, input_value: 0 },
        { type: "zone", id: "stick", location: "left", left: "50%", top: "50%", joystickInput: true, inputValues: [4, 5, 6, 7] },
        { type: "button", text: "Start", id: "start", location: "center", left: 30, fontSize: 15, block: true, input_value: 3 }
      ];
    }

    if (core === "gb") {
      return [
        { type: "button", text: "A", id: "a", location: "right", left: 81, top: 40, bold: true, input_value: 8 },
        { type: "button", text: "B", id: "b", location: "right", left: 10, top: 70, bold: true, input_value: 0 },
        { type: "zone", id: "stick", location: "left", left: "50%", top: "50%", joystickInput: true, inputValues: [4, 5, 6, 7] },
        { type: "button", text: "Start", id: "start", location: "center", left: 60, fontSize: 15, block: true, input_value: 3 },
        { type: "button", text: "Select", id: "select", location: "center", left: -5, fontSize: 15, block: true, input_value: 2 }
      ];
    }

    // Default SNES
    return [
      { type: "button", text: "X", id: "x", location: "right", left: 40, bold: true, input_value: 9 },
      { type: "button", text: "Y", id: "y", location: "right", top: 40, bold: true, input_value: 0 },
      { type: "button", text: "B", id: "b", location: "right", top: 80, left: 40, bold: true, input_value: 1 },
      { type: "button", text: "A", id: "a", location: "right", top: 40, left: 80, bold: true, input_value: 8 },
      { type: "zone", id: "stick", location: "left", left: "50%", top: "50%", joystickInput: true, inputValues: [4, 5, 6, 7] },
      { type: "button", text: "Start", id: "start", location: "center", left: 60, fontSize: 15, block: true, input_value: 3 },
      { type: "button", text: "Select", id: "select", location: "center", left: -5, fontSize: 15, block: true, input_value: 2 },
      { type: "button", text: "L", id: "l", location: "left", left: 3, top: -90, bold: true, block: true, input_value: 10 },
      { type: "button", text: "R", id: "r", location: "right", right: 3, top: -90, bold: true, block: true, input_value: 11 }
    ];
  }

  showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 4000);
  }
}

// Inicializa no DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  new EmulatorApp();
});

