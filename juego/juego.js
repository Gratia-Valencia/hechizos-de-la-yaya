'use strict';
// 🧙‍♀️ Hechizos de la Yaya · pantallas, dibujos y animaciones.
if (window.NodeList && !NodeList.prototype.forEach) NodeList.prototype.forEach = Array.prototype.forEach;   // Android antiguo
(() => {
  const $ = id => document.getElementById(id);
  const DPR = Math.min(window.devicePixelRatio || 1, 3);

  // ---------- Partida guardada ----------
  const CLAVE = 'hechizos-yaya-v1';
  const POC_MAX = 5, POC_RECARGA = 20 * 60 * 1000, POC_MOVS = 5;
  let G = { nivel: 1, estrellas: {}, pot: 3, potT: Date.now(), k: 1.1, sonido: true, musica: true, ayuda: {} };
  try { Object.assign(G, JSON.parse(localStorage.getItem(CLAVE) || '{}')); } catch (e) {}
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(G)); } catch (e) {} };
  function recargar() {                       // las pociones se recargan solas
    const ahora = Date.now();
    if (G.pot >= POC_MAX) { G.potT = ahora; return; }
    const k = Math.floor((ahora - G.potT) / POC_RECARGA);
    if (k > 0) { G.pot = Math.min(POC_MAX, G.pot + k); G.potT += k * POC_RECARGA; if (G.pot >= POC_MAX) G.potT = ahora; guardar(); }
  }
  const faltaPocion = () => Math.max(1, Math.ceil((POC_RECARGA - (Date.now() - G.potT)) / 60000));

  // ---------- Dibujos (los de Gemini si están; si no, provisionales) ----------
  const FICHAS = [
    { nombre: 'manzanas', uno: 'manzana', emoji: '🍎', color: '#e8323c' },
    { nombre: 'brujas', uno: 'bruja', emoji: '🧙‍♀️', color: '#9b4fd6' },
    { nombre: 'escobas', uno: 'escoba', emoji: '🧹', color: '#a56a35' },
    { nombre: 'calabazas', uno: 'calabaza', emoji: '🎃', color: '#f08a1c' },
    { nombre: 'lunas', uno: 'luna', emoji: '🌙', color: '#f2c81f' },
    { nombre: 'calderos', uno: 'caldero', emoji: null, color: '#3a7fe0' },
  ];
  const OBJ = { bola: '🔮', bomba: '💣', rayo: '⚡', pocion: '🧪', estrella: '⭐', candado: '🔒' };
  const IMG = {};
  const cargar = (k, src) => { const im = new Image(); im.onload = () => { IMG[k] = im; cacheFichas = null; refrescarIconos(); }; im.src = src; };
  FICHAS.forEach((f, i) => cargar('f' + i, `assets/fichas/${i}.png`));
  Object.keys(OBJ).forEach(k => cargar(k, `assets/objetos/${k}.png`));
  ['casilla0', 'casilla1'].forEach(k => { const im = new Image(); im.onload = () => { IMG[k] = im; }; im.src = `assets/ui/${k}.png`; });
  ['portada', 'fondo-mapa', 'fondo-tablero'].forEach(k => {
    const im = new Image(); im.onload = () => {
      IMG[k] = im;
      if (k === 'portada') $('portada').style.backgroundImage = `url(assets/${k}.jpg)`, $('decorPortada').style.visibility = 'hidden';
      if (k === 'fondo-tablero') $('juego').style.backgroundImage = `linear-gradient(#2a184066,#2a184066),url(assets/${k}.jpg)`;
      if (k === 'fondo-mapa') { $('camino').style.background = `url(assets/${k}.jpg) center bottom / 100% auto repeat-y`; if (pantalla === 'mapa') pintarMapa(); }
    };
    im.src = `assets/${k}.jpg`;
  });

  function dibujarFicha(c, i, x, y, s) {       // una ficha en (x,y) = esquina, tamaño s
    const f = FICHAS[i];
    if (IMG['f' + i]) { const m = s * 0.06; c.drawImage(IMG['f' + i], x + m, y + m, s - 2 * m, s - 2 * m); return; }
    const g = c.createRadialGradient(x + s * .4, y + s * .35, s * .05, x + s / 2, y + s / 2, s * .48);
    g.addColorStop(0, '#ffffff55'); g.addColorStop(1, f.color + '55');
    c.fillStyle = g; c.beginPath(); c.arc(x + s / 2, y + s / 2, s * .44, 0, 7); c.fill();
    if (f.emoji) {
      c.font = `${Math.round(s * .62)}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f.emoji, x + s / 2, y + s * .54);
    } else {                                   // caldero provisional
      c.fillStyle = '#1d2f66'; c.beginPath(); c.ellipse(x + s / 2, y + s * .58, s * .3, s * .24, 0, 0, 7); c.fill();
      c.fillStyle = '#3a7fe0'; c.beginPath(); c.ellipse(x + s / 2, y + s * .4, s * .27, s * .08, 0, 0, 7); c.fill();
      c.fillStyle = '#a8d4ff'; [[.4, .3, .06], [.55, .26, .05], [.5, .18, .04]].forEach(([a, b, r]) => { c.beginPath(); c.arc(x + s * a, y + s * b, s * r, 0, 7); c.fill(); });
    }
  }
  function dibujarObjeto(c, k, x, y, s) {
    if (IMG[k]) { c.drawImage(IMG[k], x, y, s, s); return; }
    c.font = `${Math.round(s * .78)}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(OBJ[k], x + s / 2, y + s * .55);
  }
  let cacheFichas = null, cacheTam = 0;
  function fichaCache(i, s) {
    if (!cacheFichas || cacheTam !== s) { cacheFichas = {}; cacheTam = s; }
    if (!cacheFichas[i]) {
      const cv = document.createElement('canvas'); cv.width = cv.height = s;
      const c = cv.getContext('2d');
      if (typeof i === 'number') dibujarFicha(c, i, 0, 0, s); else dibujarObjeto(c, i, 0, 0, s);
      cacheFichas[i] = cv;
    }
    return cacheFichas[i];
  }
  // Iconos para los textos. Con los dibujos de Gemini se usa el archivo directamente:
  // en file:// (Firefox y la app) un lienzo con imágenes no se puede pasar a dataURL.
  const iconoURL = {};
  const rutaIcono = k => typeof k === 'number' ? `assets/fichas/${k}.png` : `assets/objetos/${k}.png`;
  function srcIcono(k) {
    if (IMG[typeof k === 'number' ? 'f' + k : k]) return rutaIcono(k);
    const id = String(k);
    if (!iconoURL[id]) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 96;
      const c = cv.getContext('2d');
      if (typeof k === 'number') dibujarFicha(c, k, 0, 0, 96); else dibujarObjeto(c, k, 0, 0, 96);
      try { iconoURL[id] = cv.toDataURL(); } catch (e) { iconoURL[id] = rutaIcono(k); }
    }
    return iconoURL[id];
  }
  const icono = k => `<img class="icono" data-ico="${k}" src="${srcIcono(k)}" alt="">`;
  function refrescarIconos() {
    document.querySelectorAll('img[data-ico]').forEach(im => {
      const k = /^\d+$/.test(im.dataset.ico) ? +im.dataset.ico : im.dataset.ico;
      im.src = srcIcono(k);
    });
  }

  // ---------- Pantallas y ventanas ----------
  let pantalla = 'portada';
  function ver(id) {
    pantalla = id;
    document.querySelectorAll('.pantalla').forEach(p => p.classList.toggle('ver', p.id === id));
    if (id === 'mapa') pintarMapa();
    if (id === 'juego') requestAnimationFrame(medir);
  }
  let ventanaCerrable = true, alCerrar = null;
  function ventana(html, cerrable = true, cerrar = null) {
    $('ventana').innerHTML = html; $('velo').classList.add('ver'); ventanaCerrable = cerrable; alCerrar = cerrar;
    $('ventana').scrollTop = 0;
  }
  function cerrarVentana() { $('velo').classList.remove('ver'); const f = alCerrar; alCerrar = null; if (f) f(); }
  const ventanaAbierta = () => $('velo').classList.contains('ver');
  $('velo').addEventListener(window.PointerEvent ? 'pointerdown' : 'click', e => { if (e.target === $('velo') && ventanaCerrable) { Sonido.efecto('toque'); cerrarVentana(); } });
  function aviso(txt) {
    const d = document.createElement('div'); d.className = 'aviso'; d.textContent = txt;
    document.body.appendChild(d); setTimeout(() => d.remove(), 1200);
  }
  function aplicarTam() { document.documentElement.style.setProperty('--k', G.k); if (pantalla === 'juego') requestAnimationFrame(medir); }
  aplicarTam(); Sonido.ponerSonido(G.sonido); Sonido.ponerMusica(G.musica);

  // ---------- Ajustes y ayuda ----------
  const TAMS = [[1, 'Normal'], [1.25, 'Grande'], [1.5, 'Muy grande']];
  function ajustes() {
    const op = (sel, val, txt, data) => `<button class="opcion ${sel === val ? 'elegida' : ''}" data-${data}="${val}">${txt}</button>`;
    ventana(`<h2 class="titulo">Ajustes</h2>
      <div class="ajuste"><div>🔠 Tamaño de las letras</div><div class="fila" style="margin:0">
        ${TAMS.map(([v, t]) => `<button class="opcion ${Math.abs(G.k - v) < .01 ? 'elegida' : ''}" data-tam="${v}" style="font-size:${v}rem">${t}</button>`).join('')}</div></div>
      <div class="ajuste"><div>🔔 Sonidos</div><div class="fila" style="margin:0">${op(G.sonido, true, 'Sí', 'son')}${op(G.sonido, false, 'No', 'son')}</div></div>
      <div class="ajuste"><div>🎵 Música</div><div class="fila" style="margin:0">${op(G.musica, true, 'Sí', 'mus')}${op(G.musica, false, 'No', 'mus')}</div></div>
      <div class="fila"><button class="boton morado" id="vAyuda">❓ Cómo se juega</button><button class="boton" id="vCerrar">Cerrar</button></div>`);
    $('ventana').querySelectorAll('[data-tam]').forEach(b => b.onclick = () => { G.k = +b.dataset.tam; guardar(); aplicarTam(); Sonido.efecto('toque'); ajustes(); });
    $('ventana').querySelectorAll('[data-son]').forEach(b => b.onclick = () => { G.sonido = b.dataset.son === 'true'; Sonido.ponerSonido(G.sonido); guardar(); Sonido.efecto('toque'); ajustes(); });
    $('ventana').querySelectorAll('[data-mus]').forEach(b => b.onclick = () => { G.musica = b.dataset.mus === 'true'; Sonido.ponerMusica(G.musica); if (G.musica) Sonido.musica(); guardar(); Sonido.efecto('toque'); ajustes(); });
    $('vAyuda').onclick = () => { Sonido.efecto('toque'); ayuda(); };
    $('vCerrar').onclick = () => { Sonido.efecto('toque'); cerrarVentana(); };
  }
  function ayuda(volver) {
    ventana(`<h2 class="titulo">Cómo se juega</h2><ul class="lista">
      <li>${icono(0)}<span>Desliza una ficha hacia la de al lado para juntar <b>3 o más iguales</b>.</span></li>
      <li>${icono('rayo')}<span><b>4 en fila</b>: sale un <b>rayo</b>, que borra toda la fila o la columna.</span></li>
      <li>${icono('bomba')}<span><b>En forma de L o de T</b>: sale una <b>bomba</b>, que explota alrededor.</span></li>
      <li>${icono('bola')}<span><b>5 en fila</b>: sale una <b>bola de cristal</b>. Muévela hacia una ficha y borra todas las de ese tipo.</span></li>
      <li>✨<span>Junta <b>dos especiales</b> para un hechizo enorme.</span></li>
      <li>${icono('pocion')}<span>La <b>poción</b> da <b>5 movimientos más</b>. Se recargan solas (una cada 20 minutos) y ganas una al cumplir la <b>misión</b> del nivel.</span></li>
      <li>🕸️<span><b>Telarañas</b>: haz tríos encima para quitarlas.</span></li>
      <li>${icono('candado')}<span><b>Candados</b>: la ficha no se mueve. Haz un trío con ella para abrirlo.</span></li>
      <li>💡<span>Si no ves ninguna jugada, toca <b>Pista</b>. ¡Sin prisas: no hay reloj!</span></li></ul>
      <div class="fila"><button class="boton" id="vOk">¡Entendido!</button></div>`, true, volver || null);
    $('vOk').onclick = () => { Sonido.efecto('toque'); cerrarVentana(); };
  }

  // ---------- Portada ----------
  $('bJugar').onclick = () => { Sonido.init(); if (G.musica) Sonido.musica(); Sonido.efecto('toque'); ver('mapa');
    if (!G.ayuda.inicio) { G.ayuda.inicio = 1; guardar(); ayuda(); } };
  $('bAjustesPortada').onclick = () => { Sonido.init(); Sonido.efecto('toque'); ajustes(); };

  // ---------- Mapa ----------
  function textoPociones() {
    recargar();
    return `${icono('pocion')} ${G.pot}${G.pot < POC_MAX ? ` <small>⏳${faltaPocion()}′</small>` : ''}`;
  }
  function pintarMapa() {
    $('pocMapa').innerHTML = textoPociones();
    const paso = 6.5 * 17 * G.k, alto = (NIVELES_TOTAL + 1) * paso + 3 * paso;
    const cam = $('camino'); cam.style.height = alto + 'px';
    const w = $('scroll').clientWidth || 360;
    const pos = n => ({ x: 0.5 + Math.sin(n * 0.85) * 0.28, y: alto - (n + 0.6) * paso });
    let html = '', pts = [];
    const deco = ['🌲', '🍄', '🎃', '🏡', '🌳', '🦉', '🍄', '🌲', '🕯️', '🐈‍⬛'];
    if (!IMG['fondo-mapa']) for (let k = 0; k < NIVELES_TOTAL * 1.4; k++) {
      const n = k / 1.4 + 0.3, p = pos(n), lado = k % 2 ? 1 : -1;
      const x = Math.min(0.92, Math.max(0.03, p.x + lado * (0.28 + ((k * 37) % 10) / 60)));
      html += `<div class="deco" style="left:${x * 100}%;top:${p.y - 20}px">${deco[k % deco.length]}</div>`;
    }
    for (let n = 1; n <= NIVELES_TOTAL; n++) {
      const p = pos(n); pts.push(`${p.x * w},${p.y}`);
      const est = G.estrellas[n] || 0, abierto = n <= G.nivel, actual = n === G.nivel;
      const cls = !abierto ? 'cerrado' : est ? 'hecho' : '';
      const st = est ? `<div class="estrellas">${[1, 2, 3].map(i => `<span class="${i <= est ? 'on' : 'off'}">★</span>`).join('')}</div>` : '';
      html += `<button class="nodo ${cls} ${actual ? 'actual' : ''}" data-n="${n}" style="left:${p.x * 100}%;top:${p.y}px">${abierto ? n : '🔒'}${actual ? '<div class="marca">🧙‍♀️</div>' : ''}${st}</button>`;
    }
    cam.innerHTML = `<svg viewBox="0 0 ${w} ${alto}" preserveAspectRatio="none"><polyline points="${pts.join(' ')}" fill="none" stroke="#f3e2c0" stroke-opacity=".55" stroke-width="${10 * G.k}" stroke-dasharray="${2 * G.k} ${16 * G.k}" stroke-linecap="round"/></svg>` + html;
    cam.querySelectorAll('.nodo').forEach(b => b.onclick = () => {
      const n = +b.dataset.n; Sonido.efecto('toque');
      if (n > G.nivel) { aviso('🔒 Aún no'); return; }
      presentarNivel(n);
    });
    const yAct = pos(G.nivel).y;
    $('scroll').scrollTop = yAct - $('scroll').clientHeight * 0.55;
  }
  $('bMapaAtras').onclick = () => { Sonido.efecto('toque'); ver('portada'); };
  $('bAjustesMapa').onclick = () => { Sonido.efecto('toque'); ajustes(); };
  setInterval(() => { if (pantalla === 'mapa') $('pocMapa').innerHTML = textoPociones(); if (pantalla === 'juego') pintarPocion(); }, 30000);

  // ---------- Textos de objetivos y misiones ----------
  function textoMeta(gl, falta) {
    if (gl.k === 'col') return `${icono(gl.t)}<span>${falta}</span>`;
    if (gl.k === 'web') return `🕸️<span>${falta}</span>`;
    if (gl.k === 'lock') return `${icono('candado')}<span>${falta}</span>`;
    if (gl.k === 'score') return `⭐<span>${falta.toLocaleString('es-ES')}</span>`;
  }
  function fraseMeta(gl) {
    if (gl.k === 'col') return `Junta <b>${gl.n}</b> ${FICHAS[gl.t].nombre}`;
    if (gl.k === 'web') return `Quita <b>${gl.n}</b> ${gl.n === 1 ? 'telaraña' : 'telarañas'}`;
    if (gl.k === 'lock') return `Abre los <b>${gl.n}</b> candados`;
    if (gl.k === 'score') return `Consigue <b>${gl.n.toLocaleString('es-ES')}</b> puntos`;
  }
  function iconoMeta(gl) { return gl.k === 'col' ? icono(gl.t) : gl.k === 'lock' ? icono('candado') : gl.k === 'web' ? '🕸️' : '⭐'; }
  function fraseMision(m) {
    if (m.k === 'rayo') return m.n === 1 ? 'Haz un rayo ⚡' : `Haz ${m.n} rayos ⚡`;
    if (m.k === 'bomba') return 'Haz una bomba 💣';
    if (m.k === 'bola') return 'Haz una bola de cristal 🔮';
    if (m.k === 'cascada') return `Consigue ${m.n} tríos seguidos que caen solos`;
    if (m.k === 'sobra') return `Termina con ${m.n} movimientos o más`;
    if (m.k === 'junta') return `Junta ${m.n} ${FICHAS[m.t].nombre}`;
  }

  // ---------- Empezar un nivel ----------
  let L = null, E = null;
  function presentarNivel(n) {
    const Lv = crearNivel(n);
    const est = G.estrellas[n] || 0;
    ventana(`<h2 class="titulo">Nivel ${n}</h2>
      ${est ? `<div class="grandes">${[1, 2, 3].map(i => `<span class="${i <= est ? 'on' : 'off'}">★</span>`).join('')}</div>` : ''}
      <ul class="lista">${Lv.goals.map(gl => `<li>${iconoMeta(gl)}<span>${fraseMeta(gl)}</span></li>`).join('')}
        <li>👣<span>Tienes <b>${Lv.moves}</b> movimientos</span></li>
        <li>${icono('pocion')}<span><b>Misión</b>: ${fraseMision(Lv.mission)} y ganas una poción</span></li></ul>
      <div class="fila"><button class="boton gris" id="vVolver">Volver</button><button class="boton verde" id="vEmpezar">¡Empezar!</button></div>`);
    $('vVolver').onclick = () => { Sonido.efecto('toque'); cerrarVentana(); };
    $('vEmpezar').onclick = () => { Sonido.efecto('toque'); cerrarVentana(); empezar(n); };
  }
  let usadas = 0;
  function empezar(n) {
    L = crearNivel(n); E = crearMotor(L); usadas = 0;
    $('nombreNivel').textContent = 'Nivel ' + n;
    crearSprites(); ver('juego'); pintarHud(E.foto()); pintarPocion();
    medir(); dibujar(performance.now());
    ocupado = false; ultimoToque = performance.now();
    const primeras = { 1: 'Desliza una ficha para juntar 3 iguales', 5: 'Las telarañas se quitan haciendo tríos encima' };
    if (L.goals.some(gl => gl.k === 'web') && !G.ayuda.web) { G.ayuda.web = 1; guardar(); setTimeout(() => aviso('🕸️ ¡Haz tríos encima!'), 400); }
    if (L.goals.some(gl => gl.k === 'lock') && !G.ayuda.lock) { G.ayuda.lock = 1; guardar(); setTimeout(() => aviso('🔒 ¡Haz trío con ellas!'), 400); }
    if (n === 1 && !G.ayuda.n1) { G.ayuda.n1 = 1; guardar(); setTimeout(() => { mostrarPista(); aviso('👆 Desliza una ficha'); }, 600); }
  }

  // ---------- HUD ----------
  let fotoHud = null;
  function pintarHud(f) {
    const antes = fotoHud; fotoHud = f;
    $('movs').textContent = E.moves;
    $('metas').innerHTML = L.goals.map(gl => { const fa = E.falta(gl, f); return `<div class="meta ${fa === 0 ? 'hecha' : ''}">${fa === 0 ? (gl.k === 'col' ? icono(gl.t) : iconoMeta(gl)) + '<span>✔</span>' : textoMeta(gl, fa)}</div>`; }).join('');
    const ok = E.mision();
    $('mision').className = 'mision' + (ok ? ' hecha' : '');
    $('mision').innerHTML = `${ok ? '✅' : '🎯'} Misión: ${fraseMision(L.mission)} → ${icono('pocion')}`;
  }
  function pintarPocion() {
    recargar();
    $('bPocion').innerHTML = `${icono('pocion')} +${POC_MOVS} <small style="font-weight:500">(${G.pot})</small>`;
  }
  function usarPocion() {
    recargar();
    if (G.pot <= 0) { aviso(`⏳ ${faltaPocion()} min`); Sonido.efecto('mal'); return false; }
    if (G.pot >= POC_MAX) G.potT = Date.now();
    G.pot--; usadas++; guardar(); E.moves += POC_MOVS;
    Sonido.efecto('pocion'); aviso(`+${POC_MOVS} movimientos`);
    pintarHud(E.foto()); pintarPocion();
    $('movs').classList.remove('brilla'); void $('movs').offsetWidth; $('movs').classList.add('brilla');
    return true;
  }
  $('bPocion').onclick = () => { if (ocupado || !E) return; if (E.ganado()) return; usarPocion(); };
  $('bPista').onclick = () => { Sonido.efecto('toque'); mostrarPista(); };
  $('bJuegoAtras').onclick = () => { Sonido.efecto('toque'); pausa(); };
  $('bAjustesJuego').onclick = () => { Sonido.efecto('toque'); ajustes(); };
  function pausa() {
    ventana(`<h2 class="titulo">Pausa</h2><p>¿Qué quieres hacer?</p>
      <div class="fila" style="flex-direction:column;align-items:center">
        <button class="boton verde" id="vSeguir">▶ Seguir jugando</button>
        <button class="boton morado" id="vOtraVez">🔄 Empezar otra vez</button>
        <button class="boton gris" id="vMapa">🗺️ Volver al mapa</button></div>`);
    $('vSeguir').onclick = () => { Sonido.efecto('toque'); cerrarVentana(); };
    $('vOtraVez').onclick = () => { Sonido.efecto('toque'); cerrarVentana(); empezar(L.n); };
    $('vMapa').onclick = () => { Sonido.efecto('toque'); cerrarVentana(); ver('mapa'); };
  }

  // ---------- Final del nivel ----------
  function ganar() {
    const n = L.n, est = E.estrellas(), mision = E.mision();
    G.estrellas[n] = Math.max(G.estrellas[n] || 0, est);
    if (n === G.nivel && n < NIVELES_TOTAL) G.nivel = n + 1;
    if (mision) G.pot++;
    guardar(); Sonido.efecto('gana');
    const frases = ['¡Lo has conseguido!', '¡Qué bien lo haces!', '¡Eres una bruja estupenda!', '¡Magia pura!', '¡Bravo, yaya!'];
    ventana(`<h2 class="titulo">${frases[n % frases.length]}</h2>
      <div class="grandes" id="vEst">${[1, 2, 3].map(() => '<span class="off">★</span>').join('')}</div>
      <p>Puntos: <b>${E.score.toLocaleString('es-ES')}</b></p>
      <p>${mision ? `✅ ¡Misión cumplida! Ganas una poción ${icono('pocion')}` : `Misión sin hacer: ${fraseMision(L.mission)}`}</p>
      ${n === NIVELES_TOTAL ? '<p>🏆 ¡Has terminado los 50 niveles del bosque encantado!</p>' : ''}
      <div class="fila"><button class="boton gris" id="vMapa">🗺️ Mapa</button>
      ${n < NIVELES_TOTAL ? '<button class="boton verde" id="vSig">Siguiente ▶</button>' : ''}</div>`, false);
    const sp = $('vEst').children;
    for (let i = 0; i < est; i++) setTimeout(() => { sp[i].className = 'on brilla'; Sonido.efecto('estrella'); }, 400 + i * 350);
    $('vMapa').onclick = () => { Sonido.efecto('toque'); cerrarVentana(); ver('mapa'); };
    if ($('vSig')) $('vSig').onclick = () => { Sonido.efecto('toque'); cerrarVentana(); presentarNivel(n + 1); };
  }
  function sinMovimientos() {
    recargar();
    Sonido.efecto('pierde');
    const hay = G.pot > 0;
    ventana(`<h2 class="titulo">¡Casi!</h2>
      <p>Te has quedado sin movimientos.</p>
      <ul class="lista">${L.goals.filter(gl => E.falta(gl) > 0).map(gl => `<li>${iconoMeta(gl)}<span>Faltan <b>${E.falta(gl).toLocaleString('es-ES')}</b></span></li>`).join('')}</ul>
      ${hay ? `<p>¿Usas una poción para tener <b>${POC_MOVS} movimientos más</b>? Te quedan ${G.pot}.</p>`
            : `<p>No te quedan pociones. La siguiente llega en <b>${faltaPocion()} minutos</b>.</p>`}
      <div class="fila" style="flex-direction:column;align-items:center">
        ${hay ? `<button class="boton verde" id="vPocion">${icono('pocion')} Usar una poción</button>` : ''}
        <button class="boton morado" id="vOtraVez">🔄 Empezar otra vez</button>
        <button class="boton gris" id="vMapa">🗺️ Volver al mapa</button></div>`, false);
    if ($('vPocion')) $('vPocion').onclick = () => { cerrarVentana(); usarPocion(); };
    $('vOtraVez').onclick = () => { Sonido.efecto('toque'); cerrarVentana(); empezar(L.n); };
    $('vMapa').onclick = () => { Sonido.efecto('toque'); cerrarVentana(); ver('mapa'); };
  }

  // ---------- Tablero: medidas ----------
  const cv = $('lienzo'), cx = cv.getContext('2d');
  let cs = 40, W = 0, H = 0;
  function medir() {
    if (!L) return;
    const box = $('tablero'), bw = box.clientWidth - 12, bh = box.clientHeight - 12;
    cs = Math.max(20, Math.floor(Math.min(bw / (L.cols + 1.3), bh / (L.rows + 1.3))));   // deja sitio para el marco
    W = cs * L.cols; H = cs * L.rows;
    $('marco').style.borderWidth = Math.round(cs * .65) + 'px';
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cacheFichas = null;
  }
  window.addEventListener('resize', () => { if (pantalla === 'juego') medir(); if (pantalla === 'mapa') pintarMapa(); });

  // ---------- Sprites y animaciones ----------
  let sprites = new Map(), dweb = [], parts = [], rayos = [], flotan = [], tweens = [];
  function crearSprites() {
    sprites = new Map(); parts = []; rayos = []; flotan = []; tweens = [];
    dweb = E.web.map(r => r.slice());
    for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
      const t = E.grid[r][c]; sprites.set(t.id, { id: t.id, t: t.t, s: t.s, lock: t.lock, x: c, y: r, sc: 1, a: 1 });
    }
  }
  const ease = { lineal: k => k, sale: k => 1 - (1 - k) * (1 - k), rebote: k => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + .75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + .9375; return n * (k -= 2.625 / d) * k + .984375; } };
  function tween(o, k, a, b, dur, e = 'sale') { tweens.push({ o, k, a, b, t0: performance.now(), dur, e: ease[e] }); o[k] = a; }
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const centro = (r, c) => [(c + .5) * cs, (r + .5) * cs];
  function chispas(r, c, color, n = 8) {
    const [x, y] = centro(r, c);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, v = (.6 + Math.random()) * cs * 2.2; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - cs, vida: .6, t: 0, color, r: cs * (.05 + Math.random() * .05) }); }
  }
  const FRASES_COMBO = ['', '', '¡Bien!', '¡Muy bien!', '¡Estupendo!', '¡Mágico!', '¡Hechizo total!'];

  // Sin async/await, para que funcione en móviles con Android antiguo.
  function reproducir(pasos) {
    let cadena = Promise.resolve();
    pasos.forEach(p => { cadena = cadena.then(() => reproducirPaso(p)); });
    return cadena;
  }
  function reproducirPaso(p) {
    {
      if (p.tipo === 'cambiar' || p.tipo === 'volver') {
        const A = sprites.get(p.ida), B = sprites.get(p.idb);
        const [ra, ca] = p.tipo === 'cambiar' ? p.b : p.a, [rb, cb] = p.tipo === 'cambiar' ? p.a : p.b;
        tween(A, 'x', A.x, ca, 150); tween(A, 'y', A.y, ra, 150); tween(B, 'x', B.x, cb, 150); tween(B, 'y', B.y, rb, 150);
        Sonido.efecto(p.tipo === 'cambiar' ? 'cambiar' : 'mal');
        return espera(170);
      } else if (p.tipo === 'combo') {
        Sonido.efecto('especial'); aviso('✨ ¡Hechizo doble! ✨');
      } else if (p.tipo === 'borrar') {
        let sx = 0, sy = 0;
        for (const q of p.quitadas) {
          const s = sprites.get(q.id); if (!s) continue;
          tween(s, 'sc', 1, .2, 200); tween(s, 'a', 1, 0, 200); s.muere = true;
          chispas(q.r, q.c, q.t >= 0 ? FICHAS[q.t].color : '#fff', 6); sx += q.c; sy += q.r;
        }
        for (const q of p.nacidas) { const s = sprites.get(q.id); if (s) { s.s = q.s; s.t = q.t; tween(s, 'sc', 1.6, 1, 260, 'rebote'); } }
        for (const id of p.abiertas) { const s = sprites.get(id); if (s) { s.lock = false; tween(s, 'sc', 1.3, 1, 220); chispas(s.y, s.x, '#ffd34d', 10); } }
        for (const w of p.telas) { dweb[w.r][w.c] = w.v; chispas(w.r, w.c, '#ffffff', 5); }
        for (const f of p.fx) {
          rayos.push({ s: f.s, r: f.r, c: f.c, t: 0 });
          Sonido.efecto(f.s === 'b' ? 'bomba' : f.s === 'c' ? 'bola' : 'rayo');
        }
        if (p.nacidas.length) Sonido.efecto('especial');
        Sonido.efecto('trio', p.combo);
        if (p.quitadas.length) { const n = p.quitadas.length; flotan.push({ txt: '+' + p.puntos, x: (sx / n + .5) * cs, y: (sy / n + .5) * cs, t: 0 }); }
        if (p.combo >= 2) aviso(FRASES_COMBO[Math.min(p.combo, FRASES_COMBO.length - 1)]);
        pintarHud(p.foto);
        return espera(230).then(() => { for (const q of p.quitadas) sprites.delete(q.id); });
      } else if (p.tipo === 'caer') {
        let max = 0;
        for (const q of p.caen) { const s = sprites.get(q.id); if (!s) continue; const d = 140 + 70 * Math.sqrt(q.a - q.de); tween(s, 'y', q.de, q.a, d, 'rebote'); max = Math.max(max, d); }
        for (const q of p.nuevas) { const s = { id: q.id, t: q.t, s: null, lock: false, x: q.c, y: q.de, sc: 1, a: 1 }; sprites.set(q.id, s); const d = 140 + 70 * Math.sqrt(q.a - q.de); tween(s, 'y', q.de, q.a, d, 'rebote'); max = Math.max(max, d); }
        return espera(max + 20);
      } else if (p.tipo === 'mezclar') {
        aviso('🔮 ¡A remover el caldero!');
        return espera(500).then(() => {
          for (const q of p.tipos) { const s = sprites.get(q.id); if (s) { s.t = q.t; tween(s, 'sc', .3, 1, 300, 'rebote'); } }
          return espera(350);
        });
      }
    }
    return Promise.resolve();
  }

  // ---------- Dibujar el tablero ----------
  function dibujarTela(x, y, s, capas) {
    cx.save(); cx.strokeStyle = capas > 1 ? '#ffffffd0' : '#ffffff99'; cx.lineWidth = Math.max(1, s * (capas > 1 ? .035 : .025));
    const mx = x + s / 2, my = y + s / 2;
    cx.fillStyle = capas > 1 ? '#ffffff38' : '#ffffff1f'; cx.fillRect(x + 1, y + 1, s - 2, s - 2);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cx.beginPath(); cx.moveTo(mx, my); cx.lineTo(mx + Math.cos(a) * s * .5, my + Math.sin(a) * s * .5); cx.stroke(); }
    for (const k of [.16, .3, .44]) { cx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4; const px = mx + Math.cos(a) * s * k, py = my + Math.sin(a) * s * k; i ? cx.lineTo(px, py) : cx.moveTo(px, py); } cx.stroke(); }
    cx.restore();
  }
  let seleccion = null, pistaPar = null, pistaT = 0;
  function dibujar(ahora) {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0); cx.clearRect(0, 0, W, H);
    // fondo del tablero
    cx.fillStyle = '#2a1a3ecc'; cx.fillRect(0, 0, W, H);
    for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
      const cas = IMG[(r + c) % 2 ? 'casilla1' : 'casilla0'];
      if (cas) cx.drawImage(cas, c * cs + 1, r * cs + 1, cs - 2, cs - 2);
      else { cx.fillStyle = (r + c) % 2 ? '#ffffff10' : '#ffffff1c'; cx.fillRect(c * cs + 2, r * cs + 2, cs - 4, cs - 4); }
      if (dweb[r][c] > 0) dibujarTela(c * cs, r * cs, cs, dweb[r][c]);
    }
    const s = Math.round(cs * DPR);
    for (const sp of sprites.values()) {
      let sc = sp.sc;
      if (pistaPar && pistaPar.some(([r, c]) => Math.round(sp.x) === c && Math.round(sp.y) === r && !sp.muere)) sc *= 1 + .1 * Math.sin(ahora / 140);
      const x = sp.x * cs, y = sp.y * cs, d = cs * sc;
      cx.globalAlpha = sp.a;
      if (seleccion && seleccion[0] === Math.round(sp.y) && seleccion[1] === Math.round(sp.x)) {
        cx.fillStyle = '#ffe68a55'; cx.beginPath(); cx.arc(x + cs / 2, y + cs / 2, cs * .5, 0, 7); cx.fill();
      }
      if (sp.s === 'h' || sp.s === 'v') {          // brillo del rayo
        const g = cx.createLinearGradient(...(sp.s === 'h' ? [x, 0, x + cs, 0] : [0, y, 0, y + cs]));
        g.addColorStop(0, '#ffd74000'); g.addColorStop(.5, '#ffd740aa'); g.addColorStop(1, '#ffd74000');
        cx.fillStyle = g;
        if (sp.s === 'h') cx.fillRect(x, y + cs * .38, cs, cs * .24); else cx.fillRect(x + cs * .38, y, cs * .24, cs);
      }
      if (sp.s === 'b') { cx.strokeStyle = `rgba(255,120,200,${.6 + .3 * Math.sin(ahora / 200)})`; cx.lineWidth = cs * .07; cx.beginPath(); cx.arc(x + cs / 2, y + cs / 2, cs * .44, 0, 7); cx.stroke(); }
      const img = sp.s === 'c' ? fichaCache('bola', s) : fichaCache(sp.t, s);
      cx.drawImage(img, x + (cs - d) / 2, y + (cs - d) / 2, d, d);
      if (sp.s === 'h' || sp.s === 'v' || sp.s === 'b') {
        const k = sp.s === 'b' ? 'bomba' : 'rayo', bs = cs * .42;
        cx.drawImage(fichaCache(k, s), x + cs - bs - cs * .02, y + cs * .02, bs, bs);
        if (sp.s !== 'b') { cx.fillStyle = '#fff'; cx.font = `700 ${cs * .22}px Fredoka,sans-serif`; cx.textAlign = 'center'; cx.fillText(sp.s === 'h' ? '↔' : '↕', x + cs * .2, y + cs * .2); }
      }
      if (sp.lock) {
        cx.strokeStyle = '#c9a24a'; cx.lineWidth = cs * .06;
        cx.beginPath(); cx.moveTo(x + cs * .1, y + cs * .1); cx.lineTo(x + cs * .9, y + cs * .9); cx.moveTo(x + cs * .9, y + cs * .1); cx.lineTo(x + cs * .1, y + cs * .9); cx.stroke();
        const ls = cs * .46; cx.drawImage(fichaCache('candado', s), x + (cs - ls) / 2, y + cs - ls * .95, ls, ls);
      }
      cx.globalAlpha = 1;
    }
    // rayos, bombas y bolas
    rayos = rayos.filter(f => f.t < .45);
    for (const f of rayos) {
      const k = 1 - f.t / .45; cx.globalAlpha = k;
      const [x, y] = centro(f.r, f.c);
      if (f.s === 'h' || f.s === 'v') {
        cx.fillStyle = '#fff6b0';
        if (f.s === 'h') cx.fillRect(0, y - cs * .18 * k, W, cs * .36 * k); else cx.fillRect(x - cs * .18 * k, 0, cs * .36 * k, H);
      } else if (f.s === 'b') { cx.strokeStyle = '#ff9ad5'; cx.lineWidth = cs * .2 * k; cx.beginPath(); cx.arc(x, y, cs * (.5 + 1.2 * (1 - k)), 0, 7); cx.stroke(); }
      else { cx.fillStyle = '#d6b3ff55'; cx.fillRect(0, 0, W, H); }
      cx.globalAlpha = 1;
    }
    // chispas
    for (const p of parts) { cx.globalAlpha = Math.max(0, 1 - p.t / p.vida); cx.fillStyle = p.color; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill(); }
    cx.globalAlpha = 1;
    // puntos que suben
    flotan = flotan.filter(f => f.t < 1);
    cx.textAlign = 'center'; cx.font = `700 ${Math.round(cs * .42)}px Fredoka,sans-serif`;
    for (const f of flotan) { cx.globalAlpha = 1 - f.t; cx.fillStyle = '#fff1b0'; cx.strokeStyle = '#3a1d63'; cx.lineWidth = cs * .08; cx.strokeText(f.txt, f.x, f.y - f.t * cs); cx.fillText(f.txt, f.x, f.y - f.t * cs); }
    cx.globalAlpha = 1;
  }
  let antes = performance.now();
  function bucle(ahora) {
    const dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora;
    tweens = tweens.filter(tw => { const k = Math.min(1, (ahora - tw.t0) / tw.dur); tw.o[tw.k] = tw.a + (tw.b - tw.a) * tw.e(k); return k < 1; });
    parts = parts.filter(p => (p.t += dt) < p.vida); parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += cs * 9 * dt; });
    rayos.forEach(f => f.t += dt); flotan.forEach(f => f.t += dt * 1.2);
    if (pantalla === 'juego' && L) {
      dibujar(ahora);
      if (!ocupado && !ventanaAbierta() && !pistaPar && ahora - ultimoToque > 7000) mostrarPista();
    }
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);

  // ---------- Tocar y deslizar ----------
  let ocupado = false, ultimoToque = 0, arrastre = null;
  function mostrarPista() { if (!E || ocupado) return; pistaPar = E.pista(); }
  function celda(e) {
    const b = cv.getBoundingClientRect();
    const c = Math.floor((e.clientX - b.left) / cs), r = Math.floor((e.clientY - b.top) / cs);
    return r >= 0 && r < L.rows && c >= 0 && c < L.cols ? [r, c] : null;
  }
  const tocar = (tipo, f) => {       // con pointer events si los hay; si no (Android antiguo), con toques
    if (window.PointerEvent) { cv.addEventListener('pointer' + tipo, f); return; }
    const ev = { down: 'touchstart', move: 'touchmove', up: 'touchend', cancel: 'touchcancel' }[tipo];
    cv.addEventListener(ev, e => { const t = e.changedTouches[0]; e.preventDefault(); f({ clientX: t.clientX, clientY: t.clientY, pointerId: 0 }); }, { passive: false });
    if (tipo !== 'cancel') cv.addEventListener({ down: 'mousedown', move: 'mousemove', up: 'mouseup' }[tipo], f);
  };
  tocar('down', e => {
    if (ocupado || !E || ventanaAbierta()) return;
    Sonido.init(); ultimoToque = performance.now(); pistaPar = null;
    const p = celda(e); if (!p) return;
    const t = E.grid[p[0]][p[1]];
    if (t && t.lock) { Sonido.efecto('mal'); aviso('🔒 Está cerrada'); return; }
    if (seleccion && Math.abs(seleccion[0] - p[0]) + Math.abs(seleccion[1] - p[1]) === 1) { const a = seleccion; seleccion = null; jugar(a, p); return; }
    seleccion = p; Sonido.efecto('toque');
    arrastre = { p, x: e.clientX, y: e.clientY };
    try { if (cv.setPointerCapture && window.PointerEvent) cv.setPointerCapture(e.pointerId); } catch (er) {}
  });
  tocar('move', e => {
    if (!arrastre || ocupado) return;
    const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < cs * .35) return;
    const [r, c] = arrastre.p, q = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
    arrastre = null; seleccion = null;
    if (q[0] < 0 || q[0] >= L.rows || q[1] < 0 || q[1] >= L.cols) return;
    jugar([r, c], q);
  });
  tocar('up', () => { arrastre = null; });
  tocar('cancel', () => { arrastre = null; });

  function jugar(a, b) {
    const res = E.mover(a, b);
    if (!res) { Sonido.efecto('mal'); if (E.grid[b[0]][b[1]] && E.grid[b[0]][b[1]].lock) aviso('🔒 Está cerrada'); return; }
    ocupado = true; pistaPar = null;
    return reproducir(res.pasos).then(() => {
      ocupado = false; ultimoToque = performance.now();
      pintarHud(E.foto());
      if (res.mal) return;
      if (E.ganado()) { ocupado = true; return espera(500).then(() => { ocupado = false; ganar(); }); }
      if (E.moves <= 0) return espera(400).then(sinMovimientos);
    });
  }

  // ---------- Botón atrás del móvil y pausa ----------
  window.onBack = () => {
    if (ventanaAbierta()) { if (ventanaCerrable) cerrarVentana(); return 'ok'; }
    if (pantalla === 'juego') { pausa(); return 'ok'; }
    if (pantalla === 'mapa') { ver('portada'); return 'ok'; }
    return 'exit';
  };
  window.onAppPause = () => { guardar(); Sonido.pausa(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) Sonido.pausa(); else Sonido.seguir(); });

  // ---------- Pruebas (solo para capturas) ----------
  const h = location.hash;
  if (h.startsWith('#prueba')) document.documentElement.classList.add('prueba');
  if (h.startsWith('#prueba-mapa')) { G.nivel = 9; G.estrellas = { 1: 3, 2: 2, 3: 3, 4: 1, 5: 2, 6: 3, 7: 3, 8: 2 }; ver('mapa'); }
  else if (h.startsWith('#prueba-nivel-')) {
    const n = parseInt(h.slice(14)) || 1; empezar(n);
    if (h.includes('-intro')) presentarNivel(n);
    if (h.includes('-esp')) {                   // poner especiales para verlos
      const pon = (r, c, s) => { const t = E.grid[r][c]; t.s = s; if (s === 'c') t.t = -1; const sp = sprites.get(t.id); sp.s = s; sp.t = t.t; };
      pon(2, 1, 'h'); pon(3, 4, 'v'); pon(5, 2, 'b'); pon(6, 5, 'c');
    }
    if (h.includes('-gana')) setTimeout(ganar, 300);
    if (h.includes('-sin')) { E.moves = 0; setTimeout(sinMovimientos, 300); }
    if (h.includes('-jugar')) {                 // el bot juega unas jugadas con animación
      let k = 0; const otra = () => { if (k++ >= 4) return; espera(300).then(() => { const p = E.pista(); return p ? jugar(p[0], p[1]) : null; }).then(otra); }; otra();
    }
  }
  else if (h.startsWith('#prueba-ajustes')) { ajustes(); }
  else if (h.startsWith('#prueba-ayuda')) { ayuda(); }
  else ver('portada');
  if (!h.startsWith('#prueba-nivel') && !h.startsWith('#prueba-mapa')) ver('portada');
})();
