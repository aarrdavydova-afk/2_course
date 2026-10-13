function createPhaseEngine() {
  const master = new Tone.Limiter(-2).toDestination();
  const leadVol = new Tone.Volume(-8).connect(master),
    bassVol = new Tone.Volume(-9).connect(master),
    drumVol = new Tone.Volume(-9).connect(master),
    percVol = new Tone.Volume(-13).connect(master);
  const leadFilter = new Tone.Filter(2800, "lowpass").connect(leadVol),
    bassFilter = new Tone.Filter(500, "lowpass").connect(bassVol);
  const lead = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.012, decay: 0.16, sustain: 0.34, release: 0.22 },
  }).connect(leadFilter);
  const bass = new Tone.MonoSynth({
    oscillator: { type: "sawtooth" },
    filter: { Q: 1, type: "lowpass", rolloff: -24 },
    envelope: { attack: 0.01, decay: 0.19, sustain: 0.35, release: 0.16 },
    filterEnvelope: {
      attack: 0.001,
      decay: 0.18,
      sustain: 0.2,
      release: 0.15,
      baseFrequency: 90,
      octaves: 2.8,
    },
  }).connect(bassFilter);
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.045,
    octaves: 7,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.05 },
  }).connect(drumVol);
  const snare = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.12, sustain: 0 },
  }).connect(drumVol);
  const hat = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.035, sustain: 0 },
  }).connect(new Tone.Filter(7200, "highpass").connect(drumVol));
  const click = new Tone.MetalSynth({
    frequency: 250,
    envelope: { attack: 0.001, decay: 0.07, release: 0.02 },
    harmonicity: 4.1,
    modulationIndex: 20,
    resonance: 1800,
    octaves: 1.5,
  }).connect(percVol);
  const volumes = {
    lead: leadVol,
    bass: bassVol,
    drums: drumVol,
    percussion: percVol,
  };
  const base = { lead: -8, bass: -9, drums: -9, percussion: -13 };
  const db = (v) => (v <= 0 ? -Infinity : 20 * Math.log10(v / 100));
  function update(ch, param, val) {
    if (param === "vol") volumes[ch].volume.rampTo(base[ch] + db(val), 0.08);
    if (param === "depth") {
      if (ch === "lead") leadFilter.frequency.rampTo(500 + val * 55, 0.08);
      if (ch === "bass") bassFilter.frequency.rampTo(120 + val * 11, 0.08);
      if (ch === "drums") snare.envelope.decay = 0.045 + val * 0.0022;
      if (ch === "percussion") click.envelope.decay = 0.025 + val * 0.0016;
    }
  }
  // Speed adjusts each part's note density without desynchronizing the shared BPM.
  function enabled(ch, step) {
    const v = Phase.channels[ch].speed;
    return (
      v >= 70 || step % 2 === 0 || (v >= 35 && step % 4 === 0) || step % 8 === 0
    );
  }
  const part = new Tone.Loop((time) => {
    const step =
      Math.round(Tone.Transport.ticks / (Tone.Transport.PPQ / 4)) % 32;
    const s16 = step % 16;
    const a = PHASE_LEAD_NOTES[step];
    if (Phase.enabled.lead && a && enabled("lead", step))
      lead.triggerAttackRelease(
        phaseTranspose(a, Phase.transpose[0]),
        "16n",
        time,
        (Phase.melodyVolume[0] / 100) * 0.72,
      );
    const b = PHASE_BASS_NOTES[step];
    if (Phase.enabled.bass && b && enabled("bass", step))
      bass.triggerAttackRelease(
        phaseTranspose(b, Phase.transpose[1]),
        "16n",
        time,
        (Phase.melodyVolume[1] / 100) * 0.75,
      );
    if (Phase.enabled.drums && PHASE_KICK[s16])
      kick.triggerAttackRelease("C1", "8n", time, 0.9);
    if (Phase.enabled.drums && PHASE_SNARE[s16])
      snare.triggerAttackRelease("16n", time, 0.5);
    if (Phase.enabled.drums && PHASE_HAT[s16] && enabled("drums", step))
      hat.triggerAttackRelease("32n", time, 0.16);
    if (
      Phase.enabled.percussion &&
      PHASE_PERC[s16] &&
      enabled("percussion", step)
    )
      click.triggerAttackRelease("32n", time, 0.09);
  }, "16n").start(0);
  for (const ch of Object.keys(Phase.channels)) {
    update(ch, "vol", Phase.channels[ch].vol);
    update(ch, "depth", Phase.channels[ch].depth);
  }
  return { update, updateMelody() {}, part };
}
