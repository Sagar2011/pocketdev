// Three increasingly insistent double knocks per permission request.
window.createPermissionKnocks = function () {
  let context, active = false, epoch = 0;
  const timers = new Set(), sources = new Set();
  function stop() {
    active = false; epoch++;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    for (const source of sources) { source.stop(); source.disconnect(); }
    sources.clear();
  }
  async function round(volume, token) {
    try {
      context ||= new AudioContext();
      await context.resume();
      if (!active || token !== epoch) return;
      for (const delay of [0, 0.18]) {
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.09), context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples.length / 7));
        const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
        source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 950; gain.gain.value = volume;
        source.connect(filter); filter.connect(gain); gain.connect(context.destination);
        sources.add(source);
        source.onended = () => { sources.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
        source.start(context.currentTime + delay);
      }
    } catch { /* Audio unavailable: the visible reminder still works. */ }
  }
  return {
    update(state, enabled) {
      if (state !== 'permission' || !enabled) { stop(); return; }
      if (active) return;
      active = true; const token = ++epoch;
      [0.12, 0.22, 0.34].forEach((volume, index) => {
        const timer = setTimeout(() => { timers.delete(timer); round(volume, token); }, index * 6000);
        timers.add(timer);
      });
    },
    stop
  };
};
