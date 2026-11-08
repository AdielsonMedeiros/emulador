import { GameService } from "./services/game-service.js?v=44";
import { EmulatorEngine } from "./core/engine.js?v=44";
import { CatalogModule } from "./modules/catalog.js?v=44";
import { Router } from "./modules/router.js?v=44";
import { resolveAssetUrl } from "./core/utils.js?v=44";
import { GameMatcher } from "./core/matcher.js?v=44";

class App {
  constructor() {
    this.gameService = new GameService();
    this.engine = new EmulatorEngine(
      document.getElementById("emulator-viewport"),
      document.getElementById("game-frame")
    );

    this.cardView = document.getElementById("game-card");
    this.catalogView = document.getElementById("catalog-view");
    this.games = [];

    this.engine.setOnExit(() => this.exitGameToCatalog());
    this.init();
  }

  exitGameToCatalog() {
    this.showCatalog();
    Router.navigateToCatalog();
    if ("ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)) {
      window.location.replace(window.location.pathname);
    }
  }

  async init() {
    try {
      this.games = await this.gameService.fetchGames();
      this.catalog = new CatalogModule(this.games, (game) => {
        Router.navigateToGame(game.id);
        this.showGameCard(game);
      });

      this.handleRoute();
      Router.onRoute(() => this.handleRoute());
    } catch (err) {
      this.showToast(`Erro ao inicializar: ${err.message}`);
    }
  }

  handleRoute() {
    const gameId = Router.getGameIdFromUrl();
    if (gameId) {
      const game = GameMatcher.find(this.games, gameId);
      if (game) {
        this.showGameCard(game);
        return;
      }
      this.showToast(`Jogo '${gameId}' nao encontrado.`);
    }
    this.showCatalog();
  }

  showGameCard(game) {
    this.catalogView.classList.add("hidden");
    this.cardView.classList.remove("hidden");

    document.getElementById("card-title").textContent = game.title;
    document.getElementById("card-players").textContent = game.players;
    document.getElementById("card-year").textContent = game.year;
    document.getElementById("card-publisher").textContent = game.publisher;
    document.getElementById("card-genre").textContent = game.genre;
    document.getElementById("card-desc").textContent = game.description;

    const coverImg = document.getElementById("card-cover");
    coverImg.onerror = () => {
      coverImg.onerror = null;
      coverImg.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect fill='%231a1d2e' width='400' height='260'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='18' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ESem Capa%3C/text%3E%3C/svg%3E";
    };
    coverImg.alt = game.title;
    coverImg.src = resolveAssetUrl(game.cover);

    const btnLaunch = document.getElementById("btn-launch");
    btnLaunch.style.backgroundColor = game.color || "#6366f1";
    btnLaunch.onclick = () => {
      this.cardView.classList.add("hidden");
      this.catalogView.classList.add("hidden");
      this.engine.launch(game);
    };
  }

  showCatalog() {
    this.cardView.classList.add("hidden");
    this.catalogView.classList.remove("hidden");
  }

  showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
  }
}

function bootstrap() {
  new App();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
