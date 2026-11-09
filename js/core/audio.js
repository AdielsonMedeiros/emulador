export function unlockAudioContext() {
  try {
    if (typeof navigator !== "undefined" && navigator.audioSession) {
      navigator.audioSession.type = "playback";
    }
  } catch (e) {}

  try {
    const AudioCtx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (AudioCtx) {
      if (!window._retroAudioCtx) {
        window._retroAudioCtx = new AudioCtx();
      }
      if (window._retroAudioCtx.state === "suspended") {
        window._retroAudioCtx.resume().catch(() => {});
      }
    }
  } catch (e) {}

  resumeEmulatorAudio();
}

export function resumeEmulatorAudio() {
  try {
    if (typeof window !== "undefined" && window._retroAudioCtx && window._retroAudioCtx.state === "suspended") {
      window._retroAudioCtx.resume().catch(() => {});
    }

    const emu = typeof window !== "undefined" ? window.EJS_emulator : null;
    if (emu) {
      if (emu.audioContext && emu.audioContext.state === "suspended") {
        emu.audioContext.resume().catch(() => {});
      }
      if (emu.ctx && emu.ctx.state === "suspended") {
        emu.ctx.resume().catch(() => {});
      }
      if (emu.gameManager?.audioCtx && emu.gameManager.audioCtx.state === "suspended") {
        emu.gameManager.audioCtx.resume().catch(() => {});
      }
      if (emu.Module?.AL?.currentCtx) {
        const al = emu.Module.AL.currentCtx;
        const ctx = al.audioCtx || al.ctx;
        if (ctx && ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        if (al.sources) {
          const sources = Array.isArray(al.sources) ? al.sources : Object.values(al.sources);
          for (const s of sources) {
            const c = s?.gain?.context;
            if (c && c.state === "suspended") {
              c.resume().catch(() => {});
            }
          }
        }
      }
      if (emu.Module?.SDL2?.audioContext && emu.Module.SDL2.audioContext.state === "suspended") {
        emu.Module.SDL2.audioContext.resume().catch(() => {});
      }
    }
  } catch (e) {}
}

export function registerAudioUnlockListeners() {
  if (typeof window === "undefined" || !window.addEventListener || window._audioUnlockRegistered) return;
  window._audioUnlockRegistered = true;

  const unlock = () => {
    unlockAudioContext();
  };

  // capture: true garante execucao prioritaria no primeiro gesto do usuario antes de event.stopPropagation()
  window.addEventListener("touchstart", unlock, { passive: true, capture: true });
  window.addEventListener("touchend", unlock, { passive: true, capture: true });
  window.addEventListener("click", unlock, { passive: true, capture: true });
  if (typeof document !== "undefined") {
    document.addEventListener("touchstart", unlock, { passive: true, capture: true });
    document.addEventListener("touchend", unlock, { passive: true, capture: true });
  }
}
