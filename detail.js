let COL = {
  bg:    '#071F26',
  text:  '#D8F3EA',
  blue:  '#2D5FEB',
  cyan:  '#00CDE1',
  green: '#78F55A'
};

// layout 
let MARGIN = 40;  
let HEADER_H = 120;   
let BOTTOM_MARGIN = 40;   

let river = null;  // fiume scelto
let tempMin = Infinity;  // temperatura media più bassa di tutto il dataset
let tempMax = -Infinity; // temperatura media più alta di tutto il dataset
let riverColor;    // colore del fiume (temperatura)


async function setup() {
  let table = await loadTable('assets/rivers.csv', ',', 'header');

  // Leggo ID dall'URL
  let params = new URLSearchParams(window.location.search);
  let id = Number(params.get('id'));

  // Scorro tutte le righe del CSV per trovare il fiume con quell'ID e la temperatura minima e massima del dataset 
  for (let row of table.getRows()) {
    let temp = row.getNum('avg_temp');
    tempMin = min(tempMin, temp);
    tempMax = max(tempMax, temp);

    if (row.getNum('id') === id) {
      river = {
        id:          id,
        name:        row.getString('name'),
        tributaries: row.getNum('tributaries'),
        avgT:        temp
      };
    }
  }

  createCanvas(windowWidth, windowHeight);

  // Colore del fiume 
  if (river) riverColor = temperatureColor(river.avgT);

  noLoop();  
}


function temperatureColor(temp) {
  // t vale 0 per il fiume più freddo, 1 per il più caldo
  let t = map(temp, tempMin, tempMax, 0, 1);
  if (t < 0.5) {
    return lerpColor(color(COL.blue), color(COL.cyan), t * 2);
  }
  return lerpColor(color(COL.cyan), color(COL.green), (t - 0.5) * 2);
}


function draw() {
  background(COL.bg);

  // Impostazioni per tutti i testi
  noStroke();
  textAlign(LEFT, TOP);

  fill(COL.cyan);
  textStyle(BOLD);
  textSize(15);
  text('← Torna all\'overview', MARGIN, 20);

  drawName();   // nome del fiume
  drawBigNumber();  // numero di affluenti
  drawRiver();  // disegno del fiume con gli affluenti
}

// Nome del fiume 
function drawName() {
  fill(COL.text);
  textStyle(BOLD);
  textSize(28);
  text(river.name, MARGIN, 55, width - 2 * MARGIN, 60);
}

//Numero di affluenti 
function drawBigNumber() {
  let size = 150;
  let areaH = height - HEADER_H - BOTTOM_MARGIN;

  // Lo centro verticalmente 
  let y = HEADER_H + areaH / 2 - size * 0.75;

  // stesso colore del fiume
  textStyle(BOLD);
  textSize(size);
  fill(riverColor);
  text(river.tributaries, MARGIN, y);

  // La parola affluenti
  textStyle(NORMAL);
  textSize(20);
  fill(COL.text);
  text('affluenti', MARGIN + 4, y + size * 1.1);
}


// disegno del fiume con gli affluenti
function drawRiver() {
  let n = river.tributaries;   // quanti rami 

  //Area di disegno
  let x0 = width * 0.40;                          
  let x1 = width - MARGIN;                        
  let areaH = height - HEADER_H - BOTTOM_MARGIN;  
  let centerY = HEADER_H + areaH / 2;            

  // Le curve di bezier 
  // Il fiume passa per alcuni punti prefissati
  // bends: quanto ogni punto sale o scende 
  let bends = [0, -0.04, 0.04, -0.04, 0.04, -0.04, 0.04, 0];
  let segCount = bends.length - 1; // quante curve (tratti) formano il fiume
  let dx = (x1 - x0) / segCount;   // larghezza di ogni tratto

  // Lunghezza dei manici dei punti di controllo 
  let handle = dx * 0.5;

  // Coordinate dei punti di svolta
  let xs = [];
  let ys = [];
  for (let i = 0; i < bends.length; i++) {
    xs.push(x0 + dx * i);
    ys.push(centerY + areaH * bends[i]);
  }

  // Ogni tratto è una curva di Bézier dal punto i al punto i+1: bezier(x1, y1,  controllo1x, controllo1y,  controllo2x, controllo2y,  x2, y2)

  function riverPointAt(pos) {
    let seg = min(floor(pos), segCount - 1); // in quale tratto siamo
    let t = pos - seg; // a che punto del tratto (0 → 1)
    // bezierPoint(a, b, c, d, t) 
    let x = bezierPoint(xs[seg], xs[seg] + handle, xs[seg + 1] - handle, xs[seg + 1], t);
    let y = bezierPoint(ys[seg], ys[seg], ys[seg + 1], ys[seg + 1], t);
    return { x: x, y: y };
  }

  // Quanto sono grandi i rami
  let branchWidth, maxLen, riverWidth;
  if (n < 20) {
    branchWidth = 3;               
    maxLen      = areaH * 0.40;   
    riverWidth  = 8;               
  } else if (n < 100) {
    branchWidth = 1.5;
    maxLen      = areaH * 0.32;
    riverWidth  = 12;
  } else {
    branchWidth = 0.7;             
    maxLen      = areaH * 0.25;    
    riverWidth  = 16;              
  }

  //affluenti) 
  randomSeed(river.id); // così il disegno è uguale a ogni caricamento
  stroke(riverColor);
  strokeWeight(branchWidth);

  for (let i = 0; i < n; i++) {
    // Posizione del ramo lungo il fiume, da sinistra a destra.
    // Parto dal 15% non dall'inizio
    let pos = map(i + 0.5, 0, n, 0.15 * segCount, 0.99 * segCount);
    let p = riverPointAt(pos);   // punto del fiume in cui il ramo si attacca

    // Un ramo sale, il successivo scende, e così via
    let dir = 1;                   // 1 = verso il basso
    if (i % 2 === 0) {
      dir = -1;                    // -1 = verso l'alto
    }

    // Lunghezza del ramo RANDOM
    let len = maxLen * random(0.4, 1);

    // Il ramo parte dal fiume e si allontana in diagonale
    line(p.x, p.y, p.x - len * 0.5, p.y + dir * len);
  }

  // fiume principale sopra i rami
  strokeWeight(riverWidth);
  noFill();  
  for (let i = 0; i < segCount; i++) {
    bezier(xs[i], ys[i],
           xs[i] + handle, ys[i],          // primo punto di controllo
           xs[i + 1] - handle, ys[i + 1],  // secondo punto di controllo
           xs[i + 1], ys[i + 1]);
  }
}
//Torna all'overwiew
function overLink() {
  return mouseX > MARGIN && mouseX < MARGIN + 180 && mouseY > 15 && mouseY < 42;
}

function mouseClicked() {
  if (overLink()) window.location.href = 'index.html';
}
// cursore diventa una manina
function mouseMoved() {
  cursor(overLink() ? 'pointer' : 'default');
}