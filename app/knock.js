// Recorded keyboard/celebration audio and native Web Audio permission knocks.
window.createActivitySounds = function () {
  let completion,
    typing,
    context,
    current = "",
    epoch = 0,
    timer;
  const sources = new Set();
  function stop() {
    current = "";
    epoch++;
    clearTimeout(timer);
    for (const clip of [completion, typing]) {
      if (!clip) continue;
      clip.pause();
      clip.currentTime = 0;
    }
    for (const source of sources) {
      source.stop();
      source.disconnect();
    }
    sources.clear();
  }
  async function play(state, round, token) {
    try {
      if (state === "done") {
        completion ||= new Audio("assets/sounds/party-popper.mp3");
        completion.volume = 0.45;
        await completion.play();
        return;
      }
      if (state === "working") {
        typing ||= new Audio("assets/sounds/keyboard.mp3");
        typing.loop = true;
        typing.volume = 0.18;
        await typing.play();
        return;
      }
      context ||= new AudioContext();
      await context.resume();
      if (token !== epoch) return;
      const volume = Math.min(0.4 + round * 0.2, 0.8);
      const duration = 0.12;
      for (const delay of [0, 0.23]) {
        const buffer = context.createBuffer(
          1,
          Math.ceil(context.sampleRate * duration),
          context.sampleRate,
        );
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) {
          const time = i / context.sampleRate;
          const noise = Math.random() * 2 - 1;

          samples[i] =
            (0.55 *
              Math.sin(2 * Math.PI * 180 * time) *
              Math.exp(-time / 0.022) +
              0.2 *
                Math.sin(2 * Math.PI * 470 * time) *
                Math.exp(-time / 0.007) +
              0.65 * noise * Math.exp(-time / 0.012)) *
            Math.min(1, time / 0.001);
        }
        let peak = 0;
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
        if (peak)
          for (let i = 0; i < samples.length; i++) samples[i] *= 0.95 / peak;
        const source = context.createBufferSource(),
          filter = context.createBiquadFilter(),
          gain = context.createGain();
        source.buffer = buffer;
        filter.type = "lowpass";
        filter.frequency.value = 2200;
        gain.gain.value = volume;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        sources.add(source);
        source.onended = () => {
          sources.delete(source);
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
        source.start(context.currentTime + delay);
      }
    } catch {
      /* Audio unavailable: the visible status still works. */
    }
    if (token === epoch && state === "permission")
      timer = setTimeout(() => play(state, round + 1, token), 6000);
  }
  return {
    update(state, prefs) {
      const enabled =
        state === "permission"
          ? prefs.sound
          : state === "working"
            ? prefs.workingSound
            : state === "done"
              ? prefs.doneSound
              : false;
      const next = enabled ? state : "";
      if (next === current) return;
      stop();
      current = next;
      if (next) play(next, 0, epoch);
    },
    stop,
  };
};
