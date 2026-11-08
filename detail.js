// DETTAGLIO – radiale a 5 livelli + "posizione nel dataset"
// Dal centro: nucleo = area bacino · anello blu = lunghezza · anello ciano (spessore) = portata
//             tacche verdi = affluenti · anello esterno a gradiente = temperatura min–max
// Pannello destro: dove si colloca il fiume rispetto ai 100 fiumi su 5 variabili (hover = nome, click = apri)

const BG = '#071F26', TXT = '#D8F3EA';
const BLUE = '#2D5FEB', CYAN = '#00CDE1', GREEN = '#78F55A';

const AREA_MIN = 1191, AREA_MAX = 7050000;
const LEN_MAX = 6650, Q_MIN = 101, Q_MAX = 209000, TRIB_MAX = 1100;
const T_MIN = -25, T_MAX = 35, TICKS = 120;
const C_LO = -10, C_HI = 30;

const METRICS = [
  { key: 'length',    label: 'Lunghezza',   unit: ' km',   log: false, col: BLUE },
  { key: 'area',      label: 'Area bacino', unit: ' km²',  log: true,  col: BLUE },
  { key: 'discharge', label: 'Portata',     unit: ' m³/s', log: true,  col: CYAN },
  { key: 'trib',      label: 'Affluenti',   unit: '',      log: true,  col: GREEN },
  { key: 'avgT',      label: 'Temp. media', unit: ' °C',   log: false, col: null }
];

let all = [], river = null, loaded = false;
let dots = [], hoverDot = null;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  const table = await loadTable('assets/rivers.csv', ',', 'header');
  all = table.getRows().map(r => ({
    id: r.getString('id'), name: r.getString('name'),
    countries: r.getString('countries'), continent: r.getString('continent'), outflow: r.getString('outflow'),
    length: r.getNum('length'), area: r.getNum('area'), discharge: r.getNum('discharge'),
    trib: r.getNum('tributaries'), minT: r.getNum('min_temp'), maxT: r.getNum('max_temp'), avgT: r.getNum('avg_temp')
  }));
  river = all.find(r => r.id === String(getURLParams().id)) || null;
  loaded = true;
}

const fmt = n => n.toLocaleString('it-IT');
const tAngle = t => -HALF_PI + map(t, T_MIN, T_MAX, 0, TWO_PI);
function tempColor(t) {
  const n = constrain(map(t, C_LO, C_HI, 0, 1), 0, 1);
  return n < 0.5 ? lerpColor(color(BLUE), color(CYAN), n * 2)
                 : lerpColor(color(CYAN), color(GREEN), (n - 0.5) * 2);
}
function haloText(s, x, y) {
  stroke(BG); strokeWeight(4); fill(TXT); text(s, x, y);
  noStroke(); text(s, x, y);
}

function draw() {
  background(BG);
  if (!loaded) return;
  if (!river) {
    fill(TXT); noStroke(); textAlign(CENTER, CENTER); textSize(22);
    text('Nessun fiume trovato per questo ID.', width / 2, height / 2); return;
  }

  const leftW = 330, pw = min(380, width * 0.27), rightW = pw + 60;
  const availW = width - leftW - rightW;
  const R = max(120, min(availW / 2 - 40, (height - 140) / 2));
  const cx = leftW + availW / 2, cy = height / 2 + 24;

  drawRadial(cx, cy, R);
  drawCard();
  drawLegend();
  drawRankPanel(width - 40 - pw, 70, pw, height - 130);
}

function drawRadial(cx, cy, R) {
  noFill(); strokeCap(BUTT);
  const r1 = R * 0.34, r2 = R * 0.50, r3 = R * 0.69, r4 = R * 0.90;

  // ---- anello 5: temperatura (gradiente)
  stroke(216, 243, 234, 30); strokeWeight(14); circle(cx, cy, r4 * 2);
  strokeWeight(14);
  for (let t = river.minT; t < river.maxT; t += 0.5) {
    stroke(tempColor(t + 0.25));
    arc(cx, cy, r4 * 2, r4 * 2, tAngle(t), tAngle(min(t + 0.5, river.maxT)) + 0.004, OPEN);
  }
  // scala gradi
  textSize(10); textAlign(CENTER, CENTER);
  for (const t of [-20, -10, 0, 10, 20, 30]) {
    const a = tAngle(t);
    stroke(TXT); strokeWeight(t === 0 ? 2 : 1);
    line(cx + cos(a) * (r4 + 9), cy + sin(a) * (r4 + 9), cx + cos(a) * (r4 + 15), cy + sin(a) * (r4 + 15));
    noStroke(); fill(TXT); text(t + '°', cx + cos(a) * (r4 + 28), cy + sin(a) * (r4 + 28));
  }
  const aa = tAngle(river.avgT);
  fill(BG); stroke(TXT); strokeWeight(2); circle(cx + cos(aa) * r4, cy + sin(aa) * r4, 16);

  // ---- anello 4: affluenti (scala log)
  const lit = ceil(map(log(river.trib), 0, log(TRIB_MAX), 1, TICKS));
  strokeWeight(3); strokeCap(BUTT);
  for (let i = 0; i < TICKS; i++) {
    const a = -HALF_PI + (i / TICKS) * TWO_PI;
    stroke(i < lit ? color(GREEN) : color(216, 243, 234, 32));
    line(cx + cos(a) * (r3 - R * 0.04), cy + sin(a) * (r3 - R * 0.04),
         cx + cos(a) * (r3 + R * 0.04), cy + sin(a) * (r3 + R * 0.04));
  }

  // ---- anello 3: portata (spessore, scala log) con guide min/max
  const tq = map(log(river.discharge), log(Q_MIN), log(Q_MAX), 3, R * 0.13);
  noFill();
  stroke(216, 243, 234, 35); strokeWeight(1);
  circle(cx, cy, (r2 - R * 0.065) * 2); circle(cx, cy, (r2 + R * 0.065) * 2);
  stroke(0, 205, 225, 170); strokeWeight(tq); circle(cx, cy, r2 * 2);

  // ---- anello 2: lunghezza (arco)
  stroke(216, 243, 234, 30); strokeWeight(12); circle(cx, cy, r1 * 2);
  stroke(BLUE); strokeWeight(12);
  arc(cx, cy, r1 * 2, r1 * 2, -HALF_PI, -HALF_PI + (river.length / LEN_MAX) * TWO_PI, OPEN);

  // ---- nucleo: area
  const rc = map(sqrt(river.area), sqrt(AREA_MIN), sqrt(AREA_MAX), 6, R * 0.2);
  noStroke(); fill(45, 95, 235, 110); circle(cx, cy, rc * 2);
  noFill(); stroke(45, 95, 235, 120); strokeWeight(1); circle(cx, cy, R * 0.2 * 2);

  // etichette anelli (sul meridiano di partenza)
  textSize(10); textAlign(RIGHT, CENTER);
  haloText('Lunghezza', cx - 8, cy - r1);
  haloText('Portata',   cx - 8, cy - r2);
  haloText('Affluenti', cx - 8, cy - r3);
  haloText('Temperatura', cx - 8, cy - r4);
}

function drawCard() {
  noStroke(); fill(TXT); textAlign(LEFT, TOP);
  textSize(28); textStyle(BOLD);
  const nameW = 270;
  text(river.name, 40, 70, nameW);
  textStyle(NORMAL); textSize(13);
  let y = 70 + (river.name.length > 24 ? 110 : 52);
  const rows = [
    ['Continente', river.continent], ['Sfocia in', river.outflow], ['Paesi', river.countries],
    ['Lunghezza', fmt(river.length) + ' km'], ['Area bacino', fmt(river.area) + ' km²'],
    ['Portata', fmt(river.discharge) + ' m³/s'], ['Affluenti', fmt(river.trib)],
    ['Temp. min / max / media', river.minT + ' / ' + river.maxT + ' / ' + river.avgT + ' °C']
  ];
  for (const [k, v] of rows) {
    fill(TXT); drawingContext.globalAlpha = 0.55; text(k, 40, y);
    drawingContext.globalAlpha = 1; text(v, 40, y + 16, nameW);
    const lines = max(1, ceil(textWidth(v) / nameW));
    y += 16 * lines + 22;
  }
}

function drawLegend() {
  const x = 40, y = height - 150;
  noStroke(); fill(TXT); textSize(11); textAlign(LEFT, CENTER);
  textStyle(BOLD); text('COME LEGGERE IL GRAFICO', x, y); textStyle(NORMAL);
  const items = [
    ['Nucleo = area del bacino · anello blu = lunghezza (360° = 6.650 km)', BLUE],
    ['Spessore ciano = portata (scala log, guide = min/max del dataset)', CYAN],
    ['Tacche verdi = affluenti (scala log, max 1.100)', GREEN],
    ['Anello a gradiente = temp. min–max (−25…35 °C), pallino = media', 'grad']
  ];
  items.forEach(([t, c], i) => {
    const yy = y + 20 + i * 20;
    if (c === 'grad') {
      for (let k = 0; k < 14; k++) { fill(tempColor(map(k, 0, 13, C_LO, C_HI))); rect(x + k, yy - 5, 1.2, 10); }
    } else { fill(c); rect(x, yy - 5, 14, 10, 2); }
    fill(TXT); text(t, x + 24, yy);
  });
}

// ---- pannello "posizione nel dataset": 100 punti per variabile, fiume selezionato evidenziato
function drawRankPanel(x, y, w, h) {
  dots = [];
  noStroke(); fill(TXT); textSize(11); textAlign(LEFT, TOP);
  textStyle(BOLD); text('POSIZIONE NEL DATASET (100 fiumi)', x, y); textStyle(NORMAL);
  drawingContext.globalAlpha = 0.6;
  text('Ogni punto è un fiume · hover = nome · click = apri', x, y + 16);
  drawingContext.globalAlpha = 1;

  const gap = (h - 40) / METRICS.length;
  const sel = river;

  METRICS.forEach((m, mi) => {
    const top = y + 48 + mi * gap;
    const vals = all.map(r => r[m.key]);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const rank = vals.filter(v => v > sel[m.key]).length + 1;
    const ax = x + 6, aw = w - 12, ay = top + 40;
    const sx = v => ax + (m.log ? map(log(v), log(lo), log(hi), 0, aw) : map(v, lo, hi, 0, aw));

    // titolo + posizione
    noStroke(); fill(TXT); textSize(12); textAlign(LEFT, TOP); textStyle(BOLD); text(m.label, x, top); textStyle(NORMAL);
    textAlign(RIGHT, TOP); text('#' + rank + ' su ' + all.length, x + w, top);
    drawingContext.globalAlpha = 0.6; textAlign(LEFT, TOP); textSize(11);
    text(fmt(sel[m.key]) + m.unit + (m.log ? '  ·  scala log' : ''), x, top + 16);
    drawingContext.globalAlpha = 1;

    // asse
    stroke(216, 243, 234, 70); strokeWeight(1); line(ax, ay + 12, ax + aw, ay + 12);
    noStroke(); fill(TXT); drawingContext.globalAlpha = 0.5; textSize(10);
    textAlign(LEFT, TOP);  text(fmt(lo), ax, ay + 16);
    textAlign(RIGHT, TOP); text(fmt(hi), ax + aw, ay + 16);
    drawingContext.globalAlpha = 1;

    // punti (jitter deterministico per ridurre le sovrapposizioni)
    const col = m.col ? color(m.col) : tempColor(sel.avgT);
    all.forEach((r, i) => {
      if (r === sel) return;
      const px = sx(r[m.key]), py = ay + ((i * 37) % 17) - 10;
      dots.push({ x: px, y: py, r });
      fill(216, 243, 234, 85); noStroke(); circle(px, py, 4);
    });
    // fiume selezionato sopra gli altri
    const spx = sx(sel[m.key]), spy = ay - 2;
    stroke(col); strokeWeight(2); noFill(); circle(spx, spy, 18);
    noStroke(); fill(col); circle(spx, spy, 9);
    stroke(col); strokeWeight(1); line(spx, spy + 10, spx, ay + 12);
  });

  // hover sui punti
  hoverDot = null; let best = 8;
  for (const d of dots) { const dd = dist(mouseX, mouseY, d.x, d.y); if (dd < best) { best = dd; hoverDot = d; } }
  if (hoverDot) {
    cursor(HAND);
    noFill(); stroke(TXT); strokeWeight(1.5); circle(hoverDot.x, hoverDot.y, 11);
    textSize(12); textStyle(BOLD);
    const t = hoverDot.r.name, tw = textWidth(t) + 20;
    let tx = hoverDot.x - tw / 2; tx = constrain(tx, 8, width - tw - 8);
    const ty = hoverDot.y - 36;
    fill(BG); stroke(TXT); strokeWeight(1); rect(tx, ty, tw, 24, 5);
    noStroke(); fill(TXT); textAlign(LEFT, CENTER); text(t, tx + 10, ty + 13); textStyle(NORMAL);
  } else cursor(ARROW);
}

function mouseReleased() {
  if (hoverDot) window.location.href = 'detail.html?id=' + encodeURIComponent(hoverDot.r.id);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }