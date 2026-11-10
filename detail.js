/* =====================================================================
   DETTAGLIO – singolo fiume (p5.js v2)
   Legge ?id= dall'URL, filtra il dataset e mostra:
     A) Corso d'acqua: spessore della linea = portata,
        numero di rami verdi = affluenti (scala logaritmica)
     B) Temperatura: barra min–max con marcatore della media
     C) Posizione nel dataset: lunghezza, area, portata (rango su 100)
   Legenda in fondo alla pagina.
   ===================================================================== */

// ---------- Palette ----------
const COL = {
  bg:    '#071F26',
  text:  '#D8F3EA',
  blue:  '#2D5FEB',
  cyan:  '#00CDE1',
  green: '#78F55A'
};

const MARGIN   = 40;
const MAX_W    = 1100;   // larghezza massima del canvas
const CANVAS_H = 1060;
const T_MIN = -25, T_MAX = 35;   // estremi della scala termica (°C)

let all = [];        // tutti i fiumi
let river = null;    // fiume selezionato (o null se ID non valido)
let stats = {};      // min/max del dataset per le scale

async function setup() {
  const table = await loadTable('assets/rivers.csv', ',', 'header');

  // Trasformo ogni riga in un oggetto con tutti i campi
  for (const row of table.getRows()) {
    all.push({
      id:          row.getNum('id'),
      name:        row.getString('name'),
      countries:   row.getString('countries'),
      length:      row.getNum('length'),
      area:        row.getNum('area'),
      discharge:   row.getNum('discharge'),
      outflow:     row.getString('outflow'),
      continent:   row.getString('continent'),
      tributaries: row.getNum('tributaries'),
      minT:        row.getNum('min_temp'),
      maxT:        row.getNum('max_temp'),
      avgT:        row.getNum('avg_temp')
    });
  }

  // Leggo il parametro ID dall'URL (es. detail.html?id=3) e filtro i dati
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  river = all.find(r => r.id === id) || null;

  // Estremi del dataset per normalizzare i confronti
  stats = {
    len:  [min(all.map(r => r.length)),      max(all.map(r => r.length))],
    area: [min(all.map(r => r.area)),        max(all.map(r => r.area))],
    q:    [min(all.map(r => r.discharge)),   max(all.map(r => r.discharge))],
    trib: [min(all.map(r => r.tributaries)), max(all.map(r => r.tributaries))]
  };

  createCanvas(min(windowWidth, MAX_W), CANVAS_H);
  textFont('system-ui, sans-serif');
  noLoop();   // pagina statica: disegno una volta (e al resize)
}

function windowResized() {
  resizeCanvas(min(windowWidth, MAX_W), CANVAS_H);
  redraw();
}

function draw() {
  background(COL.bg);

  // ID mancante o non valido
  if (!river) {
    noStroke(); fill(COL.text);
    textAlign(LEFT, TOP); textSize(22);
    text('Fiume non trovato. Controlla l\'ID nell\'URL o torna all\'overview.', MARGIN, 60);
    return;
  }

  drawHeader();        // titolo e dati testuali
  drawRiver();         // sezione A
  drawTemperature();   // sezione B
  drawComparison();    // sezione C
  drawLegend();        // legenda
}

// ---------- Intestazione ----------
function drawHeader() {
  noStroke();
  textAlign(LEFT, TOP);

  fill(COL.text);
  textStyle(BOLD);
  textSize(28);
  text(river.name, MARGIN, 24, width - 2 * MARGIN, 80);   // il testo va a capo da solo

  textStyle(NORMAL);
  textSize(14);
  fill(COL.cyan);
  text(river.continent + '  ·  sfocia in: ' + river.outflow, MARGIN, 108);
  fill(COL.text);
  text('Paesi attraversati: ' + river.countries, MARGIN, 130, width - 2 * MARGIN, 40);
}

// Titolo di sezione con filetto
function sectionTitle(label, y) {
  stroke(255, 255, 255, 40); strokeWeight(1);
  line(MARGIN, y, width - MARGIN, y);
  noStroke(); fill(COL.green);
  textAlign(LEFT, TOP); textStyle(BOLD); textSize(13);
  text(label, MARGIN, y + 10);
  textStyle(NORMAL);
}

// ---------- A) Corso d'acqua ----------
function drawRiver() {
  const top = 180;
  sectionTitle('A · CORSO D\'ACQUA', top);

  const x0 = MARGIN + 10, x1 = width - MARGIN - 10;
  const cy = top + 150;      // asse centrale del fiume
  const amp = 45;            // ampiezza dei meandri
  const waves = 2.5;         // numero di onde

  // Funzione che restituisce l'ordinata del fiume in un punto x
  const riverY = x => cy + amp * sin(map(x, x0, x1, 0, TWO_PI * waves));

  // Spessore della linea = portata (scala logaritmica)
  const w = map(log(river.discharge), log(stats.q[0]), log(stats.q[1]), 3, 28);

  // Affluenti: numero di rami (scala log, da 2 a 40 rami disegnati)
  const nBranches = round(map(log(river.tributaries), log(stats.trib[0]), log(stats.trib[1]), 2, 40));

  // Rami verdi: posizioni uniformi lungo il fiume, alternati sopra/sotto.
  // randomSeed(id) rende il disegno identico a ogni caricamento.
  randomSeed(river.id);
  stroke(COL.green);
  strokeWeight(2);
  strokeCap(ROUND);
  for (let i = 0; i < nBranches; i++) {
    const bx = map(i, 0, nBranches - 1 || 1, x0 + 20, x1 - 20);
    const by = riverY(bx);
    const dir = (i % 2 === 0) ? -1 : 1;           // sopra o sotto
    const len = random(30, 75);
    const slant = random(-25, -8);                // i rami puntano controcorrente
    line(bx, by, bx + slant, by + dir * len);
    // piccolo punto in cima al ramo
    noStroke(); fill(COL.green);
    circle(bx + slant, by + dir * len, 5);
    stroke(COL.green);
  }

  // Fiume principale: polilinea con spessore = portata
  noFill();
  stroke(COL.cyan);
  strokeWeight(w);
  strokeJoin(ROUND);
  beginShape();
  for (let x = x0; x <= x1; x += 4) vertex(x, riverY(x));
  endShape();

  // Valori numerici a lato
  noStroke(); fill(COL.text);
  textAlign(LEFT, TOP); textSize(14);
  text('Portata: ' + fmt(river.discharge) + ' m³/s   ·   Affluenti: ' + fmt(river.tributaries),
       MARGIN, top + 255);
}

// ---------- B) Temperatura ----------
function drawTemperature() {
  const top = 470;
  sectionTitle('B · TEMPERATURA (°C)', top);

  const bx0 = MARGIN + 10, bx1 = width - MARGIN - 10;
  const barY = top + 70, barH = 26;
  const tx = t => map(t, T_MIN, T_MAX, bx0, bx1);   // temperatura → ascissa

  // Asse con tacche ogni 10 °C
  stroke(255, 255, 255, 60); strokeWeight(1);
  line(bx0, barY + barH + 14, bx1, barY + barH + 14);
  noStroke(); fill(COL.text); textSize(11); textAlign(CENTER, TOP);
  for (let t = -20; t <= 30; t += 10) {
    stroke(255, 255, 255, 60);
    line(tx(t), barY + barH + 10, tx(t), barY + barH + 18);
    noStroke();
    text(t, tx(t), barY + barH + 22);
  }

  // Barra min–max colorata con gradiente freddo→caldo (blu → ciano → verde)
  noStroke();
  for (let x = tx(river.minT); x < tx(river.maxT); x += 1) {
    const t = map(x, bx0, bx1, 0, 1);
    const c = t < 0.5 ? lerpColor(color(COL.blue), color(COL.cyan), t * 2)
                      : lerpColor(color(COL.cyan), color(COL.green), (t - 0.5) * 2);
    fill(c);
    rect(x, barY, 1.5, barH);
  }

  // Etichette di minima e massima
  fill(COL.text); textSize(13); textStyle(BOLD);
  textAlign(RIGHT, CENTER);
  text(river.minT + ' °C', tx(river.minT) - 8, barY + barH / 2);
  textAlign(LEFT, CENTER);
  text(river.maxT + ' °C', tx(river.maxT) + 8, barY + barH / 2);

  // Marcatore della media: triangolo sopra la barra
  const ax = tx(river.avgT);
  fill(COL.text);
  triangle(ax - 7, barY - 16, ax + 7, barY - 16, ax, barY - 3);
  textAlign(CENTER, BOTTOM);
  text('media ' + river.avgT + ' °C', ax, barY - 20);
  textStyle(NORMAL);
}

// ---------- C) Posizione nel dataset ----------
function drawComparison() {
  const top = 680;
  sectionTitle('C · POSIZIONE NEL DATASET (100 FIUMI)', top);

  // Tre grandezze: etichetta, valore, estremi, colore
  const items = [
    { label: 'Lunghezza',     key: 'length',    range: stats.len,  unit: 'km',   col: COL.cyan  },
    { label: 'Area bacino',   key: 'area',      range: stats.area, unit: 'km²',  col: COL.blue  },
    { label: 'Portata',       key: 'discharge', range: stats.q,    unit: 'm³/s', col: COL.green }
  ];

  const bx0 = MARGIN + 130, bx1 = width - MARGIN - 160;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const y = top + 50 + i * 55;
    const v = river[it.key];

    // Rango: 1 = il più grande del dataset
    const rank = all.filter(r => r[it.key] > v).length + 1;

    // Lunghezza di riempimento: scala logaritmica (min 2%)
    const frac = max(0.02, map(log(v), log(it.range[0]), log(it.range[1]), 0, 1));

    // Etichetta a sinistra
    noStroke(); fill(COL.text);
    textAlign(LEFT, CENTER); textSize(14); textStyle(BOLD);
    text(it.label, MARGIN + 10, y + 10);
    textStyle(NORMAL);

    // Binario (intero intervallo del dataset) e riempimento
    fill(255, 255, 255, 25);
    rect(bx0, y, bx1 - bx0, 20, 4);
    fill(it.col);
    rect(bx0, y, (bx1 - bx0) * frac, 20, 4);

    // Valore e rango a destra
    fill(COL.text); textSize(13);
    text(fmt(v) + ' ' + it.unit, bx1 + 12, y + 3);
    fill(it.col); textSize(12);
    text('n° ' + rank + ' su ' + all.length, bx1 + 12, y + 18);
  }
}

// ---------- Legenda ----------
function drawLegend() {
  const top = 880;
  sectionTitle('LEGENDA', top);

  const colW = (width - 2 * MARGIN) / 2;
  const rows = [
    { draw: (x, y) => { stroke(COL.cyan); strokeWeight(3); line(x, y + 7, x + 12, y + 7);
                        strokeWeight(9);  line(x + 16, y + 7, x + 30, y + 7); },
      text: 'Linea azzurra: il fiume. Più è spessa, più è alta la portata (scala log).' },
    { draw: (x, y) => { stroke(COL.green); strokeWeight(2); line(x + 4, y + 14, x + 14, y);
                        line(x + 20, y + 14, x + 28, y + 2); },
      text: 'Rami verdi: affluenti. Il loro numero cresce con gli affluenti (scala log, max 40).' },
    { draw: (x, y) => { noStroke();
                        for (let i = 0; i < 30; i++) {
                          const t = i / 29;
                          fill(t < 0.5 ? lerpColor(color(COL.blue), color(COL.cyan), t * 2)
                                       : lerpColor(color(COL.cyan), color(COL.green), (t - 0.5) * 2));
                          rect(x + i, y + 1, 1.5, 12);
                        } },
      text: 'Barra a gradiente: intervallo di temperatura minima–massima.' },
    { draw: (x, y) => { noStroke(); fill(COL.text); triangle(x + 8, y, x + 22, y, x + 15, y + 12); },
      text: 'Triangolo bianco: temperatura media.' },
    { draw: (x, y) => { noStroke(); fill(255, 255, 255, 25); rect(x, y + 1, 30, 12, 3);
                        fill(COL.cyan); rect(x, y + 1, 18, 12, 3); },
      text: 'Barre di confronto: posizione tra il minimo e il massimo del dataset (scala log).' }
  ];

  textSize(12);
  for (let i = 0; i < rows.length; i++) {
    const col = i % 2, row = floor(i / 2);
    const x = MARGIN + col * colW + 10;
    const y = top + 40 + row * 44;
    rows[i].draw(x, y);
    noStroke(); fill(COL.text);
    textAlign(LEFT, TOP); textStyle(NORMAL);
    text(rows[i].text, x + 42, y - 2, colW - 70, 40);
  }
}

// Formatta i numeri all'italiana (separatore delle migliaia)
function fmt(n) { return n.toLocaleString('it-IT'); }