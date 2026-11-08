export function unlockAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!window._retroAudioCtx) {
        window._retroAudioCtx = new AudioCtx();
      }
      if (window._retroAudioCtx.state === "suspended") {
        window._retroAudioCtx.resume().catch(() => {});
      }
    }
  } catch (e) {}
}
