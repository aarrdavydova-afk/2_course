const Phase = {
  channels: {
    lead: { vol: 75, speed: 50, depth: 55 },
    bass: { vol: 75, speed: 50, depth: 50 },
    drums: { vol: 75, speed: 50, depth: 60 },
    percussion: { vol: 60, speed: 50, depth: 50 },
  },
  enabled: { lead: false, bass: false, drums: false, percussion: false },
  melodySelection: [null, null],
  transpose: [0, 0],
  melodyVolume: [75, 68],
  ready: false,
  playing: false,
  engine: null,
};
const names = { vol: "vol", speed: "speed", depth: "depth" };
function setKnobVisual(btn, value) {
  btn.style.setProperty("--angle", `${(value - 50) * 2.7}deg`);
  btn.setAttribute("aria-valuenow", String(value));
}
for (const container of document.querySelectorAll(".knobs")) {
  const channel = container.dataset.channel;
  for (const param of ["vol", "speed", "depth"]) {
    const wrapper = document.createElement("div");
    wrapper.className = "knob-control";
    wrapper.innerHTML = `<button type="button" class="knob" role="slider" tabindex="0" aria-label="${channel} ${param}" aria-valuemin="0" aria-valuemax="100"></button><label>${names[param]}</label>`;
    container.append(wrapper);
    const btn = wrapper.querySelector("button");
    let value = Phase.channels[channel][param];
    function change(v) {
      value = Math.max(0, Math.min(100, Math.round(v)));
      Phase.channels[channel][param] = value;
      setKnobVisual(btn, value);
      Phase.engine?.update(channel, param, value);
    }
    setKnobVisual(btn, value);
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      const startY = e.clientY,
        startValue = value;
      const move = (ev) => change(startValue + (startY - ev.clientY) * 0.65);
      const up = () => {
        btn.removeEventListener("pointermove", move);
        btn.removeEventListener("pointerup", up);
        btn.removeEventListener("pointercancel", up);
      };
      btn.addEventListener("pointermove", move);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
    });
    btn.addEventListener("keydown", (e) => {
      if (
        [
          "ArrowUp",
          "ArrowRight",
          "ArrowDown",
          "ArrowLeft",
          "Home",
          "End",
        ].includes(e.key)
      ) {
        e.preventDefault();
        change(
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? 100
              : value + (["ArrowUp", "ArrowRight"].includes(e.key) ? 5 : -5),
        );
      }
    });
  }
}

for (const group of document.querySelectorAll(".steps")) {
  const m = Number(group.dataset.melody);
  for (let i = 0; i < 5; i++) {
    const b = document.createElement("button");
    b.className = "step";
    b.type = "button";
    b.setAttribute("aria-label", `Melody ${m + 1}, вариант ${i + 1}`);
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      const same = Phase.melodySelection[m] === i;
      Phase.melodySelection[m] = same ? null : i;
      group.querySelectorAll(".step").forEach((el, j) => {
        el.classList.toggle("active", !same && j === i);
        el.setAttribute("aria-pressed", String(!same && j === i));
      });
    });
    group.append(b);
  }
}
for (const toggle of document.querySelectorAll(".channel-toggle")) {
  const ch = toggle.dataset.toggle;
  toggle.addEventListener("click", async () => {
    try {
      if (typeof Tone === "undefined")
        throw Error("Не загрузилась Tone.js. Проверь интернет.");
      await Tone.start();
      if (!Phase.ready) {
        Phase.engine = createPhaseEngine();
        Phase.ready = true;
      }
      Phase.enabled[ch] = !Phase.enabled[ch];
      toggle.classList.toggle("active", Phase.enabled[ch]);
      toggle.setAttribute("aria-pressed", String(Phase.enabled[ch]));
      if (Phase.enabled[ch] && !Phase.playing) {
        Tone.Transport.bpm.value = 112;
        Tone.Transport.start();
        Phase.playing = true;
      }
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  });
}
for (let i = 0; i < 2; i++)
  document
    .getElementById(`melody${i + 1}vol`)
    .addEventListener("input", (e) => {
      Phase.melodyVolume[i] = Number(e.target.value);
      Phase.engine?.updateMelody(i, Phase.melodyVolume[i]);
    });
