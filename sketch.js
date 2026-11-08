// OVERVIEW – glifo composto per ogni fiume, comparabile in orizzontale
//  • Altezza stelo ........ lunghezza (km)            • Spessore stelo ... portata (scala log)
//  • Raggio cerchio ....... area del bacino (√area)   • Tacche attorno ... n. affluenti (scala log)
//  • Colore ............... temperatura media         • Capsula sotto .... intervallo temp. min–max
// Interazioni: ordina per variabile · scorri (rotellina / trascina / barra) · hover SOLO sul glifo · click = dettaglio

const BG = '#071F26', TXT = '#D8F3EA';
const BLUE = '#2D5FEB', CYAN = '#00CDE1', GREEN = '#78F55A';

const STEP = 28;            // larghezza di ogni colonna
const LEFT = 78, RIGHT = 24;
const TOP = 190, BOTTOM = 120;
const R_MAX = 12;
const T_LO = -25, T_HI = 35;       // scala capsula
const C_LO = -10, C_HI = 30;       // dominio del colore

const SORTS = [
  { key: 'length',    label: 'Lunghezza' },
  { key: 'area',      label: 'Area bacino' },
  { key: 'discharge', label: 'Portata' },
  { key: 'trib',      label: 'Affluenti' },
  { key: 'avgTemp',   label: 'Temp. media' }
];

let rivers = [], stats = {};
let sortKey = 'length';
let scrollX = 0, dragMoved = 0, thumbDrag = false;
let hover = null, chips = [];
let baseY, maxStem;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  const table = await loadTable('assets/rivers.csv', ',', 'header');
  rivers = table.getRows().map(r => ({
    id: r.getString('id'), name: r.getString('name'),
    length: r.getNum('length'), area: r.getNum('area'),
    discharge: r.getNum('discharge'), trib: r.getNum('tributaries'),
    minT: r.getNum('min_temp'), maxT: r.getNum('max_temp'), avgTemp: r.getNum('avg_temp')
  }));
  const ext = k => [Math.min(...rivers.map(r => r[k])), Math.max(...rivers.map(r => r[k]))];
  stats = { length: ext('length'), area: ext('area'), discharge: ext('discharge'), trib: ext('trib') };
  applySort(true);
}

function applySort(instant) {
  rivers.sort((a, b) => b[sortKey] - a[sortKey]);
  rivers.forEach((r, i) => { r.slot = i; if (instant) r.px = i; });
}

function tempColor(t) {
  const n = constrain(map(t, C_LO, C_HI, 0, 1), 0, 1);
  return n < 0.5 ? lerpColor(color(BLUE), color(CYAN), n * 2)
                 : lerpColor(color(CYAN), color(GREEN), (n - 0.5) * 2);
}
const fmt = n => n.toLocaleString('it-IT');
const capY = t => baseY + 18 + map(constrain(t, T_LO, T_HI), T_HI, T_LO, 0, 58);
const maxScroll = () => max(0, rivers.length * STEP - (width - LEFT - RIGHT));

function geom(r) {
  const sx = LEFT + STEP * (r.px + 0.5) - scrollX;
  const h = map(r.length, 0, stats.length[1], 3, maxStem);
  return {
    sx, topY: baseY - h,
    rad: map(sqrt(r.area), sqrt(stats.area[0]), sqrt(stats.area[1]), 2.5, R_MAX),
    sw: map(log(r.discharge), log(stats.discharge[0]), log(stats.discharge[1]), 1, 4.5),
    nTick: round(map(log(r.trib), log(2), log(1100), 3, 12))
  };
}

// Hit-test: true solo se il mouse è sul cerchio, sullo stelo o sulla capsula del fiume
function hitDist(r) {
  const g = geom(r);
  const dc = dist(mouseX, mouseY, g.sx, g.topY);
  if (dc <= g.rad + 6) return dc;
  if (abs(mouseX - g.sx) <= max(g.sw / 2, 3) + 1.5 && mouseY >= g.topY && mouseY <= baseY) return abs(mouseX - g.sx);
  if (abs(mouseX - g.sx) <= 5 && mouseY >= capY(T_HI) - 3 && mouseY <= capY(T_LO) + 3) return abs(mouseX - g.sx);
  return Infinity;
}

function draw() {
  background(BG);
  if (!rivers.length) return;
  baseY = height - BOTTOM;
  maxStem = baseY - TOP - R_MAX - 16;
  scrollX = constrain(scrollX, 0, maxScroll());

  rivers.forEach(r => r.px = lerp(r.px, r.slot, 0.14));

  // hover
  hover = null;
  const overChip = chips.some(c => mouseX > c.x && mouseX < c.x + c.w && mouseY > c.y && mouseY < c.y + c.h);
  const busy = thumbDrag || (mouseIsPressed && dragMoved > 5);
  if (!busy && !overChip && mouseY > TOP - 30 && mouseY < baseY + 85 && mouseX > LEFT) {
    let best = Infinity;
    for (const r of rivers) { const d = hitDist(r); if (d < best) { best = d; hover = r; } }
  }

  drawGrid();

  // glifi (clip sulla zona scorrevole)
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(LEFT - 4, TOP - 40, width - LEFT + 4, height - TOP + 40);
  drawingContext.clip();
  for (const r of rivers) if (r !== hover) drawGlyph(r, false);
  if (hover) drawGlyph(hover, true);
  drawingContext.restore();

  drawScrollbar();
  drawHeader();
  drawLegend();
  if (hover) drawTooltip(hover);
  cursor(hover || overChip ? HAND : ARROW);
}

function drawGrid() {
  // griglia lunghezza
  textSize(11); textAlign(RIGHT, CENTER);
  for (const v of [0, 2000, 4000, 6000]) {
    const y = baseY - map(v, 0, stats.length[1], 0, maxStem);
    stroke(216, 243, 234, v === 0 ? 90 : 28); strokeWeight(1);
    line(LEFT, y, width - RIGHT, y);
    noStroke(); fill(TXT); drawingContext.globalAlpha = 0.65;
    text(fmt(v) + ' km', LEFT - 10, y);
    drawingContext.globalAlpha = 1;
  }
  // scala capsule + linea 0 °C
  drawingContext.setLineDash([3, 4]);
  stroke(216, 243, 234, 60); strokeWeight(1);
  line(LEFT, capY(0), width - RIGHT, capY(0));
  drawingContext.setLineDash([]);
  noStroke(); fill(TXT); drawingContext.globalAlpha = 0.65;
  for (const t of [35, 0, -25]) text(t + ' °C', LEFT - 10, capY(t));
  drawingContext.globalAlpha = 1;
}

function drawGlyph(r, hot) {
  const g = geom(r);
  if (g.sx < LEFT - 30 || g.sx > width + 30) return;
  const c = tempColor(r.avgTemp);
  drawingContext.globalAlpha = hover && !hot ? 0.35 : 1;

  // stelo
  stroke(c); strokeWeight(hot ? g.sw + 1.5 : g.sw); strokeCap(ROUND);
  line(g.sx, baseY, g.sx, g.topY);

  // tacche affluenti
  strokeWeight(hot ? 2 : 1.3);
  for (let k = 0; k < g.nTick; k++) {
    const a = -HALF_PI + (TWO_PI * k) / g.nTick;
    line(g.sx + cos(a) * (g.rad + 3), g.topY + sin(a) * (g.rad + 3),
         g.sx + cos(a) * (g.rad + 7), g.topY + sin(a) * (g.rad + 7));
  }

  // cerchio area
  fill(red(c), green(c), blue(c), hot ? 190 : 80); stroke(c); strokeWeight(hot ? 2.5 : 1.5);
  circle(g.sx, g.topY, g.rad * 2);

  // capsula temperatura
  stroke(216, 243, 234, 45); strokeWeight(7);
  line(g.sx, capY(T_HI), g.sx, capY(T_LO));
  strokeCap(SQUARE); strokeWeight(7);
  for (let t = r.minT; t < r.maxT; t += 1) {
    stroke(tempColor(t + 0.5));
    line(g.sx, capY(min(t + 1, r.maxT)), g.sx, capY(t));
  }
  strokeCap(ROUND);
  fill(BG); stroke(TXT); strokeWeight(1.5);
  circle(g.sx, capY(r.avgTemp), 6);

  drawingContext.globalAlpha = 1;
}

function drawScrollbar() {
  if (maxScroll() <= 0) return;
  const y = height - 24, x0 = LEFT, w = width - LEFT - RIGHT;
  const tw = max(40, w * (w / (rivers.length * STEP)));
  const tx = x0 + (scrollX / maxScroll()) * (w - tw);
  stroke(216, 243, 234, 40); strokeWeight(4); line(x0, y, x0 + w, y);
  stroke(CYAN); strokeWeight(6); line(tx, y, tx + tw, y);
  noStroke(); fill(TXT); textSize(11); textAlign(LEFT, CENTER);
  drawingContext.globalAlpha = 0.6;
  text('Scorri con la rotellina, trascinando o con la barra', x0, y - 14);
  drawingContext.globalAlpha = 1;
}

function drawHeader() {
  noStroke(); fill(TXT); textAlign(LEFT, TOP);
  textSize(26); textStyle(BOLD); text('I 100 fiumi più lunghi del mondo', 30, 22); textStyle(NORMAL);
  textSize(13); drawingContext.globalAlpha = 0.75;
  text('Un glifo per fiume · passa sul fiume per i dati · clicca per il dettaglio', 30, 58);
  drawingContext.globalAlpha = 1;

  // chip di ordinamento
  textSize(12); textAlign(LEFT, CENTER);
  fill(TXT); drawingContext.globalAlpha = 0.7; text('Ordina per', 30, 108); drawingContext.globalAlpha = 1;
  chips = [];
  let x = 110;
  for (const s of SORTS) {
    const w = textWidth(s.label) + 22, h = 26, y = 95;
    const on = s.key === sortKey;
    chips.push({ x, y, w, h, key: s.key });
    fill(on ? CYAN : BG); stroke(on ? CYAN : color(216, 243, 234, 110)); strokeWeight(1);
    rect(x, y, w, h, 13);
    noStroke(); fill(on ? BG : TXT); textAlign(CENTER, CENTER);
    text(s.label, x + w / 2, y + h / 2 + 1);
    x += w + 8;
  }
}

function drawLegend() {
  const w = 430, h = 168, x0 = max(width - RIGHT - w, 30), y0 = 12;
  fill(7, 31, 38, 235); stroke(216, 243, 234, 70); strokeWeight(1); rect(x0, y0, w, h, 8);
  noStroke(); fill(TXT); textSize(11); textAlign(LEFT, CENTER);
  textStyle(BOLD); text('COME LEGGERE IL GLIFO', x0 + 16, y0 + 16); textStyle(NORMAL);

  // glifo di esempio
  const sx = x0 + 34, cy = y0 + 54, bY = y0 + 108;
  const c = color(CYAN);
  stroke(c); strokeWeight(3); line(sx, bY, sx, cy);
  strokeWeight(1.3);
  for (let k = 0; k < 8; k++) {
    const a = -HALF_PI + TWO_PI * k / 8;
    line(sx + cos(a) * 14, cy + sin(a) * 14, sx + cos(a) * 18, cy + sin(a) * 18);
  }
  fill(0, 205, 225, 80); stroke(c); strokeWeight(1.5); circle(sx, cy, 22);
  stroke(216, 243, 234, 45); strokeWeight(7); line(sx, bY + 12, sx, bY + 40);
  stroke(GREEN); line(sx, bY + 18, sx, bY + 34);
  fill(BG); stroke(TXT); strokeWeight(1.5); circle(sx, bY + 27, 6);

  noStroke(); fill(TXT); textSize(11); textAlign(LEFT, CENTER);
  text('Cerchio = area del bacino',    sx + 34, cy - 8);
  text('Tacche = numero di affluenti', sx + 34, cy + 8);
  text('Altezza = lunghezza',          sx + 34, y0 + 84);
  text('Spessore = portata',           sx + 34, y0 + 100);
  text('Capsula = temp. min–max',      sx + 34, bY + 22);
  text('(pallino = media)',            sx + 34, bY + 36);

  // barra colore
  const bx = x0 + 250, by = y0 + 50, bw = 160;
  noStroke(); fill(TXT); textAlign(LEFT, CENTER); textSize(11);
  text('Colore = temperatura media', bx, y0 + 34);
  for (let i = 0; i < bw; i++) { stroke(tempColor(map(i, 0, bw, C_LO, C_HI))); line(bx + i, by, bx + i, by + 12); }
  textAlign(CENTER, TOP);
  for (const t of [-10, 0, 10, 20, 30]) {
    const tx = bx + map(t, C_LO, C_HI, 0, bw);
    stroke(TXT); strokeWeight(1); line(tx, by + 12, tx, by + 17);
    noStroke(); fill(TXT); text(t + '°', tx, by + 23);
  }
  textAlign(LEFT, TOP); fill(TXT); drawingContext.globalAlpha = 0.65;
  text('Linea tratteggiata = 0 °C', bx, y0 + 108);
  text('Scala capsula: da −25 a 35 °C', bx, y0 + 124);
  drawingContext.globalAlpha = 1;
}

function drawTooltip(r) {
  const lines = [
    ['b', r.name],
    ['n', 'Lunghezza  ' + fmt(r.length) + ' km'],
    ['n', 'Area bacino  ' + fmt(r.area) + ' km²'],
    ['n', 'Portata  ' + fmt(r.discharge) + ' m³/s'],
    ['n', 'Affluenti  ' + fmt(r.trib)],
    ['n', 'Temp.  ' + r.minT + ' … ' + r.maxT + ' °C (media ' + r.avgTemp + ')']
  ];
  textSize(13);
  let w = 0;
  for (const [s, t] of lines) { textStyle(s === 'b' ? BOLD : NORMAL); w = max(w, textWidth(t)); }
  w += 24; const h = lines.length * 20 + 14;
  let tx = mouseX + 18, ty = mouseY - h - 10;
  if (tx + w > width - 8) tx = mouseX - w - 18;
  if (ty < 8) ty = mouseY + 18;
  fill(BG); stroke(TXT); strokeWeight(1); rect(tx, ty, w, h, 6);
  noStroke(); fill(TXT); textAlign(LEFT, CENTER);
  lines.forEach(([s, t], i) => { textStyle(s === 'b' ? BOLD : NORMAL); text(t, tx + 12, ty + 17 + i * 20); });
  textStyle(NORMAL);
}

// ---- interazione
function mousePressed() {
  dragMoved = 0;
  const y = height - 24;
  if (maxScroll() > 0 && mouseY > y - 10 && mouseY < y + 10 && mouseX > LEFT) {
    thumbDrag = true;
    const w = width - LEFT - RIGHT, tw = max(40, w * (w / (rivers.length * STEP)));
    scrollX = map(mouseX - tw / 2, LEFT, LEFT + w - tw, 0, maxScroll(), true);
  }
}
function mouseDragged() {
  dragMoved += abs(movedX) + abs(movedY);
  if (thumbDrag) {
    const w = width - LEFT - RIGHT, tw = max(40, w * (w / (rivers.length * STEP)));
    scrollX += movedX * (maxScroll() / (w - tw));
  } else {
    scrollX -= movedX;
  }
  scrollX = constrain(scrollX, 0, maxScroll());
}
function mouseReleased() {
  const wasThumb = thumbDrag; thumbDrag = false;
  if (wasThumb || dragMoved > 5) return;
  for (const c of chips) {
    if (mouseX > c.x && mouseX < c.x + c.w && mouseY > c.y && mouseY < c.y + c.h) {
      sortKey = c.key; applySort(false); return;
    }
  }
  if (hover) window.location.href = 'detail.html?id=' + encodeURIComponent(hover.id);
}
function mouseWheel(e) {
  scrollX = constrain(scrollX + e.deltaX + e.deltaY, 0, maxScroll());
  return false;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }