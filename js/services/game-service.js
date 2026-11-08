import { resolveAssetUrl } from "../core/utils.js";

export class GameService {
  async fetchGames() {
    const targetUrl = resolveAssetUrl(`data/games.json?t=${Date.now()}`);
    const response = await fetch(targetUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Falha ao carregar games.json: ${response.statusText}`);
    }
    const data = await response.json();
    return data.games || [];
  }
}
