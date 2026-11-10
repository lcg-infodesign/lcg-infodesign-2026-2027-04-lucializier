/* =====================================================================
   DETTAGLIO – singolo fiume (p5.js v2)
   Legge ?id= dall'URL, filtra il dataset e mostra:
     - spessore della linea = portata
     - numero di rami verdi = affluenti (scala logaritmica)
     - barra min–max con marcatore della media = temperatura
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

const MARGIN     = 40;
const TOP_OFFSET = 64;    // spazio riservato in alto per il link "Torna all'overview"
const CONTENT_H  = 800;   // altezza del contenuto sotto il link
const T_MIN = -25, T_MAX = 35;   // estremi della scala termica (°C)

let all = [];        // tutti i fiumi
let river = null;    // fiume selezionato (o null se ID non valido)
let stats = {};      // min/max del dataset per le scale

// Larghezza utile della finestra (esclude l'eventuale scrollbar verticale)
function viewW() { return document.documentElement.clientWidth; }

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

  // Estremi del dataset per normalizzare le scale
  stats = {
    q:    [min(all.map(r => r.discharge)),   max(all.map(r => r.discharge))],
    trib: [min(all.map(r => r.tributaries)), max(all.map(r => r.tributaries))]
  };

  // Canvas a tutta larghezza, posizionato in alto a sinistra
  createCanvas(viewW(), CONTENT_H + TOP_OFFSET);
  const c = document.querySelector('canvas');
  c.style.position = 'absolute';
  c.style.left = '0';
  c.style.top = '0';
  document.body.style.background = COL.bg;
  document.body.style.margin = '0';

  setupBackLink();
  textFont('system-ui, sans-serif');
  noLoop();   // pagina statica: disegno una volta (e al resize)
}

// Link "Torna all'overview": usa quello nell'HTML se c'è, altrimenti lo crea.
// È posizionato nella fascia alta riservata (TOP_OFFSET), quindi non si sovrappone al titolo.
function setupBackLink() {
  let a = document.getElementById('back');
  if (!a) {
    a = document.createElement('a');
    a.id = 'back';
    a.href = 'index.html';
    a.textContent = '← Torna all\'overview';
    document.body.appendChild(a);
  }
  a.style.position = 'absolute';
  a.style.top = '20px';
  a.style.left = MARGIN + 'px';
  a.style.zIndex = '10';
  a.style.padding = '0';
  a.style.font = '600 15px system-ui, sans-serif';
  a.style.color = COL.cyan;
  a.style.textDecoration = 'none';
}

function windowResized() {
  resizeCanvas(viewW(), CONTENT_H + TOP_OFFSET);
  redraw();
}

function draw() {
  background(COL.bg);
  translate(0, TOP_OFFSET);   // tutto il contenuto parte sotto il link

  // ID mancante o non valido
  if (!river) {
    noStroke(); fill(COL.text);
    textAlign(LEFT, TOP); textSize(22);
    text('Fiume non trovato. Controlla l\'ID nell\'URL o torna all\'overview.', MARGIN, 20);
    return;
  }

  drawHeader();        // titolo e dati testuali
  drawRiver();         // corso d'acqua (portata + affluenti)
  drawTemperature();   // temperatura
  drawLegend();        // legenda
}

// ---------- Intestazione ----------
function drawHeader() {
  noStroke();
  textAlign(LEFT, TOP);

  fill(COL.text);
  textStyle(BOLD);
  textSize(28);
  text(river.name, MARGIN, 0, width - 2 * MARGIN, 80);   // il testo va a capo da solo

  textStyle(NORMAL);
  textSize(14);
  fill(COL.cyan);
  text(river.continent + '  ·  sfocia in: ' + river.outflow, MARGIN, 84);
  fill(COL.text);
  text('Paesi attraversati: ' + river.countries, MARGIN, 106, width - 2 * MARGIN, 40);
}

// ---------- Corso d'acqua ----------
function drawRiver() {
  const top = 160;
  const x0 = MARGIN + 10, x1 = width - MARGIN - 10;
  const cy = top + 120;      // asse centrale del fiume
  const amp = 45;            // ampiezza dei meandri
  const waves = 2.5;         // numero di onde

  // Ordinata del fiume in un punto x
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
    noStroke(); fill(COL.green);
    circle(bx + slant, by + dir * len, 5);        // punto in cima al ramo
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

  // Valori numerici
  noStroke(); fill(COL.text);
  textAlign(LEFT, TOP); textSize(14);
  text('Portata: ' + fmt(river.discharge) + ' m³/s   ·   Affluenti: ' + fmt(river.tributaries),
       MARGIN, top + 230);
}

// ---------- Temperatura ----------
function drawTemperature() {
  const top = 420;
  const bx0 = MARGIN + 10, bx1 = width - MARGIN - 10;
  const barY = top + 50, barH = 26;
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

  // Barra min–max con gradiente freddo→caldo (blu → ciano → verde)
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

// ---------- Legenda ----------
function drawLegend() {
  const top = 600;

  // Filetto e titolo
  stroke(255, 255, 255, 40); strokeWeight(1);
  line(MARGIN, top, width - MARGIN, top);
  noStroke(); fill(COL.text);
  textAlign(LEFT, TOP); textStyle(BOLD); textSize(13);
  text('LEGENDA', MARGIN, top + 10);
  textStyle(NORMAL);

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
      text: 'Triangolo bianco: temperatura media.' }
  ];

  textSize(12);
  for (let i = 0; i < rows.length; i++) {
    const col = i % 2, row = floor(i / 2);
    const x = MARGIN + col * colW + 10;
    const y = top + 45 + row * 44;
    rows[i].draw(x, y);
    noStroke(); fill(COL.text);
    textAlign(LEFT, TOP); textStyle(NORMAL);
    text(rows[i].text, x + 42, y - 2, colW - 70, 40);
  }
}

// Formatta i numeri all'italiana, con separatore delle migliaia anche sulle 4 cifre
function fmt(n) { return n.toLocaleString('it-IT', { useGrouping: 'always' }); }