/* =====================================================================
   OVERVIEW – I fiumi del mondo (p5.js v2)
   Ogni fiume è un glifo "lecca-lecca":
     • ALTEZZA dello stelo  → lunghezza del fiume (km)
     • DIAMETRO del cerchio → area del bacino (km²)
     • COLORE del cerchio   → portata (m³/s), in 3 classi (bonus)
   Interazione: hover = nome del fiume, click = pagina di dettaglio (?id=)
   ===================================================================== */

// ---------- Palette ----------
const COL = {
  bg:    '#071F26',
  text:  '#D8F3EA',
  blue:  '#2D5FEB',
  cyan:  '#00CDE1',
  green: '#78F55A'
};

// ---------- Parametri di layout ----------
const MARGIN   = 40;   // margine laterale
const HEADER_H = 120;  // altezza zona titolo
const LEGEND_H = 150;  // altezza zona legenda
const CELL_H   = 118;  // altezza di una cella della griglia
const STEM_MIN = 8,  STEM_MAX = 70;   // altezza minima/massima dello stelo (px)
const DIAM_MIN = 6,  DIAM_MAX = 32;   // diametro minimo/massimo del cerchio (px)

// ---------- Dati e stato ----------
let rivers = [];       // array di oggetti {id, name, length, area, discharge}
let stats = {};        // minimi e massimi per le scale
let hovered = null;    // fiume sotto il mouse (o null)
let grid = {};         // cols, rows, cellW (ricalcolati al resize)

// p5 v2: setup può essere async e loadTable restituisce una Promise
async function setup() {
  const table = await loadTable('assets/rivers.csv', ',', 'header');

  // Converto le righe della tabella in oggetti JS semplici
  for (const row of table.getRows()) {
    rivers.push({
      id:        row.getNum('id'),
      name:      row.getString('name'),
      length:    row.getNum('length'),
      area:      row.getNum('area'),
      discharge: row.getNum('discharge')
    });
  }

  // Ordino dal più lungo al più corto: la griglia diventa leggibile
  rivers.sort((a, b) => b.length - a.length);

  // Estremi dei dati, usati dalle scale di mappatura
  stats = {
    lenMin:  min(rivers.map(r => r.length)),
    lenMax:  max(rivers.map(r => r.length)),
    areaMin: min(rivers.map(r => r.area)),
    areaMax: max(rivers.map(r => r.area))
  };

  computeGrid();
  createCanvas(windowWidth, canvasHeight());
  textFont('system-ui, sans-serif');
}

// ---------- Scale di mappatura ----------
// Uso la radice quadrata: le lunghezze/aree variano di ordini di grandezza,
// con una scala lineare quasi tutti i fiumi sarebbero invisibili.
function stemHeight(len) {
  return map(sqrt(len), sqrt(stats.lenMin), sqrt(stats.lenMax), STEM_MIN, STEM_MAX);
}
// Con la radice quadrata del valore, l'AREA del cerchio è proporzionale all'area del bacino
function circleDiam(area) {
  const dMax = min(DIAM_MAX, grid.cellW - 8);
  return map(sqrt(area), sqrt(stats.areaMin), sqrt(stats.areaMax), DIAM_MIN, dMax);
}
// Tre classi di portata, associate ai tre colori di accento
function dischargeColor(q) {
  if (q < 1000)  return COL.blue;
  if (q < 10000) return COL.cyan;
  return COL.green;
}

// ---------- Layout responsive ----------
function computeGrid() {
  grid.cols  = windowWidth >= 1000 ? 20 : (windowWidth >= 600 ? 10 : 5);
  grid.rows  = ceil(rivers.length / grid.cols);
  grid.cellW = (windowWidth - 2 * MARGIN) / grid.cols;
}
function canvasHeight() {
  return HEADER_H + grid.rows * CELL_H + LEGEND_H + MARGIN;
}
function windowResized() {
  computeGrid();
  resizeCanvas(windowWidth, canvasHeight());
}

// ---------- Draw loop ----------
function draw() {
  background(COL.bg);
  if (rivers.length === 0) return;   // dati non ancora caricati

  drawTitle();
  hovered = null;

  // Disegno i glifi nella griglia
  for (let i = 0; i < rivers.length; i++) {
    const r = rivers[i];
    const col = i % grid.cols;
    const row = floor(i / grid.cols);

    // Rettangolo della cella
    const cx0 = MARGIN + col * grid.cellW;
    const cy0 = HEADER_H + row * CELL_H;
    const cx  = cx0 + grid.cellW / 2;      // centro orizzontale del glifo
    const baseY = cy0 + CELL_H - 10;       // linea di base

    // Hit test: il mouse è dentro questa cella?
    const isHover = mouseX >= cx0 && mouseX < cx0 + grid.cellW &&
                    mouseY >= cy0 && mouseY < cy0 + CELL_H;
    if (isHover) hovered = r;

    drawGlyph(r, cx, baseY, isHover);
  }

  drawLegend();
  if (hovered) drawTooltip(hovered);
  cursor(hovered ? 'pointer' : 'default');
}

// Singolo glifo: stelo (lunghezza) + cerchio (area), colore = portata
function drawGlyph(r, cx, baseY, isHover) {
  const h = stemHeight(r.length);
  const d = circleDiam(r.area);
  const c = isHover ? color(COL.text) : color(dischargeColor(r.discharge));

  // Linea di base (sottile, solo come riferimento visivo)
  stroke(255, 255, 255, 25);
  strokeWeight(1);
  line(cx - grid.cellW / 2 + 6, baseY, cx + grid.cellW / 2 - 6, baseY);

  // Stelo: altezza = lunghezza
  stroke(c);
  strokeWeight(isHover ? 3 : 2);
  line(cx, baseY, cx, baseY - h);

  // Cerchio sopra lo stelo: diametro = area del bacino
  noStroke();
  fill(c);
  circle(cx, baseY - h - d / 2, d);
}

// Titolo e sottotitolo (elementi di decodifica)
function drawTitle() {
  noStroke();
  fill(COL.text);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(30);
  text('I fiumi del mondo', MARGIN, 30);

  textStyle(NORMAL);
  textSize(14);
  fill(COL.text);
  text('100 fiumi, ordinati dal più lungo al più corto (lettura da sinistra a destra, dall\'alto in basso).', MARGIN, 72);
  fill(COL.cyan);
  text('Passa il mouse su un glifo per vedere il nome · clicca per aprire il dettaglio.', MARGIN, 92);
}

// Tooltip con il nome del fiume, vicino al cursore
function drawTooltip(r) {
  textSize(14);
  textStyle(BOLD);
  const padX = 10, padY = 7;
  const w = textWidth(r.name) + padX * 2;
  const h = 14 + padY * 2;

  // Tengo il tooltip dentro al canvas
  let x = constrain(mouseX + 14, 8, width - w - 8);
  let y = mouseY - h - 12;
  if (y < 8) y = mouseY + 20;

  fill(COL.bg);
  stroke(COL.cyan);
  strokeWeight(1.5);
  rect(x, y, w, h, 6);

  noStroke();
  fill(COL.text);
  textAlign(LEFT, CENTER);
  text(r.name, x + padX, y + h / 2 + 1);
  textStyle(NORMAL);
}

// Legenda: spiega le tre codifiche visive
function drawLegend() {
  const y0 = height - LEGEND_H;
  const colW = max(220, (width - 2 * MARGIN) / 3);

  // Filetto di separazione
  stroke(255, 255, 255, 40);
  strokeWeight(1);
  line(MARGIN, y0, width - MARGIN, y0);

  noStroke();
  fill(COL.text);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(13);
  text('LEGENDA', MARGIN, y0 + 12);
  textStyle(NORMAL);

  const top = y0 + 40;

  // --- 1) Altezza dello stelo = lunghezza ---
  let x = MARGIN;
  const baseY = top + 85;
  const samples = [stats.lenMin, 1500, stats.lenMax];
  for (let i = 0; i < samples.length; i++) {
    const sx = x + 10 + i * 28;
    stroke(COL.text); strokeWeight(2);
    line(sx, baseY, sx, baseY - stemHeight(samples[i]));
  }
  noStroke(); fill(COL.text); textSize(12);
  text('Altezza dello stelo = lunghezza (km)', x, baseY + 8);
  fill(COL.cyan);
  text(fmt(stats.lenMin) + ' → ' + fmt(stats.lenMax) + ' km  (scala radice)', x + 100, baseY - 40);

  // --- 2) Diametro del cerchio = area del bacino ---
  x = MARGIN + colW;
  const areas = [stats.areaMin, 500000, stats.areaMax];
  let cx = x;
  for (const a of areas) {
    const d = circleDiam(a);
    noStroke(); fill(COL.text);
    circle(cx + d / 2, baseY - 20, d);
    fill(COL.cyan); textSize(11); textAlign(CENTER, TOP);
    text(shortNum(a), cx + d / 2, baseY - 20 + max(d / 2, 8) + 3);
    cx += d + 24;
    textAlign(LEFT, TOP);
  }
  fill(COL.text); textSize(12);
  text('Diametro = area del bacino (km²)', x, baseY + 8);

  // --- 3) Colore = portata ---
  x = MARGIN + colW * 2;
  const classes = [
    { c: COL.blue,  label: '< 1.000 m³/s' },
    { c: COL.cyan,  label: '1.000 – 10.000 m³/s' },
    { c: COL.green, label: '> 10.000 m³/s' }
  ];
  for (let i = 0; i < classes.length; i++) {
    const yy = top + i * 20;
    fill(classes[i].c); noStroke();
    circle(x + 7, yy + 7, 14);
    fill(COL.text); textSize(12);
    text(classes[i].label, x + 22, yy + 1);
  }
  fill(COL.text); textSize(12);
  text('Colore = portata media', x, baseY + 8);
}

// ---------- Interazione ----------
// Click su un glifo → pagina di dettaglio, ID passato come parametro URL
function mouseClicked() {
  if (hovered) {
    window.location.href = 'detail.html?id=' + hovered.id;
  }
}

// ---------- Utilità di formattazione ----------
function fmt(n) { return n.toLocaleString('it-IT'); }
function shortNum(n) {
  if (n >= 1e6) return (n / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' M';
  if (n >= 1e3) return (n / 1e3).toLocaleString('it-IT', { maximumFractionDigits: 0 }) + ' mila';
  return String(n);
}