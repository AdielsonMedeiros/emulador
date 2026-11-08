export class GameService {
  async fetchGames() {
    const response = await fetch(`data/games.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Falha ao carregar games.json: ${response.statusText}`);
    }
    const data = await response.json();
    return data.games || [];
  }
}

