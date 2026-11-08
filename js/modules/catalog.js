import { Router } from "./router.js";

export class CatalogModule {
  constructor(games, onSelectGame) {
    this.games = games;
    this.onSelectGame = onSelectGame;
    this.selectedPlatform = "ALL";
    this.searchQuery = "";

    this.searchInput = document.getElementById("search-input");
    this.searchClear = document.getElementById("search-clear");
    this.platformChips = document.getElementById("platform-chips");
    this.catalogCount = document.getElementById("catalog-count");
    this.catalogGrid = document.getElementById("catalog-grid");
    this.emptyState = document.getElementById("empty-state");

    this.init();
  }

  init() {
    this.setupSearch();
    this.renderPlatformChips();
    this.render();
  }

  setupSearch() {
    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        if (this.searchClear) {
          this.searchClear.classList.toggle("hidden", !this.searchQuery);
        }
        this.render();
      });
    }

    if (this.searchClear) {
      this.searchClear.addEventListener("click", () => {
        this.searchInput.value = "";
        this.searchQuery = "";
        this.searchClear.classList.add("hidden");
        this.searchInput.focus();
        this.render();
      });
    }
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
        this.render();
      };
      this.platformChips.appendChild(chip);
    });
  }

  render() {
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
        Router.navigateToGame(game.id);
        this.onSelectGame(game);
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
}
