import { resolveAssetUrl } from "../core/utils.js";

export class CatalogModule {
  constructor(games, onSelectGame) {
    this.games = games || [];
    this.filteredGames = [];
    this.onSelectGame = onSelectGame;
    this.selectedPlatform = "ALL";
    this.searchQuery = "";

    // Paginacao mobile-first
    this.pageSize = 24;
    this.currentPage = 1;

    this.searchInput = document.getElementById("search-input");
    this.searchClear = document.getElementById("search-clear");
    this.platformChips = document.getElementById("platform-chips");
    this.btnScrollLeft = document.getElementById("btn-scroll-chips-left");
    this.btnScrollRight = document.getElementById("btn-scroll-chips-right");
    this.catalogCount = document.getElementById("catalog-count");
    this.catalogGrid = document.getElementById("catalog-grid");
    this.emptyState = document.getElementById("empty-state");

    // Elementos de paginacao
    this.catalogPagination = document.getElementById("catalog-pagination");
    this.btnPagePrev = document.getElementById("btn-page-prev");
    this.btnPageNext = document.getElementById("btn-page-next");
    this.currentPageEl = document.getElementById("pagination-current-page");
    this.totalPagesEl = document.getElementById("pagination-total-pages");
    this.paginationInfo = document.getElementById("pagination-info");

    this.init();
  }

  init() {
    this.setupSearch();
    this.setupChipsScroll();
    this.setupPagination();
    this.renderPlatformChips();
    this.render(true);
  }

  setupChipsScroll() {
    if (!this.platformChips || !this.btnScrollLeft || !this.btnScrollRight) return;

    const scrollStep = 240;

    this.btnScrollLeft.addEventListener("click", () => {
      this.platformChips.scrollBy({ left: -scrollStep, behavior: "smooth" });
    });

    this.btnScrollRight.addEventListener("click", () => {
      this.platformChips.scrollBy({ left: scrollStep, behavior: "smooth" });
    });

    this.platformChips.addEventListener("scroll", () => this.updateScrollButtons(), { passive: true });
    window.addEventListener("resize", () => this.updateScrollButtons());

    if (typeof ResizeObserver !== "undefined") {
      this.chipsResizeObserver = new ResizeObserver(() => this.updateScrollButtons());
      this.chipsResizeObserver.observe(this.platformChips);
    }

    setTimeout(() => this.updateScrollButtons(), 60);
  }

  updateScrollButtons() {
    if (!this.platformChips || !this.btnScrollLeft || !this.btnScrollRight) return;

    const { scrollLeft, scrollWidth, clientWidth } = this.platformChips;
    const hasOverflow = scrollWidth > clientWidth + 4;

    if (!hasOverflow) {
      this.btnScrollLeft.style.display = "none";
      this.btnScrollRight.style.display = "none";
      return;
    }

    this.btnScrollLeft.style.display = "flex";
    this.btnScrollRight.style.display = "flex";

    const canScrollLeft = scrollLeft > 6;
    const canScrollRight = scrollLeft + clientWidth < scrollWidth - 6;

    this.btnScrollLeft.disabled = !canScrollLeft;
    this.btnScrollRight.disabled = !canScrollRight;
  }

  setupSearch() {
    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim();
        if (this.searchClear) {
          this.searchClear.classList.toggle("hidden", !this.searchQuery);
        }
        this.render(true);
      });
    }

    if (this.searchClear) {
      this.searchClear.addEventListener("click", () => {
        this.searchInput.value = "";
        this.searchQuery = "";
        this.searchClear.classList.add("hidden");
        this.searchInput.focus();
        this.render(true);
      });
    }
  }

  setupPagination() {
    if (this.btnPagePrev) {
      this.btnPagePrev.addEventListener("click", () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.render(false, true);
        }
      });
    }

    if (this.btnPageNext) {
      this.btnPageNext.addEventListener("click", () => {
        const total = this.filteredGames.length;
        const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.render(false, true);
        }
      });
    }
  }

  normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  applyFilters() {
    const rawQuery = this.normalize(this.searchQuery);
    const terms = rawQuery.split(/\s+/).filter(Boolean);

    this.filteredGames = this.games.filter((game) => {
      const matchesPlatform = this.selectedPlatform === "ALL" || game.platform === this.selectedPlatform;
      if (!matchesPlatform) return false;
      if (terms.length === 0) return true;

      const title = this.normalize(game.title);
      const genre = this.normalize(game.genre);
      const publisher = this.normalize(game.publisher);
      const platform = this.normalize(game.platform);
      const year = String(game.year || "");

      return terms.every(
        (t) =>
          title.includes(t) ||
          genre.includes(t) ||
          publisher.includes(t) ||
          platform.includes(t) ||
          year.includes(t)
      );
    });
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
        chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        this.render(true);
      };
      this.platformChips.appendChild(chip);
    });

    requestAnimationFrame(() => this.updateScrollButtons());
  }

  createCard(game) {
    const item = document.createElement("a");
    item.className = "catalog-item";
    item.href = `?game=${encodeURIComponent(game.id)}`;
    item.onclick = (e) => {
      e.preventDefault();
      this.onSelectGame(game);
    };

    const resolvedCover = resolveAssetUrl(game.cover);
    item.innerHTML = `
      <img class="catalog-thumb" src="${resolvedCover}" alt="${game.title}" loading="lazy" decoding="async">
      <div class="catalog-info">
        <div class="catalog-name">${game.title}</div>
        <div class="catalog-platform">${game.platform}</div>
      </div>
    `;

    const img = item.querySelector("img");
    if (img) {
      img.onerror = () => {
        img.onerror = null;
        img.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='120'%3E%3Crect fill='%231a1d2e' width='160' height='120'/%3E%3C/svg%3E";
      };
    }
    return item;
  }

  render(reset = true, shouldScroll = false) {
    if (!this.catalogGrid) return;

    if (reset) {
      this.currentPage = 1;
      this.applyFilters();
    }

    const total = this.filteredGames.length;
    const totalPages = Math.max(1, Math.ceil(total / this.pageSize));

    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    if (this.catalogCount) {
      this.catalogCount.textContent = `${total} ${total === 1 ? "jogo encontrado" : "jogos encontrados"}`;
    }

    if (this.emptyState) {
      this.emptyState.classList.toggle("hidden", total > 0);
    }

    this.catalogGrid.innerHTML = "";

    if (total === 0) {
      this.updatePaginationUI(0, 0, 0, 0);
      return;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, total);
    const pageItems = this.filteredGames.slice(startIndex, endIndex);

    const fragment = document.createDocumentFragment();
    pageItems.forEach((game) => {
      fragment.appendChild(this.createCard(game));
    });
    this.catalogGrid.appendChild(fragment);

    this.updatePaginationUI(total, totalPages, startIndex + 1, endIndex);

    if (shouldScroll) {
      const topOffset = this.catalogGrid.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: "smooth" });
    }
  }

  updatePaginationUI(total, totalPages, startItem, endItem) {
    if (!this.catalogPagination) return;

    if (total === 0 || totalPages <= 1) {
      this.catalogPagination.classList.add("hidden");
      return;
    }

    this.catalogPagination.classList.remove("hidden");

    if (this.currentPageEl) {
      this.currentPageEl.textContent = String(this.currentPage);
    }
    if (this.totalPagesEl) {
      this.totalPagesEl.textContent = String(totalPages);
    }

    if (this.btnPagePrev) {
      this.btnPagePrev.disabled = this.currentPage <= 1;
    }
    if (this.btnPageNext) {
      this.btnPageNext.disabled = this.currentPage >= totalPages;
    }

    if (this.paginationInfo) {
      this.paginationInfo.textContent = `Mostrando ${startItem}–${endItem} de ${total} jogos`;
    }
  }
}

