// Aia Taumastica — un palcoscenico buio, in attesa. Una luce per sezione.
//
// La telecamera è lo #stage: GSAP lo sposta (x, y, z) per avvicinarsi a ogni
// luce e tornare al campo largo; alla fine lo inclina per guardare la platea
// dall'alto. Una sola timeline, il cui "tempo" è in unità di scroll: i numeri
// sotto si leggono come battute. Le coordinate delle luci stanno nel CSS (--x, --z).
//
// Non c'è scroll nativo: rotella, trackpad e dito muovono la scena (scorrimento
// continuo, con smorzatura e velocità massima), e quando ci si ferma la scena si
// assesta sempre su una pagina. I collegamenti (menu, puntini, Prenota) NON
// attraversano le animazioni: il sipario si chiude, si salta alla luce richiesta
// e si riapre.

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => gsap.utils.toArray(sel, root);

const root     = document.documentElement;
const scene    = $('#scene');
const backdrop = $('#backdrop');
const viewport = $('#viewport');
const stage    = $('#stage');
const platea   = $('#platea');
const seats    = $('#seats');
const form     = $('.prenota-form', platea);
const seatState = { a: 0 }; // opacità dei posti (animata dalla timeline)
const ghost    = $('.ghost-light');
const dust     = $('#dust');
const curtains = $$('.curtain');
const hero     = $('.hero');
const hint     = $('.scroll-hint');
const header   = $('.site-header');
const menuBtn  = $('.menu-toggle');
const navLinks = $$('.site-nav a');
const dotBtns  = $$('.dots button');
const ctaFixed = $('.cta-fixed');
const sipL     = $('.sipario-l');
const sipR     = $('.sipario-r');
const spot     = $('.follow-spot');
const secrets  = $$('.secret');
const spotHint = $('.spot-hint');
const ghostHit = $('.ghost-hit');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PERSPECTIVE = parseFloat(getComputedStyle(viewport).perspective);
const cssNum = (el, name) => parseFloat(getComputedStyle(el).getPropertyValue(name));

// ---------------------------------------------------------------------------
// Le luci: una per sezione. La posa della telecamera porta il testo al centro
// dello schermo a dimensione naturale (z' = 0).
// ---------------------------------------------------------------------------
const INTRO = 500;   // il teatro spento, col logo
const STEP  = 2500;  // una luce ogni 2500 unità
const REST  = 1650;  // dentro la battuta: il centro della sosta, testo a fuoco (senza calamita: ci si ferma dove si vuole)
const WIDE  = { x: 0, y: 0, z: 0 };

const zones = ['teatro', 'spettacoli', 'repertorio', 'formazione', 'contatti'].map((id, i) => {
  const copy = document.getElementById(id);
  const X = cssNum(copy, '--x');
  const Z = cssNum(copy, '--z');
  const Y = cssNum(copy, '--copy-y');
  return {
    id, copy, X, Z,
    beam: $(`.beam[data-zone="${id}"]`),
    pool: $(`.pool[data-zone="${id}"]`),
    spike: $(`.spike[data-zone="${id}"]`),
    pose: { x: -X, y: -Y, z: -Z },
    S: INTRO + STEP * i, // inizio della sua battuta
  };
});

const FLIGHT = 1500; // il volo sulla platea
const TILT   = 60;   // inclinazione finale (gradi)
const F0     = zones[zones.length - 1].S + 2700; // fine dell'ultima luce = inizio del volo

// ---------------------------------------------------------------------------
// Timeline (in pausa: la guida lo scroll, vedi più sotto)
// ---------------------------------------------------------------------------
const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

// Apertura: il logo e il suggerimento si ritirano prima della prima luce
tl.to([hero, hint], { autoAlpha: 0, duration: 350 }, 100);

zones.forEach(({ S, copy, beam, pool, spike, pose }) => {
  const lights = [beam, pool];

  tl.fromTo(lights, { autoAlpha: 0 }, { autoAlpha: 1, duration: 300, ease: 'power1.out' }, S);                       // si accende la luce
  tl.fromTo(spike, { opacity: 0.22 }, { opacity: 0.95, duration: 300 }, S);                                           // ...e il segno a terra
  tl.fromTo(spike, { opacity: 0.95 }, { opacity: 0.22, duration: 300, immediateRender: false }, S + 2300);
  tl.fromTo(ghost, { autoAlpha: 1 }, { autoAlpha: 0, duration: 300, immediateRender: false }, S + 200);             // la luce fantasma si fa da parte
  tl.to(stage, { ...pose, duration: 900, ease: 'power2.inOut' }, S + 200);                                           // zoom in
  tl.fromTo(copy, { autoAlpha: 0 }, { autoAlpha: 1, duration: 400, ease: 'power1.out' }, S + 900);                  // compare il testo
  // ...il testo resta a fuoco per una lunga sosta (S+1300 → S+2000): ci si può fermare in qualunque punto senza calamite
  tl.fromTo(copy, { autoAlpha: 1 }, { autoAlpha: 0, duration: 250, ease: 'power1.in', immediateRender: false }, S + 2000); // si ritira
  tl.to(stage, { ...WIDE, duration: 650, ease: 'power2.inOut' }, S + 2050);                                          // zoom out
  tl.fromTo(ghost, { autoAlpha: 0 }, { autoAlpha: 1, duration: 300, immediateRender: false }, S + 2300);
  tl.fromTo(lights, { autoAlpha: 1 }, { autoAlpha: 0, duration: 300, immediateRender: false }, S + 2300);           // si spegne
});

// Repertorio: la griglia di teche si accende tutta insieme (un solo livello, non 22 animati uno a uno)
tl.fromTo($('.teche'),
  { opacity: 0, y: 12 },
  { opacity: 1, y: 0, duration: 500, ease: 'power1.out' },
  zones.find((z) => z.id === 'repertorio').S + 850);

// IL VOLO — dal campo largo lo sguardo si alza e si inclina sulla platea.
// La platea sta all'origine del palco, che è anche il perno della rotazione.
tl.to(stage, { rotationX: TILT, duration: FLIGHT, ease: 'power2.inOut' }, F0);
tl.to([backdrop, ghost, ...zones.map((z) => z.spike)], { autoAlpha: 0, duration: 500, ease: 'power1.in' }, F0);
tl.to([dust, ...curtains], { autoAlpha: 0, duration: 500 }, F0);
// I posti sono disegnati su un canvas (vedi drawSeats): niente texture gigante da ridisegnare mentre si inclina
tl.fromTo(seatState, { a: 0 }, { a: 1, duration: 700, ease: 'power1.out' }, F0 + 400);

// Il form controruota: la griglia si inclina, lui resta frontale e utilizzabile
tl.to(form, { rotationX: -TILT, duration: FLIGHT, ease: 'power2.inOut' }, F0);
tl.fromTo(form, { autoAlpha: 0 }, { autoAlpha: 1, duration: FLIGHT * 0.4, ease: 'power1.out' }, F0 + FLIGHT * 0.6);

const total = tl.duration();

// Le "pagine": dove lo scroll si ferma. Il tempo dentro la battuta è quello a fuoco.
const rests = [
  ['inizio', 0],
  ...zones.map((z) => [z.id, z.S + REST]),
  ['platea', total],
];

// ---------------------------------------------------------------------------
// Scorrimento. Lo scroll lo gestisco io, non il browser, ma si comporta come uno
// scroll vero: rotella, trackpad e dito muovono la scena in proporzione al gesto,
// un'unica corsa continua. Nessuna calamita: ci si ferma dove ci si ferma.
//
//  - `target` è dove il gesto vuole portare la scena, `cur` dove si trova; `cur`
//    insegue `target` con una molla morbida e una velocità massima;
//  - `target` non può correre più di una frazione di pagina davanti a `cur`: così
//    l'inerzia lunga del trackpad dopo che si staccano le dita non si accumula e
//    la scena non prosegue per conto suo, due schede più avanti;
//  - le pause (sosta lunga) di ogni luce lasciano il testo a fuoco in un'ampia zona.
// ---------------------------------------------------------------------------
const restsP = rests.map((r) => r[1] / total);
const LAST = rests.length - 1;
const PAGE = 1 / LAST;                  // lunghezza media di una pagina (in progresso 0..1)
const LEAD = PAGE * 0.22;               // quanto il gesto può correre davanti alla scena (poco più di un quinto di pagina)
const FOLLOW_TIME = 0.24;               // s: con rotella e trackpad la scena scivola dietro il gesto (scia morbida)
const TOUCH_TIME = 0.09;                // s: col dito deve restare più attaccata
const KEY_TIME = 0.55;                  // s: scorrimento dolce con le frecce
const MAX_SPEED = PAGE / 0.9;           // al massimo una pagina in 0,9 s: mai più veloce, così non lagga
const WHEEL_PX_PER_PAGE = 1500;         // pixel di rotella/trackpad per percorrere una pagina (come uno scroll vero)
const TOUCH_SCREENS_PER_PAGE = 1.05;    // schermi di trascinamento col dito per percorrere una pagina
const INERTIA_DECAY = 3.4;              // 1/s: quanto dura la scia dopo uno scatto del dito

let cur = 0;                            // dove si trova la timeline (0..1)
let target = 0;                         // dove vuole andare
let applied = -1;
let page = 0;                           // la luce più vicina (serve solo all'indirizzo e alle frecce)
let programmatic = false;               // true = frecce/Home/Fine: si va a una luce precisa
let dragging = false;
let inertia = 0;                        // scia del dito, in progresso al secondo
let lastInput = 0;

// Si riparte dalla pagina indicata nell'indirizzo (es. ...#spettacoli)
const startPage = rests.findIndex((r) => r[0] === window.location.hash.slice(1));
if (startPage > 0) { page = startPage; cur = target = restsP[startPage]; }
let remembered = page;

function rememberPage() {
  remembered = page;
  const id = rests[page][0];
  window.history.replaceState(null, '', id === 'inizio' ? window.location.pathname + window.location.search : `#${id}`);
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const nearestPage = (p) => restsP.reduce((b, r, i) => (Math.abs(r - p) < Math.abs(restsP[b] - p) ? i : b), 0);
const limitLead = (t) => Math.min(cur + LEAD, Math.max(cur - LEAD, t));

// Un gesto sposta il bersaglio, in proporzione
function nudge(dp) {
  programmatic = false;
  lastInput = performance.now();
  target = limitLead(clamp01(target + dp));
}

// Frecce, Home e Fine: si va a una luce precisa, con scorrimento dolce
function goPage(i) {
  page = gsap.utils.clamp(0, LAST, i);
  target = restsP[page];
  programmatic = true;
  inertia = 0;
}

// Un dialogo o il menu aperti, o il sipario in movimento: i gesti non contano
const gestureBlocked = () =>
  !!document.querySelector('dialog[open]') || header.classList.contains('menu-open') || !!(goTl && goTl.isActive());
const isField = (el) => !!(el && el.closest && el.closest('input, select, textarea'));

// Rotella e trackpad: scorrono davvero, in proporzione al gesto
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey || gestureBlocked()) return; // ctrl+rotella (pizzico) resta lo zoom del browser
  e.preventDefault();
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  let dy = e.deltaY;
  if (e.deltaMode === 1) dy *= 16; else if (e.deltaMode === 2) dy *= window.innerHeight;
  nudge((Math.max(-240, Math.min(240, dy)) / WHEEL_PX_PER_PAGE) * PAGE);
}, { passive: false });

// Dito: la scena segue il dito; al rilascio continua con la sua scia e rallenta
let touch = null;
const touchK = () => PAGE / (window.innerHeight * TOUCH_SCREENS_PER_PAGE); // progresso per pixel
window.addEventListener('touchstart', (e) => {
  if (gestureBlocked() || e.touches.length !== 1 || isField(e.target)) { touch = null; return; }
  touch = { y: e.touches[0].clientY, t: performance.now(), v: 0 };
  dragging = true;
  inertia = 0;
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (!touch || e.touches.length !== 1) return;
  const y = e.touches[0].clientY;
  const now = performance.now();
  const dy = touch.y - y;
  const dt = Math.max(1, now - touch.t);
  touch.v = touch.v * 0.75 + (dy / dt) * 0.25; // velocità del dito in px/ms
  touch.y = y; touch.t = now;
  nudge(dy * touchK());
  if (e.cancelable) e.preventDefault(); // niente rimbalzo né scroll sotto il dito
}, { passive: false });
function endTouch() {
  if (!touch) return;
  // La scia: se il dito si muoveva ancora al rilascio, la scena prosegue e rallenta piano
  const stale = performance.now() - touch.t > 90;
  inertia = stale ? 0 : Math.max(-MAX_SPEED, Math.min(MAX_SPEED, touch.v * 1000 * touchK()));
  touch = null;
  dragging = false;
  lastInput = performance.now();
}
window.addEventListener('touchend', endTouch, { passive: true });
window.addEventListener('touchcancel', endTouch, { passive: true });

// Tastiera: una luce alla volta, con scorrimento dolce
window.addEventListener('keydown', (e) => {
  if (gestureBlocked() || isField(e.target)) return;
  const onControl = e.target.closest && e.target.closest('button, a, summary');
  const k = e.key;
  const here = programmatic ? page : nearestPage(cur);
  if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !onControl)) { e.preventDefault(); goPage(here + 1); }
  else if (k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); goPage(here - 1); }
  else if (k === 'Home') { e.preventDefault(); goPage(0); }
  else if (k === 'End') { e.preventDefault(); goPage(LAST); }
});

// ---------------------------------------------------------------------------
// Collegamenti: salto diretto. Niente attraversamento delle animazioni:
// il sipario si chiude, si cambia luce, si riapre.
// ---------------------------------------------------------------------------
let goTl;

function go(id) {
  const i = rests.findIndex((r) => r[0] === id);
  const p = restsP[i];
  const jump = () => { page = i; cur = target = p; vel.v = 0; programmatic = false; dragging = false; inertia = 0; applied = -1; rememberPage(); };

  goTl?.kill();
  if (reducedMotion) { jump(); return; }
  if (i === page && Math.abs(cur - p) < 0.003) return; // già lì

  // Il sipario si chiude, si cambia luce, si riapre
  goTl = gsap.timeline()
    .to([sipL, sipR], { xPercent: 0, duration: 0.38, ease: 'power2.in' })
    .call(jump)
    .to(sipL, { xPercent: -101, duration: 0.6, ease: 'power2.out' }, '+=0.05')
    .to(sipR, { xPercent: 101, duration: 0.6, ease: 'power2.out' }, '<');
}
gsap.set(sipL, { x: 0, xPercent: -101 });
gsap.set(sipR, { x: 0, xPercent: 101 });

document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-go]');
  if (!trigger) return;
  e.preventDefault();

  // [ SCOPRI ] porta al form con lo spettacolo già selezionato
  if (trigger.dataset.show) {
    const select = document.getElementById('spettacolo');
    if (select) select.value = trigger.dataset.show;
  }
  setMenu(false);
  go(trigger.dataset.go);
});

// ---------------------------------------------------------------------------
// Dove sei: puntini, voce di menu attiva, Prenota fisso (telefono)
// ---------------------------------------------------------------------------
let activeId = '';

function updateUI(t) {
  const [id] = rests.reduce((best, r) => (Math.abs(r[1] - t) < Math.abs(best[1] - t) ? r : best));

  ctaFixed.classList.toggle('is-on', t > 700 && id !== 'platea');
  ghostHit.classList.toggle('is-on', t < 200);
  if (id === activeId) return;
  activeId = id;

  dotBtns.forEach((b) => {
    if (b.dataset.go === id) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  });
  navLinks.forEach((a) => {
    if (a.dataset.go === id) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
}

// ---------------------------------------------------------------------------
// Menu a tutto schermo (telefono)
// ---------------------------------------------------------------------------
function setMenu(open) {
  header.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? 'Chiudi' : 'Menu';
  root.classList.toggle('modal-open', open);
}
menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
window.addEventListener('resize', () => { if (window.innerWidth > 760) setMenu(false); });

// ---------------------------------------------------------------------------
// Pulviscolo: particelle in coordinate di palco, proiettate con la stessa
// prospettiva del CSS. Quasi ferme; si accendono solo dentro i coni di luce.
// ---------------------------------------------------------------------------
const ctx = dust.getContext('2d');
let W = 0, H = 0, dpr = 1, curtainW = 0;
const sctx = seats.getContext('2d'); // i posti della platea (vedi drawSeats)

function resizeDust() {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 1.5); // polvere nitida (qualità piena)
  curtainW = curtains[0].offsetWidth;         // misurata qui, non a ogni fotogramma
  dust.width  = Math.round(W * dpr);
  dust.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  seats.width  = Math.round(W * dpr);
  seats.height = Math.round(H * dpr);
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeDust();
window.addEventListener('resize', resizeDust);

const rand = (a, b) => a + Math.random() * (b - a);
const COUNT = window.innerWidth < 760 ? 90 : 260;
const BEAM_R = 400; // raggio del cilindro di luce per il pulviscolo

// Metà del pulviscolo sta sparsa su tutto il palco, metà "abita" i coni di luce
const motes = Array.from({ length: COUNT }, (_, i) => {
  const zone = zones[i % zones.length];
  const inBeam = i % 2 === 0;
  return {
    x: inBeam ? zone.X + rand(-BEAM_R, BEAM_R) : rand(-2600, 2600),
    z: inBeam ? zone.Z + rand(-BEAM_R, BEAM_R) : rand(-3300, 500),
    y: rand(-1000, 250),
    r: rand(0.7, 1.7), ph: rand(0, 6.28), sp: rand(0.05, 0.14),
    ox: 0, oy: 0, vx: 0, vy: 0, // spostamento dovuto al "soffio" del mouse
  };
});

// ---------------------------------------------------------------------------
// Il faro e gli oggetti nel buio. Sul campo largo una luce debole segue il
// mouse (o il dito); oggetti disegnati con una sola linea compaiono solo dove
// passa, e quelli già scoperti restano appena visibili.
// ---------------------------------------------------------------------------
const ptr = { x: 0, y: 0, sx: 0, sy: 0, seen: 0 };
const found = new Set();

secrets.forEach((el) => { el.style.left = `${el.dataset.x}%`; el.style.top = `${el.dataset.y}%`; });

function onPointer(x, y) {
  if (!ptr.seen) { ptr.sx = x; ptr.sy = y; }
  ptr.x = x; ptr.y = y;
  ptr.seen = performance.now();
  spotHint.classList.remove('is-on');
}
window.addEventListener('pointermove', (e) => onPointer(e.clientX, e.clientY), { passive: true });
['touchstart', 'touchmove'].forEach((type) =>
  window.addEventListener(type, (e) => { const t = e.touches[0]; if (t) onPointer(t.clientX, t.clientY); }, { passive: true }));

// Un suggerimento discreto, solo se nessuno ha ancora toccato nulla
const coarse = window.matchMedia('(pointer: coarse)').matches;
spotHint.textContent = coarse ? 'Sfiora lo schermo' : 'Muovi la luce';
setTimeout(() => { if (!ptr.seen && cur * total < 200) spotHint.classList.add('is-on'); }, 5000);

// Le luci accese e la visibilità della polvere si calcolano dalla posizione della
// timeline (la stessa curva delle animazioni): nessuna lettura del DOM nel ciclo,
// che costringerebbe il browser a ricalcolare lo stile a ogni fotogramma.
const easeOutLight = gsap.parseEase('power1.out');
const lights = zones.map((z) => ({ X: z.X, Z: z.Z, S: z.S, I: 0 }));
let maxBeam = 0;
let dustVisible = true;

function refreshLight() {
  const t = cur * total;
  maxBeam = 0;
  for (const l of lights) {
    const u = t - l.S;
    l.I = u < 0 ? 0 : u < 300 ? easeOutLight(u / 300) : u < 2300 ? 1 : u < 2600 ? 1 - (u - 2300) / 300 : 0;
    if (l.I > maxBeam) maxBeam = l.I;
  }
  dustVisible = t < F0 + 480;
}

let lastK = 0, lastWide = 0;

function updateSecrets(cam) {
  // Solo sul campo largo: telecamera ferma all'origine, nessuna luce accesa, prima del volo
  const wide = gsap.utils.clamp(0, 1, 1 - Math.abs(cam.z) / 150)
             * (1 - gsap.utils.clamp(0, 1, maxBeam * 1.6))
             * (cur * total < F0 - 200 ? 1 : 0);
  const idle = performance.now() - ptr.seen;
  const active = ptr.seen ? gsap.utils.clamp(0, 1, 1 - (idle - 2500) / 1200) : 0;

  ptr.sx += (ptr.x - ptr.sx) * 0.18;
  ptr.sy += (ptr.y - ptr.sy) * 0.18;

  const k = wide * active;
  // Fuori dall'apertura non c'è niente da aggiornare: nessun lavoro per il DOM
  if (k < 0.002 && lastK < 0.002 && wide < 0.002 && lastWide < 0.002) return;
  lastK = k; lastWide = wide;

  spot.style.opacity = k.toFixed(3);
  if (k > 0.01) spot.style.transform = `translate3d(${ptr.sx}px,${ptr.sy}px,0)`;

  secrets.forEach((el) => {
    const cx = (W * el.dataset.x) / 100;
    const cy = (H * el.dataset.y) / 100;
    const near = gsap.utils.clamp(0, 1, 1 - Math.hypot(ptr.sx - cx, ptr.sy - cy) / 170) * k;
    if (near > 0.6) found.add(el);
    const op = Math.max(found.has(el) ? 0.14 * wide : 0, near * 0.95);
    if (Math.abs(op - (el._op ?? -1)) > 0.004) { el._op = op; el.style.opacity = op.toFixed(3); } // solo se cambia
  });
}

// Qualità adattiva: se il dispositivo non regge, si tolgono da soli gli effetti più costosi
let quality = 0; // 0 = completa, 1 = leggera, 2 = minima
function applyQuality() {
  root.classList.toggle('lite', quality >= 1);
  if (quality >= 2) { dust.style.display = 'none'; dustVisible = false; }
}

const getStage = gsap.getProperty(stage);
const cam = { x: 0, y: 0, z: 0 };

// ---------------------------------------------------------------------------
// I posti della platea: una griglia di puntini, disegnata a ogni fotogramma con la
// stessa prospettiva e la stessa inclinazione dello stage. Rispetto a un grande
// elemento CSS inclinato in 3D non c'è nessuna texture gigante da ridisegnare.
// ---------------------------------------------------------------------------
const SEAT_PITCH = 56;
const SEAT_R = window.innerWidth < 760 ? 800 : 1100; // raggio della platea: oltre, si dissolve nel nero
const seatPts = [];
for (let gx = -Math.ceil(SEAT_R / SEAT_PITCH); gx <= Math.ceil(SEAT_R / SEAT_PITCH); gx++) {
  for (let gy = -Math.ceil(SEAT_R / SEAT_PITCH); gy <= Math.ceil(SEAT_R / SEAT_PITCH); gy++) {
    const x = (gx + 0.5) * SEAT_PITCH, y = (gy + 0.5) * SEAT_PITCH; // nessun posto esattamente al centro, sotto il form
    const f = Math.min(1, Math.max(0, 1 - (Math.hypot(x, y) / SEAT_R - 0.2) / 0.8));
    if (f > 0.02) seatPts.push({ x, y, f });
  }
}
let seatsDrawn = false;

function drawSeats() {
  const a = seatState.a;
  if (a < 0.01) {
    if (seatsDrawn) { sctx.clearRect(0, 0, W, H); seatsDrawn = false; }
    return;
  }
  seatsDrawn = true;
  const th = (getStage('rotationX') * Math.PI) / 180;
  const cos = Math.cos(th), sin = Math.sin(th);

  sctx.clearRect(0, 0, W, H);
  sctx.fillStyle = 'rgb(255,255,255)';
  for (let i = 0; i < seatPts.length; i++) {
    const p = seatPts[i];
    const zz = p.y * sin;
    if (zz > PERSPECTIVE - 60) continue; // troppo vicino alla telecamera
    const s = PERSPECTIVE / (PERSPECTIVE - zz);
    const sx = W / 2 + p.x * s;
    const sy = H / 2 + p.y * cos * s;
    if (sx < -12 || sx > W + 12 || sy < -12 || sy > H + 12) continue;

    const r = Math.min(5, Math.max(0.7, 1.5 * s));
    const base = 0.3 * p.f * a;
    sctx.globalAlpha = base * 0.3;            // alone morbido
    sctx.fillRect(sx - r * 2, sy - r * 2, r * 4, r * 4);
    sctx.globalAlpha = base;                  // nucleo
    sctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  sctx.globalAlpha = 1;
}
let lastDraw = 0;     // per l'andatura indipendente dai fotogrammi al secondo
let lastDustT = 0;    // per ridisegnare la polvere a 30 fps quando tutto il resto è fermo
let lastDustProg = -1;
let lastCurtL = 1e9, lastCurtR = 1e9;

function drawScene(time) {
  if (document.hidden) return;

  cam.x = getStage('x'); cam.y = getStage('y'); cam.z = getStage('z');

  // Le tende si aprono avvicinandosi e seguono lo spostamento laterale (solo se cambia qualcosa)
  const zoomK = gsap.utils.clamp(0, 1, cam.z / 2000);
  const left = -zoomK * curtainW * 0.55 + cam.x * 0.04;
  const right = zoomK * curtainW * 0.55 + cam.x * 0.04;
  if (Math.abs(left - lastCurtL) > 0.05 || Math.abs(right - lastCurtR) > 0.05) {
    lastCurtL = left; lastCurtR = right;
    curtains[0].style.transform = `translate3d(${left}px,0,0)`;
    curtains[1].style.transform = `translate3d(${right}px,0,0)`;
  }

  updateSecrets(cam);
  drawSeats();

  if (!dustVisible) {
    if (lastDustProg !== -2) { ctx.clearRect(0, 0, W, H); lastDustProg = -2; }
    return;
  }

  // Con la scena ferma e nessun soffio, la polvere (che si muove pianissimo) basta a 30 fps
  const windOn = !reducedMotion && ptr.seen && performance.now() - ptr.seen < 3000;
  if (cur === lastDustProg && !windOn && time - lastDustT < 0.033) return;
  lastDustProg = cur;
  lastDustT = time;

  const fs = Math.min(3, Math.max(0.2, (time - lastDraw) * 60)); // indipendente dal numero di fotogrammi al secondo
  lastDraw = time;
  const damp = Math.pow(0.9, fs), spring = Math.pow(0.97, fs);
  const driftOn = !reducedMotion;
  const count = quality >= 1 ? motes.length >> 1 : motes.length;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgb(255,248,232)';

  for (let i = 0; i < count; i++) {
    const m = motes[i];
    const zz = m.z + cam.z;
    if (zz > PERSPECTIVE - 80) continue; // dietro la telecamera

    const X = m.x + (driftOn ? Math.sin(time * m.sp + m.ph) * 22 : 0);
    const Y = m.y + (driftOn ? Math.cos(time * m.sp * 0.8 + m.ph) * 12 : 0);
    const s = PERSPECTIVE / (PERSPECTIVE - zz);
    let sx = W / 2 + (X + cam.x) * s;
    let sy = H / 2 + (Y + cam.y) * s;

    // Il mouse (o il dito) soffia: le particelle vicine si scostano e poi tornano piano
    if (windOn) {
      const dx = sx - ptr.sx, dy = sy - ptr.sy, d = Math.hypot(dx, dy);
      if (d < 170) {
        const f = (1 - d / 170) * 2.4 * fs;
        m.vx += (dx / (d || 1)) * f;
        m.vy += (dy / (d || 1)) * f;
      }
    }
    if (m.vx || m.vy || m.ox || m.oy) {
      m.ox += m.vx * fs; m.oy += m.vy * fs;
      m.vx *= damp; m.vy *= damp; m.ox *= spring; m.oy *= spring;
      if (Math.abs(m.ox) + Math.abs(m.oy) + Math.abs(m.vx) + Math.abs(m.vy) < 0.01) m.ox = m.oy = m.vx = m.vy = 0;
      sx += m.ox; sy += m.oy;
    }

    if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;

    let light = 0;
    for (let j = 0; j < lights.length; j++) {
      const l = lights[j];
      if (l.I < 0.01) continue;
      const d2 = (X - l.X) ** 2 + (m.z - l.Z) ** 2;
      if (d2 < BEAM_R * BEAM_R) light += l.I * (1 - d2 / (BEAM_R * BEAM_R));
    }

    ctx.globalAlpha = Math.min(0.95, (0.1 + 1.1 * light) * Math.min(1, s * 1.5));
    const r = Math.max(0.5, Math.min(2.4, m.r * s));
    if (r > 1.5) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.283); ctx.fill(); }
    else ctx.fillRect(sx - r, sy - r, r * 2, r * 2); // i puntini minuscoli sono quadratini: molto più veloci
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Il ciclo. Passo regolare (anche su schermi a 120/144 Hz), molla di secondo ordine
// per seguire il gesto, qualità adattiva.
// ---------------------------------------------------------------------------

// Molla smorzata (stessa idea di SmoothDamp): la velocità cambia sempre in modo continuo,
// quindi le raffiche irregolari di eventi del trackpad non si vedono come scatti.
const vel = { v: 0 };
function smoothDamp(from, to, state, smoothTime, maxSpeed, dt) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const maxChange = maxSpeed * smoothTime;
  const change = Math.max(-maxChange, Math.min(maxChange, from - to));
  const reach = from - change;
  const temp = (state.v + omega * change) * dt;
  state.v = (state.v - omega * temp) * e;
  let out = reach + (change + temp) * e;
  if ((to - from > 0) === (out > to)) { out = to; state.v = 0; }
  return out;
}

// Passo regolare: a 120/144 Hz il browser non riesce a tenere ogni fotogramma e oscilla tra
// veloce e lento, che si vede come scatto. Si lavora a un ritmo costante di circa 60.
let skipInterval = 0;
(function probeRefresh() {
  const d = []; let l = performance.now();
  function c(n) {
    d.push(n - l); l = n;
    if (d.length < 40) { requestAnimationFrame(c); return; }
    d.sort((a, b) => a - b);
    const med = d[20];
    const skip = Math.max(1, Math.floor(1000 / med / 55));
    if (skip > 1) skipInterval = skip * med - 0.45 * med;
  }
  requestAnimationFrame(c);
})();

let perfBox = null;
const perfFrames = [];
let perfLast = 0;
if (window.location.search.includes('perf')) {
  perfBox = document.createElement('pre');
  perfBox.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;margin:0;padding:6px 8px;font:11px/1.5 monospace;color:#0f0;background:rgba(0,0,0,.8);pointer-events:none;white-space:pre';
  document.body.appendChild(perfBox);
}

let lastWork = performance.now();
let prevCur = cur;
let ema = 16.7;
let coolUntil = 0;

gsap.ticker.add((time) => {
  const now = performance.now();
  if (skipInterval && now - lastWork < skipInterval) return;
  const frameMs = now - lastWork;
  const dt = Math.min(0.05, frameMs / 1000); // dopo una pausa (scheda in secondo piano) non saltare
  lastWork = now;

  // La scia del dito dopo lo scatto: la scena prosegue e rallenta piano
  if (inertia && !dragging) {
    target = limitLead(clamp01(target + inertia * dt));
    inertia *= Math.exp(-INERTIA_DECAY * dt);
    lastInput = now;
    if (Math.abs(inertia) < PAGE * 0.04 || target <= 0 || target >= 1) inertia = 0;
  }

  // La timeline segue il bersaglio con una molla: quasi in presa diretta, ma sempre morbida
  if (reducedMotion) { cur = target; }
  else if (cur !== target) {
    const smoothTime = programmatic ? KEY_TIME : dragging ? TOUCH_TIME : FOLLOW_TIME;
    const next = smoothDamp(cur, target, vel, smoothTime, MAX_SPEED, dt);
    const cap = MAX_SPEED * dt; // limite rigido: mai più veloce di così, comunque si scorra
    cur += Math.max(-cap, Math.min(cap, next - cur));
    if (Math.abs(target - cur) < 2e-4) { cur = target; vel.v = 0; programmatic = false; } // la coda finale è invisibile: ci si ferma
  }

  // Fermi da un po': si ricorda la luce più vicina nell'indirizzo (e per le frecce). Nessun movimento.
  if (cur === target && !dragging && !inertia && now - lastInput > 500) {
    const near = nearestPage(cur);
    if (near !== page) page = near;
    if (remembered !== page) rememberPage();
  }

  const moving = cur !== prevCur;
  prevCur = cur;

  if (cur !== applied) {
    applied = cur;
    tl.progress(cur);
    updateUI(cur * total);
    refreshLight();
  }
  drawScene(time);

  // Diagnostica (solo con ?perf nell'indirizzo): fotogrammi al secondo e tempi reali
  if (perfBox) {
    perfFrames.push(frameMs);
    if (now - perfLast > 500) {
      const s = perfFrames.slice().sort((a, b) => a - b);
      const avg = s.reduce((a, b) => a + b, 0) / s.length;
      perfBox.textContent =
        `${Math.round(1000 / avg)} fps · media ${avg.toFixed(1)} ms · p95 ${s[Math.floor(s.length * 0.95)].toFixed(1)} ms · max ${s[s.length - 1].toFixed(1)} ms\n` +
        `qualità ${quality} · schermo ${skipInterval ? 'alta frequenza (limitato a ~60)' : 'normale'} · dpr ${window.devicePixelRatio} · ${window.innerWidth}×${window.innerHeight}`;
      perfFrames.length = 0; perfLast = now;
    }
  }

  // Qualità adattiva: se mentre ci si muove i fotogrammi restano lenti, si alleggerisce
  if (moving) {
    ema = ema * 0.93 + frameMs * 0.07;
    if (ema > 30 && quality < 2 && now > coolUntil) { // solo se proprio non regge (sotto ~33 fps): altrimenti la qualità resta piena
      quality++;
      applyQuality();
      ema = 16.7;
      coolUntil = now + 3000;
    }
  }
});

// ---------------------------------------------------------------------------
// Repertorio: ogni teca racconta una produzione (mouse, tocco o tastiera)
// ---------------------------------------------------------------------------
const teche = $$('.teca');
const wrap = $('.teche-wrap');
const zoom = $('.teca-zoom');
const zoomImg = $('img', zoom);
const detail = $('.teca-dettaglio');
const detailTitle = $('h3', detail);
const detailText = $('p', detail);

// Ogni teca diventa una miniatura (foto/thumb/NN.jpg) con il suo numero.
// Le foto stanno in foto/NN.jpg; data-senza-foto = nessuna foto.
teche.forEach((b) => {
  const num = b.textContent.trim();
  b.dataset.num = num;
  b.dataset.foto = b.hasAttribute('data-senza-foto') ? '' : `foto/${num}.jpg`;
  b.innerHTML = (b.dataset.foto
    ? `<img class="bn" src="foto/thumb-bn/${num}.jpg" alt="" decoding="async"><img class="col" src="foto/thumb/${num}.jpg" alt="" decoding="async">`
    : '') + `<span>${num}</span>`;
  b.setAttribute('aria-label', `${num}, ${b.dataset.titolo}`);
});

function showTeca(btn) {
  teche.forEach((b) => b.classList.toggle('is-active', b === btn));
  detailTitle.textContent = `${btn.dataset.num} · ${btn.dataset.titolo}`;
  detailText.textContent = btn.dataset.nota;
}

// Con il mouse: la foto si ingrandisce sopra la griglia e continua a zoomare piano
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
let zoomFor = null;

function hideZoom() { zoomFor = null; zoom.classList.remove('is-on'); }

async function showZoom(btn) {
  if (!canHover || !btn.dataset.foto) { hideZoom(); return; }
  zoomFor = btn;
  if (!zoomImg.src.endsWith(btn.dataset.foto)) zoomImg.src = btn.dataset.foto;
  try { await zoomImg.decode(); } catch (e) { /* la mostriamo comunque */ }
  if (zoomFor !== btn) return; // nel frattempo il mouse è passato oltre

  const ratio = zoomImg.naturalWidth / zoomImg.naturalHeight;
  let w = Math.min(360, wrap.clientWidth);
  let h = w / ratio;
  if (h > 240) { h = 240; w = h * ratio; }
  zoom.style.width = `${w}px`;
  zoom.style.height = `${h}px`;
  zoom.style.left = `${gsap.utils.clamp(-40, wrap.clientWidth - w + 40, btn.offsetLeft + btn.offsetWidth / 2 - w / 2)}px`;

  zoomImg.style.animation = 'none'; void zoomImg.offsetWidth; zoomImg.style.animation = ''; // riparte lo zoom lento
  zoom.classList.add('is-on');
}

// Lightbox: foto grande, didascalia, frecce, swipe, Esc (soprattutto per il telefono)
const lb = $('#lightbox');
const lbImg = $('.lb-img', lb);
let lbIndex = 0;

function renderLightbox(i) {
  lbIndex = (i + teche.length) % teche.length;
  const b = teche[lbIndex];
  $('.lb-num', lb).textContent = b.dataset.num;
  $('#lb-titolo', lb).textContent = b.dataset.titolo;
  $('.lb-nota', lb).textContent = b.dataset.nota;
  $('.lb-count', lb).textContent = `${b.dataset.num} / ${teche.length}`;
  if (b.dataset.foto) { lbImg.hidden = false; lbImg.src = b.dataset.foto; lbImg.alt = b.dataset.titolo; }
  else { lbImg.hidden = true; lbImg.removeAttribute('src'); }
  [lbIndex - 1, lbIndex + 1].forEach((j) => {
    const n = teche[(j + teche.length) % teche.length];
    if (n.dataset.foto) new Image().src = n.dataset.foto; // le vicine sono già pronte
  });
  showTeca(b);
}
function openLightbox(i) {
  hideZoom();
  root.classList.add('modal-open');
  renderLightbox(i);
  lb.showModal();
}
lb.addEventListener('click', (e) => {
  const a = e.target.closest('[data-lb]');
  if (!a) return;
  if (a.dataset.lb === 'close') lb.close();
  if (a.dataset.lb === 'prev') renderLightbox(lbIndex - 1);
  if (a.dataset.lb === 'next') renderLightbox(lbIndex + 1);
});
lb.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') renderLightbox(lbIndex + 1);
  if (e.key === 'ArrowLeft') renderLightbox(lbIndex - 1);
});
lb.addEventListener('close', () => root.classList.remove('modal-open')); // anche con Esc
let swipeX = null;
lb.addEventListener('touchstart', (e) => { swipeX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', (e) => {
  if (swipeX === null) return;
  const dx = e.changedTouches[0].clientX - swipeX;
  swipeX = null;
  if (Math.abs(dx) > 50) renderLightbox(lbIndex + (dx < 0 ? 1 : -1));
}, { passive: true });

teche.forEach((b, i) => {
  b.addEventListener('click', () => openLightbox(i));
  b.addEventListener('focus', () => { showTeca(b); showZoom(b); });
  b.addEventListener('blur', hideZoom);
  b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { showTeca(b); showZoom(b); } });
});
wrap.addEventListener('pointerleave', hideZoom);

// Sul computer le foto grandi si scaricano in silenzio, a pagina ferma
if (canHover) {
  window.addEventListener('load', () => setTimeout(() => {
    teche.forEach((b) => { if (b.dataset.foto) new Image().src = b.dataset.foto; });
  }, 2500));
}

// ---------------------------------------------------------------------------
// Spettacoli → voci del form. Ogni locandina con data-spettacolo diventa
// da sola una scelta in "Scegli Spettacolo".
// ---------------------------------------------------------------------------
const select = document.getElementById('spettacolo');
const shows = $$('.locandina[data-spettacolo]').map((el) => el.dataset.spettacolo);
shows.forEach((s) => select.add(new Option(s, s)));
if (shows.length === 1) select.value = shows[0]; // un solo spettacolo: già scelto

// ---------------------------------------------------------------------------
// Form di prenotazione — compatibile con Netlify Forms: il form è rilevato al
// deploy (data-netlify) e qui lo inviamo via fetch, così la pagina non si
// ricarica. In caso di errore l'utente trova un'alternativa (email).
// ---------------------------------------------------------------------------
const bookingEmail = $('a[href^="mailto:"]').getAttribute('href').slice(7);
const formStatus  = $('.form-status', form);
const thanks      = $('.form-thanks', form);
const submitBtn   = $('[type="submit"]', form);
const submitLabel = submitBtn.textContent;

// Invio a Netlify Forms (lo stesso per tutti i moduli del sito)
async function postForm(f) {
  const res = await fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(new FormData(f)).toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Numero posti: un puntino acceso per ognuno
const postiInput = $('#posti');
const postiDots = $('.posti-dots');
postiDots.innerHTML = '<i></i>'.repeat(12);
postiInput.addEventListener('input', () => {
  const n = parseInt(postiInput.value, 10) || 0;
  [...postiDots.children].forEach((d, i) => d.classList.toggle('on', i < n));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formStatus.textContent = '';
  submitBtn.disabled = true;
  submitBtn.textContent = '[ INVIO IN CORSO… ]';

  try {
    await postForm(form);

    // Il ringraziamento prende il posto del form
    form.classList.add('is-sent');
    thanks.hidden = false;
    gsap.fromTo(thanks, { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: reducedMotion ? 0 : 1.2, ease: 'power2.out' });
    thanks.focus({ preventScroll: true });
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = submitLabel;
    formStatus.textContent = `Invio non riuscito. Riprova, oppure scrivici a ${bookingEmail}.`;
  }
});

// ---------------------------------------------------------------------------
// Iscrizione agli aggiornamenti (in Contatti)
// ---------------------------------------------------------------------------
const iscrizione = $('.iscrizione');
iscrizione.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('.form-status', iscrizione);
  const btn = $('[type="submit"]', iscrizione);
  btn.disabled = true;
  status.textContent = '';
  try {
    await postForm(iscrizione);
    iscrizione.reset();
    status.textContent = 'Grazie: sei iscritto.';
  } catch (err) {
    status.textContent = `Iscrizione non riuscita. Scrivici a ${bookingEmail}.`;
  }
  btn.disabled = false;
});

// ---------------------------------------------------------------------------
// Il segreto: toccando la luce fantasma, il teatro va in blackout per un attimo
// ---------------------------------------------------------------------------
let blackout;
ghostHit.addEventListener('click', () => {
  if (blackout && blackout.isActive()) return;
  blackout = gsap.timeline()
    .to(scene, { opacity: 0, duration: 0.18, ease: 'power1.in' })
    .to(scene, { opacity: 1, duration: 1.5, ease: 'power2.inOut' }, '+=0.9');
});

// ---------------------------------------------------------------------------
// Informativa privacy (<dialog> a tutto schermo)
// ---------------------------------------------------------------------------
const privacy = document.getElementById('privacy');

$$('[data-open-privacy]').forEach((btn) =>
  btn.addEventListener('click', () => {
    root.classList.add('modal-open'); // blocca lo scroll sotto il modal
    privacy.showModal();
  }));
$('[data-close-privacy]', privacy).addEventListener('click', () => privacy.close());
privacy.addEventListener('close', () => root.classList.remove('modal-open')); // anche con Esc

// ---------------------------------------------------------------------------
// Prima luce: la scena emerge dal nero
// ---------------------------------------------------------------------------
gsap.set(scene, { opacity: 0 });
gsap.to(scene, { opacity: 1, duration: reducedMotion ? 0 : 2.6, ease: 'power2.out', delay: 0.15 });
