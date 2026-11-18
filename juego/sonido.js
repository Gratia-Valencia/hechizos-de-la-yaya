'use strict';
// 🎵 Sonidos suaves y música de cajita de música, hechos con WebAudio (sin archivos, sin derechos).
const Sonido = (() => {
  let ac = null, master = null, mus = null, sfx = null, timer = null, paso = 0, prox = 0;
  let sonidoOn = true, musicaOn = true, sonando = false;

  const N = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const f = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return m ? 440 * Math.pow(2, ((+m[2] + 1) * 12 + N[m[1]] - 69) / 12) : 0; };

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination);
    mus = ac.createGain(); mus.gain.value = musicaOn ? 0.16 : 0; mus.connect(master);
    sfx = ac.createGain(); sfx.gain.value = sonidoOn ? 0.5 : 0; sfx.connect(master);
  }
  function nota(tipo, fr, t, dur, vol, out, hasta) {
    if (!ac || !fr) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo; o.frequency.setValueAtTime(fr, t);
    if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || sfx); o.start(t); o.stop(t + dur + 0.05);
  }

  // Vals tranquilo en La menor (3/4), como una cajita de música
  const S = s => s.trim().split(/\s+/);
  const MEL = S(`A5 - C6 - E6 - D6 - C6 - B5 - C6 - - - A5 - G5 - - - E5 - G5 - C6 - B5 - A5 - G5 -
                 F5 - A5 - C6 - B5 - A5 - G#5 - A5 - - - - -  E5 - A5 - B5 - C6 - D6 - E6 - D6 - C6 - B5 - A5 - - - - -`);
  const BAJ = S(`A3 - - - E4 - A3 - - - E4 - C4 - - - G4 - C4 - - - G4 -  F3 - - - C4 - E3 - - - B3 -
                 F3 - - - C4 - E3 - - - B3 - A3 - - - E4 - A3 - - - E4 -  A3 - - - E4 - A3 - - - - -`);
  function programar() {
    if (!sonando || !ac) return;
    const spb = 60 / 132 / 2;
    while (prox < ac.currentTime + 0.15) {
      const m = MEL[paso % MEL.length], b = BAJ[paso % BAJ.length];
      if (m !== '-') { nota('sine', f(m), prox, 0.9, 0.22, mus); nota('triangle', f(m) * 2, prox, 0.25, 0.04, mus); }
      if (b !== '-') nota('triangle', f(b), prox, 0.8, 0.18, mus);
      prox += spb; paso++;
    }
  }

  return {
    init,
    musica() { init(); if (!ac || sonando) return; sonando = true; paso = 0; prox = ac.currentTime + 0.1; if (!timer) timer = setInterval(programar, 40); },
    parar() { sonando = false; },
    ponerSonido(v) { sonidoOn = v; if (sfx) sfx.gain.value = v ? 0.5 : 0; },
    ponerMusica(v) { musicaOn = v; if (mus) mus.gain.value = v ? 0.16 : 0; },
    pausa() { if (ac && ac.state === 'running') ac.suspend(); },
    seguir() { if (ac && ac.state === 'suspended') ac.resume(); },
    efecto(nombre, k) {
      if (!ac) return; const t = ac.currentTime;
      switch (nombre) {
        case 'toque': nota('sine', 880, t, 0.08, 0.2); break;
        case 'cambiar': nota('sine', 520, t, 0.12, 0.25, null, 700); break;
        case 'mal': nota('triangle', 300, t, 0.18, 0.3, null, 220); break;
        case 'trio': {                                   // sube con cada cascada
          const base = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'][Math.min(7, (k || 1) - 1)];
          nota('sine', f(base), t, 0.3, 0.3); nota('sine', f(base) * 1.5, t + 0.05, 0.3, 0.18); break;
        }
        case 'especial': ['E6', 'G6', 'B6', 'E7'].forEach((n, i) => nota('sine', f(n), t + i * 0.04, 0.25, 0.15)); break;
        case 'rayo': nota('sawtooth', 1400, t, 0.25, 0.08, null, 300); nota('sine', 900, t, 0.3, 0.2, null, 1800); break;
        case 'bomba': nota('sine', 160, t, 0.4, 0.5, null, 50); break;
        case 'bola': ['C6', 'E6', 'G6', 'C7', 'E7', 'G7'].forEach((n, i) => nota('sine', f(n), t + i * 0.05, 0.3, 0.14)); break;
        case 'pocion': [0, 1, 2, 3, 4].forEach(i => nota('sine', 300 + i * 120, t + i * 0.07, 0.12, 0.2, null, 500 + i * 140)); break;
        case 'gana': ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'].forEach((n, i) => nota('sine', f(n), t + i * 0.09, 0.5, 0.25)); break;
        case 'pierde': ['A4', 'G4', 'F4', 'E4'].forEach((n, i) => nota('triangle', f(n), t + i * 0.18, 0.4, 0.25)); break;
        case 'estrella': nota('sine', f('E6'), t, 0.3, 0.25); nota('sine', f('B6'), t + 0.08, 0.35, 0.2); break;
      }
    },
  };
})();
