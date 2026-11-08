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

    this.cardView = document.getElementById("game-card");
    this.catalogView = document.getElementById("catalog-view");
    this.emulatorViewport = document.getElementById("emulator-viewport");
    this.gameTarget = document.getElementById("game-frame");

    this.init();
  }

  async init() {
    try {
      const response = await fetch("data/games.json");
      if (!response.ok) {
        throw new Error(`Falha ao carregar games.json: ${response.statusText}`);
      }
      const data = await response.json();
      this.games = data.games || [];

      this.handleRoute();
      window.addEventListener("hashchange", () => this.handleRoute());
      window.addEventListener("popstate", () => this.handleRoute());
    } catch (err) {
      this.showToast(`Erro de inicialização: ${err.message}`);
    }
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
    document.getElementById("card-players").textContent = `🎮 ${game.players}`;
    document.getElementById("card-year").textContent = `📅 ${game.year}`;
    document.getElementById("card-publisher").textContent = `🏢 ${game.publisher}`;
    document.getElementById("card-genre").textContent = `🎯 ${game.genre}`;
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

    const grid = document.getElementById("catalog-grid");
    grid.innerHTML = "";

    this.games.forEach((game) => {
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
      grid.appendChild(item);
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
      window.EJS_webgl = false; // Canvas 2D nativo tem menor latência de entrada em webviews móveis
      window.EJS_alignAudio = false;
      window.EJS_audioWorklet = false;
      window.EJS_sampleRate = 44100;
      window.EJS_volume = 1.0;

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

