export class Router {
  static getGameIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get("game") || params.get("id");
    if (queryId) return queryId;

    const hash = window.location.hash.replace("#", "").trim();
    return hash || null;
  }

  static navigateToGame(gameId) {
    history.pushState(null, "", `?game=${encodeURIComponent(gameId)}`);
  }

  static onRoute(callback) {
    window.addEventListener("hashchange", callback);
    window.addEventListener("popstate", callback);
  }
}
