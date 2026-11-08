export class GameMatcher {
  static normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  static find(games, query) {
    if (!query || !games || games.length === 0) return null;
    const clean = String(query).toLowerCase().trim();
    const alpha = this.normalize(query);

    // Prioridade 1: ID exato
    let match = games.find((g) => g.id.toLowerCase() === clean);
    if (match) return match;

    // Prioridade 2: ID alfanumerico
    match = games.find((g) => this.normalize(g.id) === alpha);
    if (match) return match;

    // Prioridade 3: Titulo alfanumerico
    match = games.find((g) => this.normalize(g.title) === alpha);
    if (match) return match;

    // Prioridade 4: Base do nome da ROM ou Capa
    match = games.find((g) => {
      const romBase = g.rom.split("/").pop().split(".")[0].toLowerCase();
      const coverBase = g.cover.split("/").pop().split(".")[0].toLowerCase().replace("-cover", "");
      return (
        romBase === clean ||
        coverBase === clean ||
        this.normalize(romBase) === alpha ||
        this.normalize(coverBase) === alpha
      );
    });
    if (match) return match;

    // Prioridade 5: Prefixo no titulo
    return games.find((g) => this.normalize(g.title).startsWith(alpha)) || null;
  }
}
