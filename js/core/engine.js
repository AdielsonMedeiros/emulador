import { unlockAudioContext } from "./audio.js";
import { getAnalogGamepadSettings } from "./controls.js";

export class EmulatorEngine {
  constructor(viewportElement, targetElement) {
    this.viewportElement = viewportElement;
    this.targetElement = targetElement;
  }

  launch(game, controlType) {
    this.viewportElement.style.display = "block";

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }

    unlockAudioContext();

    const playerId = this.targetElement.id ? `#${this.targetElement.id}` : "#game-frame";
    this.targetElement.innerHTML = `<div id="game-instance" style="width:100%; height:100%;"></div>`;
    window.EJS_player = "#game-instance";

    window.EJS_core = game.core;
    window.EJS_gameName = game.title;
    window.EJS_gameUrl = game.rom;
    window.EJS_color = game.color || "#6366f1";
    window.EJS_startOnLoaded = true;
    window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";

    window.EJS_threads = false;
    if (game.core === "n64") {
      window.EJS_webgl = true;
      window.EJS_controlScheme = "n64";
      window.EJS_browserMode = "mobile";
    } else {
      window.EJS_webgl = false;
    }

    window.EJS_alignAudio = false;
    window.EJS_audioWorklet = false;
    window.EJS_sampleRate = 44100;
    window.EJS_volume = 1.0;

    if (controlType === "analog" && game.core !== "n64") {
      window.EJS_VirtualGamepadSettings = getAnalogGamepadSettings(game.core);
    } else if (game.core !== "n64") {
      delete window.EJS_VirtualGamepadSettings;
    }

    const oldScript = document.getElementById("emulatorjs-loader");
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.id = "emulatorjs-loader";
    script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
    script.async = true;
    document.body.appendChild(script);
  }
}

