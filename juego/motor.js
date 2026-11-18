'use strict';
// 🧙‍♀️ Hechizos de la Yaya · el motor del tablero (sin dibujos: solo las reglas).
// Cada jugada devuelve una lista de «pasos» que luego se animan en pantalla.

function azar(semilla) {               // números al azar que se pueden repetir (mulberry32)
  const r = { s: semilla >>> 0 };
  r.next = () => {
    let t = (r.s = (r.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return r;
}

// ---------- Los 50 niveles ----------
const NIVELES_TOTAL = 50;
const FORMAS_TELARANA = [
  (r, c, R, C) => r >= 2 && r <= 5 && c >= 2 && c <= 4,                 // bloque en el centro
  (r, c, R, C) => r >= R - 2,                                           // las dos filas de abajo
  (r, c, R, C) => r === c || r === C - 1 - c || r - 1 === c || r - 1 === C - 1 - c, // una X
  (r, c, R, C) => r === 0 || r === R - 1 || c === 0 || c === C - 1,     // el borde
  (r, c, R, C) => (r + c) % 2 === 0 && r >= 3,                          // ajedrez abajo
  (r, c, R, C) => c === 1 || c === C - 2 || r === 4,                    // una H
];

function crearNivel(n) {
  const rnd = azar(n * 7919 + 13);
  const R = 8, C = 7, d = (n - 1) / (NIVELES_TOTAL - 1);
  const L = { n, rows: R, cols: C, types: n <= 25 ? 5 : 6, moves: 22, goals: [], web: [], locks: [], mission: null };
  for (let r = 0; r < R; r++) L.web.push(new Array(C).fill(0));
  const tipo = () => Math.floor(rnd.next() * L.types);
  const telas = (capas) => {
    const f = FORMAS_TELARANA[Math.floor(n / 6) % FORMAS_TELARANA.length]; let k = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (f(r, c, R, C)) { L.web[r][c] = capas; k += capas; }
    return k;
  };
  const candados = (k) => {
    const usadas = new Set();
    while (L.locks.length < k) {
      const r = 1 + Math.floor(rnd.next() * (R - 1)), c = Math.floor(rnd.next() * C);
      if (!usadas.has(r * C + c)) { usadas.add(r * C + c); L.locks.push([r, c]); }
    }
  };
  if (n === 1) { L.moves = 20; L.goals = [{ k: 'col', t: 0, n: 12 }]; }
  else if (n === 2) { L.moves = 20; L.goals = [{ k: 'col', t: 4, n: 15 }]; }
  else if (n === 3) { L.moves = 22; L.goals = [{ k: 'col', t: 0, n: 12 }, { k: 'col', t: 3, n: 12 }]; }
  else {
    let kind = ['col', 'web', 'col2', 'score', 'lock', 'webcol'][(n - 4) % 6];
    if (kind === 'lock' && n < 8) kind = 'col';
    if (kind === 'col') { const t = tipo(); L.moves = 22; L.goals = [{ k: 'col', t, n: Math.round(16 + 14 * d) }]; }
    if (kind === 'col2') {
      const t1 = tipo(); let t2 = tipo(); while (t2 === t1) t2 = tipo();
      L.moves = 24; L.goals = [{ k: 'col', t: t1, n: Math.round(12 + 10 * d) }, { k: 'col', t: t2, n: Math.round(12 + 10 * d) }];
    }
    if (kind === 'score') { L.moves = 20; L.goals = [{ k: 'score', n: Math.round((2200 + 2000 * d) / 100) * 100 }]; }
    if (kind === 'web' || kind === 'webcol') {
      const k = telas(n > 36 && n % 2 === 0 ? 2 : 1);
      L.moves = Math.min(36, 19 + Math.ceil(k / 2.4));
      L.goals = [{ k: 'web', n: k }];
      if (kind === 'webcol') { const t = tipo(); L.goals.push({ k: 'col', t, n: Math.round(10 + 8 * d) }); L.moves += 3; }
    }
    if (kind === 'lock') {
      const k = 4 + Math.round(8 * d); candados(k);
      L.moves = 24; L.goals = [{ k: 'lock', n: k }];
      const t = tipo(); L.goals.push({ k: 'col', t, n: 8 });
    }
  }
  if (L.types === 6 && L.goals.some(gl => gl.k !== 'col')) L.moves += 2;   // con 6 tipos cuesta más
  const misiones = [
    { k: 'rayo', n: 1 }, { k: 'cascada', n: 3 }, { k: 'bomba', n: 1 }, { k: 'sobra', n: 3 },
    { k: 'rayo', n: 2 }, { k: 'bola', n: 1 }, { k: 'junta', t: (n * 3) % L.types, n: 25 },
  ];
  L.mission = misiones[(n - 1) % misiones.length];
  if (L.mission.k === 'bola' && n < 6) L.mission = { k: 'rayo', n: 1 };
  return L;
}

// ---------- El tablero ----------
function crearMotor(L, semilla) {
  const R = L.rows, C = L.cols, rnd = azar(semilla || (Date.now() & 0xffffffff));
  let nid = 1;
  const E = {
    L, rows: R, cols: C, types: L.types, grid: [], web: [], moves: L.moves, score: 0,
    got: {}, made: { rayo: 0, bomba: 0, bola: 0 }, maxCombo: 0,
  };
  const g = (r, c) => (r >= 0 && r < R && c >= 0 && c < C ? E.grid[r][c] : null);
  const tt = (r, c) => { const x = g(r, c); return x && x.t >= 0 ? x.t : -1; };
  const nuevo = (t) => ({ id: nid++, t, s: null, lock: false });
  const alAzar = () => Math.floor(rnd.next() * E.types);

  // Tablero inicial sin tríos y con al menos una jugada
  function llenar() {
    for (let r = 0; r < R; r++) {
      E.grid[r] = [];
      for (let c = 0; c < C; c++) {
        let t, k = 0;
        do { t = alAzar(); k++; } while (k < 30 && ((c >= 2 && tt(r, c - 1) === t && tt(r, c - 2) === t) || (r >= 2 && tt(r - 1, c) === t && tt(r - 2, c) === t)));
        E.grid[r][c] = nuevo(t);
      }
    }
  }
  for (let r = 0; r < R; r++) E.web.push(L.web[r].slice());
  do { llenar(); } while (!hayJugada());
  for (const [r, c] of L.locks) E.grid[r][c].lock = true;

  // ---------- Tríos ----------
  function tramos() {
    const out = [];
    for (let r = 0; r < R; r++) {
      let c = 0;
      while (c < C) {
        const t = tt(r, c); let e = c + 1;
        if (t >= 0) while (e < C && tt(r, e) === t) e++;
        if (t >= 0 && e - c >= 3) { const cells = []; for (let k = c; k < e; k++) cells.push([r, k]); out.push({ d: 'h', cells }); }
        c = e;
      }
    }
    for (let c = 0; c < C; c++) {
      let r = 0;
      while (r < R) {
        const t = tt(r, c); let e = r + 1;
        if (t >= 0) while (e < R && tt(e, c) === t) e++;
        if (t >= 0 && e - r >= 3) { const cells = []; for (let k = r; k < e; k++) cells.push([k, c]); out.push({ d: 'v', cells }); }
        r = e;
      }
    }
    return out;
  }
  function hayJugada() {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc; const a = g(r, c), b = g(r2, c2);
        if (!a || !b || a.lock || b.lock) continue;
        if (a.s === 'c' || b.s === 'c' || (a.s && b.s)) return [[r, c], [r2, c2]];
        E.grid[r][c] = b; E.grid[r2][c2] = a;
        const ok = tramos().length > 0;
        E.grid[r][c] = a; E.grid[r2][c2] = b;
        if (ok) return [[r, c], [r2, c2]];
      }
    }
    return null;
  }
  E.pista = hayJugada;

  // ---------- Borrar (con las fichas especiales en cadena) ----------
  const key = (r, c) => r * C + c;
  function zona(tile, r, c) {          // qué borra una ficha especial al saltar
    const out = [];
    if (tile.s === 'h') for (let k = 0; k < C; k++) out.push([r, k]);
    if (tile.s === 'v') for (let k = 0; k < R; k++) out.push([k, c]);
    if (tile.s === 'b') for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push([r + i, c + j]);
    if (tile.s === 'c') {                // bola de cristal: el tipo que más hay
      const n = {}; let best = 0, bt = 0;
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) { const t = tt(i, j); if (t >= 0) { n[t] = (n[t] || 0) + 1; if (n[t] > best) { best = n[t]; bt = t; } } }
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (tt(i, j) === bt) out.push([i, j]);
    }
    return out;
  }
  function borrar(lista, nacen, combo, pasos) {
    const vistos = new Set(), cola = [], quitadas = [], abiertas = [], telas = [], fx = [];
    const meter = (r, c) => { if (r < 0 || r >= R || c < 0 || c >= C) return; const k = key(r, c); if (!vistos.has(k)) { vistos.add(k); cola.push([r, c]); } };
    lista.forEach(([r, c]) => meter(r, c));
    let puntos = 0;
    const tocarTela = (r, c) => { if (E.web[r][c] > 0) { E.web[r][c]--; telas.push({ r, c, v: E.web[r][c] }); puntos += 20; } };
    while (cola.length) {
      const [r, c] = cola.shift(); const tile = E.grid[r][c];
      if (!tile || nacen.has(key(r, c))) continue;
      if (tile.lock) { tile.lock = false; abiertas.push(tile.id); tocarTela(r, c); puntos += 20; continue; }
      quitadas.push({ id: tile.id, r, c, t: tile.t }); E.grid[r][c] = null; tocarTela(r, c);
      if (tile.t >= 0) E.got[tile.t] = (E.got[tile.t] || 0) + 1;
      puntos += 10;
      if (tile.s) { fx.push({ s: tile.s, r, c }); puntos += 40; zona(tile, r, c).forEach(([i, j]) => meter(i, j)); }
    }
    const nacidas = [];
    for (const [k, n] of nacen) {
      const r = Math.floor(k / C), c = k % C, tile = E.grid[r][c];
      if (!tile) continue;
      tile.s = n.s; if (n.s === 'c') tile.t = -1;
      E.made[n.s === 'c' ? 'bola' : n.s === 'b' ? 'bomba' : 'rayo']++;
      nacidas.push({ id: tile.id, s: tile.s, t: tile.t });
    }
    puntos *= combo; E.score += puntos;
    pasos.push({ tipo: 'borrar', quitadas, abiertas, nacidas, telas, fx, combo, puntos, foto: E.foto() });
  }

  // ---------- Caer y rellenar ----------
  function caer(pasos) {
    const caen = [], nuevas = [];
    for (let c = 0; c < C; c++) {
      let w = R - 1;
      for (let r = R - 1; r >= 0; r--) {
        const t = E.grid[r][c];
        if (t) { if (r !== w) { E.grid[w][c] = t; E.grid[r][c] = null; caen.push({ id: t.id, c, de: r, a: w }); } w--; }
      }
      for (let r = w; r >= 0; r--) {
        const t = nuevo(alAzar()); E.grid[r][c] = t;
        nuevas.push({ id: t.id, t: t.t, c, de: r - (w + 1), a: r });
      }
    }
    if (caen.length || nuevas.length) pasos.push({ tipo: 'caer', caen, nuevas });
  }

  // ---------- Resolver tríos en cascada ----------
  function resolver(pasos, pivotes, combo) {
    while (true) {
      const ts = tramos();
      if (!ts.length) break;
      combo++; E.maxCombo = Math.max(E.maxCombo, combo);
      const borra = [], nacen = new Map(), usado = new Set();
      ts.forEach(t => t.cells.forEach(p => borra.push(p)));
      const esPivote = (r, c) => pivotes.some(p => p[0] === r && p[1] === c);
      const elegir = (cells) => {
        const libres = cells.filter(([r, c]) => !E.grid[r][c].s && !nacen.has(key(r, c)));
        if (!libres.length) return null;
        return libres.find(([r, c]) => esPivote(r, c)) || libres[Math.floor(libres.length / 2)];
      };
      ts.forEach((t, i) => { if (t.cells.length >= 5) { const p = elegir(t.cells); if (p) { nacen.set(key(p[0], p[1]), { s: 'c' }); usado.add(i); } } });
      ts.forEach((a, i) => {
        if (usado.has(i) || a.d !== 'h') return;
        ts.forEach((b, j) => {
          if (usado.has(i) || usado.has(j) || b.d !== 'v') return;
          const x = a.cells.find(([r, c]) => b.cells.some(q => q[0] === r && q[1] === c));
          if (x && !E.grid[x[0]][x[1]].s) { nacen.set(key(x[0], x[1]), { s: 'b' }); usado.add(i); usado.add(j); }
        });
      });
      ts.forEach((t, i) => { if (!usado.has(i) && t.cells.length === 4) { const p = elegir(t.cells); if (p) nacen.set(key(p[0], p[1]), { s: t.d }); } });
      borrar(borra, nacen, combo, pasos);
      caer(pasos);
      pivotes = [];
    }
    if (!hayJugada()) mezclar(pasos);
  }
  function mezclar(pasos) {
    let k = 0;
    do {
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const t = E.grid[r][c]; if (t && !t.s && !t.lock) t.t = alAzar(); }
      k++;
    } while (k < 50 && (tramos().length || !hayJugada()));
    const tipos = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const t = E.grid[r][c]; tipos.push({ id: t.id, t: t.t }); }
    pasos.push({ tipo: 'mezclar', tipos });
  }

  // ---------- La jugada ----------
  E.mover = (a, b) => {
    const [r1, c1] = a, [r2, c2] = b;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return null;
    const A = g(r1, c1), B = g(r2, c2);
    if (!A || !B || A.lock || B.lock || E.moves <= 0) return null;
    E.grid[r1][c1] = B; E.grid[r2][c2] = A;
    const pasos = [{ tipo: 'cambiar', a, b, ida: A.id, idb: B.id }];
    const especial = A.s === 'c' || B.s === 'c' || (A.s && B.s);
    if (!especial && !tramos().length) {
      E.grid[r1][c1] = A; E.grid[r2][c2] = B;
      pasos.push({ tipo: 'volver', a, b, ida: A.id, idb: B.id });
      return { pasos, mal: true };
    }
    E.moves--;
    if (especial) {
      // A está ahora en b y B en a
      const zonaR = [], todo = (f) => { for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (f(r, c)) zonaR.push([r, c]); };
      const S = [A.s, B.s].sort().join('');
      const [rb, cb] = b;
      if (S === 'cc') todo(() => true);
      else if (A.s === 'c' || B.s === 'c') {
        const bola = A.s === 'c' ? A : B, otra = bola === A ? B : A, X = otra.t;
        bola.s = null; zonaR.push(bola === A ? b : a);
        if (otra.s) {                      // bola + rayo/bomba: todas las de ese tipo se vuelven especiales
          for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const t = E.grid[r][c]; if (t && t.t === X && !t.lock) { if (!t.s) t.s = otra.s === 'b' ? 'b' : (rnd.next() < 0.5 ? 'h' : 'v'); zonaR.push([r, c]); } }
        } else todo((r, c) => tt(r, c) === X);
      } else {
        A.s = B.s = null; zonaR.push(a, b);
        if (S === 'bb') { for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) zonaR.push([rb + i, cb + j]); }
        else if (S.includes('b')) { for (let i = -1; i <= 1; i++) { for (let k = 0; k < C; k++) zonaR.push([rb + i, k]); for (let k = 0; k < R; k++) zonaR.push([k, cb + i]); } }
        else { for (let k = 0; k < C; k++) zonaR.push([rb, k]); for (let k = 0; k < R; k++) zonaR.push([k, cb]); }
        pasos.push({ tipo: 'combo', s: S, r: rb, c: cb });
      }
      E.maxCombo = Math.max(E.maxCombo, 1);
      borrar(zonaR, new Map(), 1, pasos);
      caer(pasos);
      resolver(pasos, [], 1);
    } else resolver(pasos, [a, b], 0);
    return { pasos };
  };

  // ---------- Cómo vamos ----------
  E.telasQuedan = () => { let k = 0; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) k += E.web[r][c]; return k; };
  E.candadosQuedan = () => { let k = 0; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (E.grid[r][c] && E.grid[r][c].lock) k++; return k; };
  E.foto = () => ({ score: E.score, got: Object.assign({}, E.got), telas: E.telasQuedan(), candados: E.candadosQuedan(), moves: E.moves });
  E.falta = (goal, f) => {                // cuánto falta de un objetivo (0 = hecho)
    f = f || E.foto();
    if (goal.k === 'col') return Math.max(0, goal.n - (f.got[goal.t] || 0));
    if (goal.k === 'web') return f.telas;
    if (goal.k === 'lock') return f.candados;
    if (goal.k === 'score') return Math.max(0, goal.n - f.score);
    return 0;
  };
  E.ganado = () => L.goals.every(gl => E.falta(gl) === 0);
  E.mision = () => {
    const m = L.mission;
    if (m.k === 'rayo') return E.made.rayo >= m.n;
    if (m.k === 'bomba') return E.made.bomba >= m.n;
    if (m.k === 'bola') return E.made.bola >= m.n;
    if (m.k === 'cascada') return E.maxCombo >= m.n;
    if (m.k === 'sobra') return E.ganado() && E.moves >= m.n;
    if (m.k === 'junta') return (E.got[m.t] || 0) >= m.n;
    return false;
  };
  E.estrellas = () => { const f = E.moves / L.moves; return f >= 0.3 ? 3 : f >= 0.12 ? 2 : 1; };
  return E;
}

// ---------- Bot de prueba (para equilibrar los niveles) ----------
function copiarMotor(E, semilla) {
  const F = crearMotor(E.L, semilla);
  F.grid = E.grid.map(row => row.map(t => (t ? Object.assign({}, t) : null)));
  F.web = E.web.map(row => row.slice());
  F.moves = E.moves; F.score = E.score; F.got = Object.assign({}, E.got);
  F.made = Object.assign({}, E.made); F.maxCombo = E.maxCombo;
  return F;
}
function valorJugada(E) {
  let v = E.score / 100;
  for (const gl of E.L.goals) v -= E.falta(gl) * 3;
  return v;
}
function jugarBot(n, semilla, extra) {
  const L = crearNivel(n), E = crearMotor(L, semilla);
  E.moves += extra || 0;
  let pasosBot = 0;
  while (E.moves > 0 && !E.ganado() && pasosBot++ < 80) {
    let mejor = null, mv = -1e9;
    for (let r = 0; r < E.rows; r++) for (let c = 0; c < E.cols; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
      if (r + dr >= E.rows || c + dc >= E.cols) continue;
      const F = copiarMotor(E, semilla + r * 31 + c);
      const res = F.mover([r, c], [r + dr, c + dc]);
      if (!res || res.mal) continue;
      const v = valorJugada(F) + Math.random() * 0.5;
      if (v > mv) { mv = v; mejor = [[r, c], [r + dr, c + dc]]; }
    }
    if (!mejor) break;
    E.mover(mejor[0], mejor[1]);
  }
  return E.ganado();
}
