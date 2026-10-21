// ==========================================
// MOTOR DEL MAPA CLARIOS: PORTAL, COLISIONES, VISTA DINAMICA & NPCS
// Con sistema de lista de expertos y pathfinding automatico
// ==========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const posDisplay = document.getElementById("pos-display");
const clickDisplay = document.getElementById("click-display");

ctx.imageSmoothingEnabled = false;

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 640;
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;

const MAP_SCALE = 2;
const TILE_SIZE = 16;
const WORLD_TILE = TILE_SIZE * MAP_SCALE;

let mapData = null;
let tilesetImage = null;
let walkerSheet = null;
let preRenderedMap = null;

let logoScreenImg = null;
let npcOakImg = null;
let npcLeafImg = null;
let npcErikaImg = null;

const walkerSprite = {
  cellW: 32,
  cellH: 32,
  drawW: 64,
  drawH: 64,
  rows: { down: 0, left: 1, up: 2, right: 3 },
};

const player = {
  x: 21.5 * WORLD_TILE,
  y: 58.5 * WORLD_TILE,
  speed: 150,
  dir: "down",
  moving: false,
  frame: 1,
};

let currentZone = "exterior";

const transition = {
  active: false,
  startTime: 0,
  duration: 3000,
  targetZone: "interior",
  targetX: 20.5 * WORLD_TILE,
  targetY: 19 * WORLD_TILE,
  targetDir: "up",
};

// ===== PATHFINDING AUTOMATICO HACIA NPC =====
const autoWalk = {
  active: false,
  path: [],        // Array de {tileX, tileY} a seguir
  stepIndex: 0,
  targetNpcIdx: -1,
};

function isWalkableExterior(tileX, tileY) {
  const inSmallBox = tileX >= 20 && tileX <= 23 && tileY >= 54 && tileY <= 55;
  const inBigBox = tileX >= 12 && tileX <= 31 && tileY >= 56 && tileY <= 62;
  return inSmallBox || inBigBox;
}

const interiorWalkable = { minX: 5, maxX: 35, minY: 2, maxY: 20 };
const interiorPixelBounds = {
  minX: 4 * WORLD_TILE, maxX: 37 * WORLD_TILE,
  minY: 0 * WORLD_TILE, maxY: 21 * WORLD_TILE,
};

function isWalkableInterior(tileX, tileY) {
  if (tileY === 21 && (tileX === 20 || tileX === 21)) return true;
  return (
    tileX >= interiorWalkable.minX && tileX <= interiorWalkable.maxX &&
    tileY >= interiorWalkable.minY && tileY <= interiorWalkable.maxY
  );
}

// ===== DATOS DE LOS NPCS CON GRAFICAS =====
const npcs = [
  {
    name: "Prof. Oak",
    fullName: "Profesor Oak - Director Cientifico Clarios",
    x: 19, y: 6,
    role: "Control Predictivo de Temperatura - SLSQP MPC",
    dialog: "¡Bienvenido! Nuestro algoritmo SLSQP MPC anticipa los picos termicos y ajusta la refrigeracion antes de que ocurran sobrecalentamientos, reduciendo la variabilidad termica en un 18%. Esta precision garantiza la calidad y seguridad de cada celda de bateria.",
    img: null,
    chartData: {
      title: "SLSQP MPC - Control Predictivo de Temperatura",
      type: "temperature",
    },
  },
  {
    name: "Leaf",
    fullName: "Leaf - Supervisora Tecnica de Operaciones",
    x: 9, y: 19,
    role: "Peak Shaving Tarifario CREG - HiGHS MILP",
    dialog: "El modelo HiGHS MILP programa automaticamente la descarga de baterias en horas pico de tarifa CREG (18:00-21:00), aplanando la curva de demanda y logrando ahorros de hasta 27% en la factura electrica operativa mensual.",
    img: null,
    chartData: {
      title: "HiGHS MILP - Peak Shaving Tarifario (CREG)",
      type: "peakshaving",
    },
  },
  {
    name: "Erika",
    fullName: "Erika - Ingeniera de Sostenibilidad",
    x: 22, y: 15,
    role: "Curva de Carga y Simulacion What-If (Yumbo)",
    dialog: "La simulacion What-If de Yumbo demuestra que con almacenamiento inteligente, la planta puede operar en modo isla durante contingencias de red, cubriendo el 85% de la demanda con fuentes limpias. Nuestras baterias son 100% reciclables.",
    img: null,
    chartData: {
      title: "Curva de Carga - Simulacion What-If (Yumbo)",
      type: "loadcurve",
    },
  },
];

// ===== BFS PATHFINDING SIMPLE EN REJILLA =====
function buildPath(fromTX, fromTY, toTX, toTY) {
  // BFS en la rejilla interior
  const isWalkable = (tx, ty) => {
    // Evitar pisar encima del NPC objetivo (llegar a un tile adyacente)
    return isWalkableInterior(tx, ty);
  };

  const key = (x, y) => `${x},${y}`;
  const visited = new Set();
  const queue = [{ x: fromTX, y: fromTY, path: [] }];
  visited.add(key(fromTX, fromTY));

  const dirs = [
    { dx: 0, dy: -1, dir: "up" },
    { dx: 0, dy: 1, dir: "down" },
    { dx: -1, dy: 0, dir: "left" },
    { dx: 1, dy: 0, dir: "right" },
  ];

  while (queue.length > 0) {
    const { x, y, path } = queue.shift();
    if (x === toTX && y === toTY) {
      return path.concat([{ tileX: x, tileY: y }]);
    }
    for (const d of dirs) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      const k = key(nx, ny);
      if (!visited.has(k) && isWalkable(nx, ny)) {
        visited.add(k);
        queue.push({ x: nx, y: ny, path: path.concat([{ tileX: x, tileY: y, dir: d.dir }]) });
      }
    }
  }
  return null; // Sin camino
}

// Funcion global para que el HTML pueda llamarla
function goToNPC(idx) {
  if (currentZone !== "interior") return;
  const npc = npcs[idx];
  const fromTX = Math.floor(player.x / WORLD_TILE);
  const fromTY = Math.floor(player.y / WORLD_TILE);
  // Destino: frente al NPC (tile justo debajo)
  const toTX = npc.x;
  const toTY = npc.y + 1;

  const path = buildPath(fromTX, fromTY, toTX, toTY);
  if (!path || path.length === 0) return;

  autoWalk.active = true;
  autoWalk.path = path;
  autoWalk.stepIndex = 0;
  autoWalk.targetNpcIdx = idx;

  // Marcar boton activo
  document.querySelectorAll(".npc-list-btn").forEach((b, i) => {
    b.classList.toggle("active-npc", i === idx);
  });
}
window.goToNPC = goToNPC;

// ===== GRAFICAS EN CANVAS (datos sinteticos realistas) =====
function drawChartSLSQP(chartCanvas) {
  const w = chartCanvas.width;
  const h = chartCanvas.height;
  const c = chartCanvas.getContext("2d");
  c.clearRect(0, 0, w, h);

  // Fondo
  c.fillStyle = "#050812";
  c.fillRect(0, 0, w, h);

  const pad = { l: 48, r: 16, t: 16, b: 36 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  // Datos temperatura (real vs controlada)
  const hours = Array.from({length: 24}, (_, i) => i);
  const tempReal   = [32,31,30,29,29,30,33,37,41,43,44,45,46,47,46,44,42,40,38,37,36,35,34,33];
  const tempCtrl   = [32,31,30,29,29,30,32,34,36,37,37,37,37,38,37,36,35,34,33,33,33,33,33,33];
  const tempMin = 26; const tempMax = 50;

  const tx = (i) => pad.l + (i / 23) * cw;
  const ty = (v) => pad.t + ch - ((v - tempMin) / (tempMax - tempMin)) * ch;

  // Grid
  c.strokeStyle = "rgba(255,255,255,0.05)";
  c.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (g / 4) * ch;
    c.beginPath(); c.moveTo(pad.l, y); c.lineTo(pad.l + cw, y); c.stroke();
    const val = tempMax - g * (tempMax - tempMin) / 4;
    c.fillStyle = "#64748b";
    c.font = "10px Inter, sans-serif";
    c.textAlign = "right";
    c.fillText(val.toFixed(0) + "C", pad.l - 4, y + 4);
  }

  // Linea temperatura real (rojo)
  c.strokeStyle = "#ff4444";
  c.lineWidth = 2;
  c.setLineDash([5, 3]);
  c.beginPath();
  hours.forEach((h2, i) => {
    i === 0 ? c.moveTo(tx(i), ty(tempReal[i])) : c.lineTo(tx(i), ty(tempReal[i]));
  });
  c.stroke();
  c.setLineDash([]);

  // Linea temperatura controlada (cyan)
  c.strokeStyle = "#00f0ff";
  c.lineWidth = 2.5;
  c.beginPath();
  hours.forEach((h2, i) => {
    i === 0 ? c.moveTo(tx(i), ty(tempCtrl[i])) : c.lineTo(tx(i), ty(tempCtrl[i]));
  });
  c.stroke();

  // Area bajo curva controlada
  c.fillStyle = "rgba(0,240,255,0.08)";
  c.beginPath();
  c.moveTo(tx(0), pad.t + ch);
  hours.forEach((h2, i) => c.lineTo(tx(i), ty(tempCtrl[i])));
  c.lineTo(tx(23), pad.t + ch);
  c.closePath();
  c.fill();

  // Zona critica
  const critY = ty(43);
  c.fillStyle = "rgba(255,68,68,0.08)";
  c.fillRect(pad.l, pad.t, cw, critY - pad.t);
  c.strokeStyle = "rgba(255,68,68,0.3)";
  c.lineWidth = 1;
  c.setLineDash([4, 4]);
  c.beginPath(); c.moveTo(pad.l, critY); c.lineTo(pad.l + cw, critY); c.stroke();
  c.setLineDash([]);
  c.fillStyle = "rgba(255,68,68,0.7)";
  c.font = "9px Inter, sans-serif";
  c.textAlign = "left";
  c.fillText("Limite critico 43C", pad.l + 4, critY - 4);

  // Eje X
  c.fillStyle = "#64748b";
  c.font = "9px Inter, sans-serif";
  c.textAlign = "center";
  [0, 6, 12, 18, 23].forEach(h2 => {
    c.fillText(h2 + "h", tx(h2), pad.t + ch + 16);
  });

  // Leyenda
  const lx = pad.l + 8;
  const ly = pad.t + 8;
  c.fillStyle = "#00f0ff"; c.fillRect(lx, ly, 18, 3);
  c.fillStyle = "#e2e8f0"; c.font = "9px Inter, sans-serif"; c.textAlign = "left";
  c.fillText("SLSQP MPC (controlado)", lx + 22, ly + 4);
  c.strokeStyle = "#ff4444"; c.setLineDash([5,3]); c.lineWidth = 2;
  c.beginPath(); c.moveTo(lx, ly + 12); c.lineTo(lx + 18, ly + 12); c.stroke();
  c.setLineDash([]);
  c.fillStyle = "#94a3b8"; c.fillText("Sin control (referencia)", lx + 22, ly + 16);
}

function drawChartPeakShaving(chartCanvas) {
  const w = chartCanvas.width;
  const h = chartCanvas.height;
  const c = chartCanvas.getContext("2d");
  c.clearRect(0, 0, w, h);

  c.fillStyle = "#050812";
  c.fillRect(0, 0, w, h);

  const pad = { l: 52, r: 16, t: 16, b: 36 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const hours = Array.from({length: 24}, (_, i) => i);
  const demand     = [600,550,520,500,490,510,580,720,800,820,830,810,790,800,820,840,920,980,1000,960,880,800,720,650];
  const optimized  = [600,550,520,500,490,510,580,700,750,760,760,750,750,760,760,760,760,760,760,760,760,750,700,630];
  const tariff     = [0.12,0.11,0.10,0.10,0.10,0.11,0.14,0.18,0.20,0.21,0.21,0.20,0.20,0.21,0.21,0.22,0.28,0.32,0.35,0.34,0.30,0.25,0.20,0.15];

  const dMin = 450; const dMax = 1050;
  const tMin = 0.08; const tMax = 0.38;

  const tx = (i) => pad.l + (i / 23) * cw;
  const dy = (v) => pad.t + ch - ((v - dMin) / (dMax - dMin)) * ch;
  const ry = (v) => pad.t + ch - ((v - tMin) / (tMax - tMin)) * ch;

  // Grid
  c.strokeStyle = "rgba(255,255,255,0.05)";
  c.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (g / 4) * ch;
    c.beginPath(); c.moveTo(pad.l, y); c.lineTo(pad.l + cw, y); c.stroke();
    const val = dMax - g * (dMax - dMin) / 4;
    c.fillStyle = "#64748b"; c.font = "9px Inter"; c.textAlign = "right";
    c.fillText(val.toFixed(0) + "kW", pad.l - 4, y + 4);
  }

  // Barras tarifa (fondo)
  hours.forEach((_, i) => {
    const barW = cw / 24 - 1;
    const barX = tx(i) - barW / 2;
    const alpha = (tariff[i] - tMin) / (tMax - tMin);
    c.fillStyle = `rgba(255,165,0,${alpha * 0.25})`;
    c.fillRect(barX, pad.t, barW, ch);
  });

  // Curva demanda sin optimizar
  c.strokeStyle = "#ff6666";
  c.lineWidth = 2;
  c.setLineDash([5, 3]);
  c.beginPath();
  hours.forEach((_, i) => {
    i === 0 ? c.moveTo(tx(i), dy(demand[i])) : c.lineTo(tx(i), dy(demand[i]));
  });
  c.stroke();
  c.setLineDash([]);

  // Curva demanda optimizada
  c.strokeStyle = "#00f0ff";
  c.lineWidth = 2.5;
  c.beginPath();
  hours.forEach((_, i) => {
    i === 0 ? c.moveTo(tx(i), dy(optimized[i])) : c.lineTo(tx(i), dy(optimized[i]));
  });
  c.stroke();

  // Relleno diferencia (ahorro)
  c.fillStyle = "rgba(0,255,136,0.12)";
  c.beginPath();
  hours.forEach((_, i) => {
    i === 0 ? c.moveTo(tx(i), dy(optimized[i])) : c.lineTo(tx(i), dy(optimized[i]));
  });
  for (let i = 23; i >= 0; i--) {
    c.lineTo(tx(i), dy(demand[i]));
  }
  c.closePath();
  c.fill();

  // Linea de peak cap
  const capY = dy(760);
  c.strokeStyle = "rgba(0,255,136,0.5)";
  c.lineWidth = 1.5;
  c.setLineDash([6, 3]);
  c.beginPath(); c.moveTo(pad.l, capY); c.lineTo(pad.l + cw, capY); c.stroke();
  c.setLineDash([]);
  c.fillStyle = "rgba(0,255,136,0.8)";
  c.font = "9px Inter"; c.textAlign = "left";
  c.fillText("Peak cap 760 kW (HiGHS)", pad.l + 4, capY - 4);

  // Etiqueta ahorro
  const ahorroX = tx(18);
  const ahorroY = dy((demand[18] + optimized[18]) / 2);
  c.fillStyle = "rgba(0,255,136,0.9)";
  c.font = "bold 10px Inter"; c.textAlign = "center";
  c.fillText("-27% OPEX", ahorroX, ahorroY);

  // Eje X
  c.fillStyle = "#64748b"; c.font = "9px Inter"; c.textAlign = "center";
  [0, 6, 12, 18, 23].forEach(h2 => {
    c.fillText(h2 + ":00", tx(h2), pad.t + ch + 16);
  });

  // Leyenda
  const lx = pad.l + 8; const ly = pad.t + 8;
  c.fillStyle = "#00f0ff"; c.fillRect(lx, ly, 18, 3);
  c.fillStyle = "#e2e8f0"; c.font = "9px Inter"; c.textAlign = "left";
  c.fillText("HiGHS MILP (optimizado)", lx + 22, ly + 4);
  c.strokeStyle = "#ff6666"; c.setLineDash([5,3]); c.lineWidth = 2;
  c.beginPath(); c.moveTo(lx, ly + 12); c.lineTo(lx + 18, ly + 12); c.stroke();
  c.setLineDash([]);
  c.fillStyle = "#94a3b8"; c.fillText("Demanda base", lx + 22, ly + 16);
  c.fillStyle = "rgba(255,165,0,0.6)"; c.fillRect(lx, ly + 24, 18, 8);
  c.fillStyle = "#94a3b8"; c.fillText("Tarifa CREG (color = costo)", lx + 22, ly + 32);
}

function drawChartLoadCurve(chartCanvas) {
  const w = chartCanvas.width;
  const h = chartCanvas.height;
  const c = chartCanvas.getContext("2d");
  c.clearRect(0, 0, w, h);

  c.fillStyle = "#050812";
  c.fillRect(0, 0, w, h);

  const pad = { l: 52, r: 16, t: 16, b: 36 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const hours = Array.from({length: 24}, (_, i) => i);
  const demand     = [1.2,1.1,1.0,0.9,0.9,1.0,1.3,1.8,2.2,2.4,2.5,2.4,2.3,2.4,2.5,2.6,2.8,3.0,3.1,2.9,2.6,2.2,1.8,1.5];
  const solar      = [0,0,0,0,0,0.1,0.4,0.8,1.2,1.5,1.7,1.8,1.7,1.6,1.4,1.1,0.7,0.3,0.1,0,0,0,0,0];
  const storage    = [0.3,0.3,0.3,0.3,0.3,0.2,0,0,0,0,0,0,0,0,0,0,0.2,0.5,0.7,0.6,0.4,0.3,0.3,0.3];
  const grid       = demand.map((d, i) => Math.max(0, d - solar[i] - storage[i]));

  const dMin = 0; const dMax = 3.5;
  const tx = (i) => pad.l + (i / 23) * cw;
  const vy = (v) => pad.t + ch - ((v - dMin) / (dMax - dMin)) * ch;

  // Grid
  c.strokeStyle = "rgba(255,255,255,0.05)"; c.lineWidth = 1;
  for (let g = 0; g <= 5; g++) {
    const y = pad.t + (g / 5) * ch;
    c.beginPath(); c.moveTo(pad.l, y); c.lineTo(pad.l + cw, y); c.stroke();
    const val = dMax - g * (dMax - dMin) / 5;
    c.fillStyle = "#64748b"; c.font = "9px Inter"; c.textAlign = "right";
    c.fillText(val.toFixed(1) + "MW", pad.l - 4, y + 4);
  }

  // Area grid (gris azulado)
  c.fillStyle = "rgba(100,130,200,0.2)";
  c.beginPath();
  c.moveTo(tx(0), vy(0));
  hours.forEach((_, i) => c.lineTo(tx(i), vy(grid[i])));
  c.lineTo(tx(23), vy(0)); c.closePath(); c.fill();

  // Area storage (naranja)
  c.fillStyle = "rgba(255,180,0,0.3)";
  c.beginPath();
  c.moveTo(tx(0), vy(0));
  hours.forEach((_, i) => c.lineTo(tx(i), vy(grid[i] + storage[i])));
  c.lineTo(tx(23), vy(0)); c.closePath(); c.fill();

  // Area solar (verde)
  c.fillStyle = "rgba(0,255,136,0.25)";
  c.beginPath();
  c.moveTo(tx(0), vy(0));
  hours.forEach((_, i) => c.lineTo(tx(i), vy(grid[i] + storage[i] + solar[i])));
  c.lineTo(tx(23), vy(0)); c.closePath(); c.fill();

  // Curva demanda total
  c.strokeStyle = "#ffffff";
  c.lineWidth = 2.5;
  c.beginPath();
  hours.forEach((_, i) => {
    i === 0 ? c.moveTo(tx(i), vy(demand[i])) : c.lineTo(tx(i), vy(demand[i]));
  });
  c.stroke();

  // Escenario contingencia (corte 14-16h)
  c.strokeStyle = "rgba(255,68,68,0.8)";
  c.lineWidth = 1.5;
  c.setLineDash([4, 3]);
  c.beginPath();
  c.moveTo(tx(14), pad.t); c.lineTo(tx(14), pad.t + ch); c.stroke();
  c.moveTo(tx(16), pad.t); c.lineTo(tx(16), pad.t + ch); c.stroke();
  c.setLineDash([]);
  c.fillStyle = "rgba(255,68,68,0.7)";
  c.font = "bold 9px Inter"; c.textAlign = "center";
  c.fillText("Isla (What-If)", tx(15), pad.t + 14);
  c.fillStyle = "rgba(255,68,68,0.4)";
  c.fillRect(tx(14), pad.t, tx(16) - tx(14), ch);

  // Eje X
  c.fillStyle = "#64748b"; c.font = "9px Inter"; c.textAlign = "center";
  [0, 6, 12, 18, 23].forEach(h2 => {
    c.fillText(h2 + ":00", tx(h2), pad.t + ch + 16);
  });

  // Leyenda
  const items = [
    { color: "rgba(0,255,136,0.6)", label: "Solar FV" },
    { color: "rgba(255,180,0,0.6)", label: "Almacenamiento" },
    { color: "rgba(100,130,200,0.6)", label: "Red electrica" },
  ];
  items.forEach((item, i) => {
    const lx = pad.l + 8 + i * 100;
    c.fillStyle = item.color; c.fillRect(lx, pad.t + 8, 14, 8);
    c.fillStyle = "#94a3b8"; c.font = "9px Inter"; c.textAlign = "left";
    c.fillText(item.label, lx + 18, pad.t + 16);
  });
}

function renderNPCChart(npc) {
  const chartDiv = document.getElementById("npc-dialog-chart");
  chartDiv.innerHTML = "";

  const titleEl = document.createElement("div");
  titleEl.className = "chart-title";
  titleEl.textContent = npc.chartData.title;
  chartDiv.appendChild(titleEl);

  const wrap = document.createElement("div");
  wrap.className = "chart-canvas-wrap";
  const chartCanvas = document.createElement("canvas");
  chartCanvas.width = 600;
  chartCanvas.height = 180;
  chartCanvas.style.imageRendering = "auto";
  wrap.appendChild(chartCanvas);
  chartDiv.appendChild(wrap);

  switch (npc.chartData.type) {
    case "temperature":   drawChartSLSQP(chartCanvas); break;
    case "peakshaving":   drawChartPeakShaving(chartCanvas); break;
    case "loadcurve":     drawChartLoadCurve(chartCanvas); break;
  }
}

// ===== DIALOGOS =====
let activeNPCDialog = -1;

function openNPCDialog(idx) {
  activeNPCDialog = idx;
  const npc = npcs[idx];
  const dialog = document.getElementById("npc-dialog");
  document.getElementById("npc-dialog-name").textContent = npc.name;
  document.getElementById("npc-dialog-role").textContent = npc.role;
  document.getElementById("npc-dialog-text").textContent = npc.dialog;

  // Dibujar avatar en canvas del dialogo
  const avatarCanvas = document.getElementById("npc-dialog-avatar");
  if (npc.img) {
    const ac = avatarCanvas.getContext("2d");
    ac.imageSmoothingEnabled = false;
    ac.clearRect(0, 0, 64, 64);
    ac.drawImage(npc.img, 0, 0, 32, 32, 0, 0, 64, 64);
  }

  renderNPCChart(npc);

  dialog.classList.remove("hidden");

  // Marcar como visitado en la lista
  const btn = document.getElementById(`btn-npc-${idx}`);
  if (btn) {
    btn.classList.remove("active-npc");
    btn.classList.add("visited-npc");
  }
}

function closeNPCDialog() {
  document.getElementById("npc-dialog").classList.add("hidden");
  activeNPCDialog = -1;
}
window.closeNPCDialog = closeNPCDialog;

// ===== INPUT =====
const keys = new Set();
window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  // ESC cierra dialogo
  if (e.key === "Escape") closeNPCDialog();
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});

canvas.addEventListener("click", (e) => {
  if (!mapData) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  const cameraX = Math.round(canvas.width / 2 - player.x);
  const cameraY = Math.round(canvas.height / 2 - player.y);
  const clickedTileX = Math.floor((mouseX - cameraX) / WORLD_TILE);
  const clickedTileY = Math.floor((mouseY - cameraY) / WORLD_TILE);
  const coordStr = `X: ${clickedTileX}, Y: ${clickedTileY} [${currentZone.toUpperCase()}]`;
  console.log(`[CLIC MAPA] ${coordStr}`);
  if (clickDisplay) clickDisplay.textContent = coordStr;
});

// ===== CARGA DE ASSETS =====
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

async function init() {
  try {
    const mapRes = await fetch("./map.json");
    mapData = await mapRes.json();
    tilesetImage = await loadImage("./spritesheet.png");
    walkerSheet = await loadImage("./brendan-walk.png");
    logoScreenImg = await loadImage("./logo_screen.png");
    npcOakImg = await loadImage("./npc_oak_32.png");
    npcLeafImg = await loadImage("./npc_leaf_32.png");
    npcErikaImg = await loadImage("./npc_erika_32.png");

    npcs[0].img = npcOakImg;
    npcs[1].img = npcLeafImg;
    npcs[2].img = npcErikaImg;

    // Dibujar avatares en los botones de la lista
    npcs.forEach((npc, i) => {
      const btnCanvas = document.getElementById(`canvas-npc-${i}`);
      if (btnCanvas && npc.img) {
        const bc = btnCanvas.getContext("2d");
        bc.imageSmoothingEnabled = false;
        bc.drawImage(npc.img, 0, 0, 32, 32, 0, 0, 32, 32);
      }
      // Conectar boton con la funcion goToNPC
      const btn = document.getElementById(`btn-npc-${i}`);
      if (btn) btn.addEventListener("click", () => goToNPC(i));
    });

    // Toggle panel
    const toggleBtn = document.getElementById("toggle-npc-panel");
    const panel = document.getElementById("npc-list-panel");
    if (toggleBtn && panel) {
      toggleBtn.addEventListener("click", () => {
        panel.classList.toggle("hidden-panel");
      });
    }

    // Boton cerrar dialogo
    const closeBtn = document.getElementById("btn-close-dialog");
    if (closeBtn) closeBtn.addEventListener("click", closeNPCDialog);

    preRenderedMap = renderMapCanvas(mapData, tilesetImage);

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  } catch (err) {
    console.error("Error al inicializar:", err);
  }
}

function renderMapCanvas(map, tileset) {
  const offscreen = document.createElement("canvas");
  offscreen.width = map.mapWidth * map.tileSize;
  offscreen.height = map.mapHeight * map.tileSize;
  const offCtx = offscreen.getContext("2d");
  offCtx.imageSmoothingEnabled = false;
  const tilesPerRow = Math.floor(tileset.width / map.tileSize);
  for (const layer of map.layers) {
    for (const tile of layer.tiles) {
      const tileId = parseInt(tile.id, 10);
      const sx = (tileId % tilesPerRow) * map.tileSize;
      const sy = Math.floor(tileId / tilesPerRow) * map.tileSize;
      offCtx.drawImage(tileset, sx, sy, map.tileSize, map.tileSize,
        tile.x * map.tileSize, tile.y * map.tileSize, map.tileSize, map.tileSize);
    }
  }
  return offscreen;
}

let lastTime = 0;
function gameLoop(currentTime) {
  const dt = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function canMoveTo(nextX, nextY) {
  const tileX = Math.floor(nextX / WORLD_TILE);
  const tileY = Math.floor(nextY / WORLD_TILE);
  if (currentZone === "exterior") return isWalkableExterior(tileX, tileY);
  if (currentZone === "interior") {
    for (const npc of npcs) {
      if (tileX === npc.x && tileY === npc.y) return false;
    }
    return isWalkableInterior(tileX, tileY);
  }
  return false;
}

function update(dt) {
  if (transition.active) {
    const elapsed = performance.now() - transition.startTime;
    if (elapsed >= transition.duration) {
      transition.active = false;
      player.x = transition.targetX;
      player.y = transition.targetY;
      player.dir = transition.targetDir;
      currentZone = transition.targetZone;
    }
    return;
  }

  // ===== MOVIMIENTO AUTOMATICO (PATHFINDING) =====
  if (autoWalk.active && currentZone === "interior") {
    const step = autoWalk.path[autoWalk.stepIndex];
    if (!step) {
      autoWalk.active = false;
      // Al llegar, abrir dialogo del NPC
      if (autoWalk.targetNpcIdx >= 0) {
        openNPCDialog(autoWalk.targetNpcIdx);
      }
      return;
    }

    const targetX = (step.tileX + 0.5) * WORLD_TILE;
    const targetY = (step.tileY + 0.5) * WORLD_TILE;
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 3) {
      // Llegamos a este tile, siguiente paso
      player.x = targetX;
      player.y = targetY;
      autoWalk.stepIndex++;
      if (autoWalk.stepIndex >= autoWalk.path.length) {
        autoWalk.active = false;
        if (autoWalk.targetNpcIdx >= 0) openNPCDialog(autoWalk.targetNpcIdx);
      }
    } else {
      // Mover hacia el tile
      const speed = player.speed * dt;
      const moveX = (dx / dist) * speed;
      const moveY = (dy / dist) * speed;
      player.x += moveX;
      player.y += moveY;

      // Actualizar direccion y animacion
      if (Math.abs(dx) > Math.abs(dy)) {
        player.dir = dx > 0 ? "right" : "left";
      } else {
        player.dir = dy > 0 ? "down" : "up";
      }
      player.moving = true;
      player.frame = (player.frame + dt * 8) % 3;
    }
    return; // No procesar input manual durante autowalk
  }

  // Si el jugador presiona una tecla, cancelar autowalk
  let dx = 0; let dy = 0;
  if (keys.has("arrowup") || keys.has("w")) { dy -= 1; player.dir = "up"; }
  if (keys.has("arrowdown") || keys.has("s")) { dy += 1; player.dir = "down"; }
  if (keys.has("arrowleft") || keys.has("a")) { dx -= 1; player.dir = "left"; }
  if (keys.has("arrowright") || keys.has("d")) { dx += 1; player.dir = "right"; }

  if (dx !== 0 || dy !== 0) {
    // Cancelar auto walk si el usuario interviene
    autoWalk.active = false;
  }

  if (dx !== 0 && dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
  }

  player.moving = dx !== 0 || dy !== 0;

  if (player.moving) {
    const nextX = player.x + dx * player.speed * dt;
    const nextY = player.y + dy * player.speed * dt;
    if (canMoveTo(nextX, player.y)) player.x = nextX;
    if (canMoveTo(player.x, nextY)) player.y = nextY;
    player.frame = (player.frame + dt * 8) % 3;
  } else {
    player.frame = 1;
  }

  const currentTileX = Math.floor(player.x / WORLD_TILE);
  const currentTileY = Math.floor(player.y / WORLD_TILE);

  // Portales
  if (currentZone === "exterior" && !transition.active) {
    if (currentTileY <= 54 && (currentTileX === 21 || currentTileX === 22) && player.dir === "up") {
      startPortalTransition("interior", 20.5 * WORLD_TILE, 19.5 * WORLD_TILE, "up");
    }
  }
  if (currentZone === "interior" && !transition.active) {
    if (currentTileY >= 20 && (currentTileX === 20 || currentTileX === 21) && player.dir === "down") {
      startPortalTransition("exterior", 21.5 * WORLD_TILE, 55.5 * WORLD_TILE, "down");
      closeNPCDialog();
      autoWalk.active = false;
    }
  }

  if (posDisplay) {
    posDisplay.textContent = `X: ${currentTileX}, Y: ${currentTileY} [${currentZone.toUpperCase()}]`;
  }
}

function startPortalTransition(targetZone, targetX, targetY, targetDir) {
  transition.active = true;
  transition.startTime = performance.now();
  transition.targetZone = targetZone;
  transition.targetX = targetX;
  transition.targetY = targetY;
  transition.targetDir = targetDir;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (transition.active) {
    renderPortalScreen();
    return;
  }

  const cameraX = Math.round(canvas.width / 2 - player.x);
  const cameraY = Math.round(canvas.height / 2 - player.y);

  ctx.save();
  ctx.translate(cameraX, cameraY);

  if (preRenderedMap) {
    ctx.drawImage(preRenderedMap, 0, 0, preRenderedMap.width, preRenderedMap.height,
      0, 0, preRenderedMap.width * MAP_SCALE, preRenderedMap.height * MAP_SCALE);
  }

  if (currentZone === "interior") drawNPCs();
  drawPlayer();

  ctx.restore();
}

function drawNPCs() {
  npcs.forEach((npc, idx) => {
    if (!npc.img) return;
    const dx = Math.round((npc.x + 0.5) * WORLD_TILE - walkerSprite.drawW / 2);
    const dy = Math.round((npc.y + 1) * WORLD_TILE - walkerSprite.drawH + 16);

    ctx.drawImage(npc.img, 0, 0, 32, 32, dx, dy, walkerSprite.drawW, walkerSprite.drawH);

    // Badge con nombre
    const badgeW = walkerSprite.drawW + 24;
    const badgeH = 16;
    const badgeX = dx - 12;
    const badgeY = dy - 20;
    ctx.fillStyle = "rgba(13,17,28,0.88)";
    ctx.strokeStyle = "rgba(0,240,255,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#00f0ff";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(npc.name, dx + walkerSprite.drawW / 2, badgeY + 11);

    // Indicador de destino autowalk
    if (autoWalk.active && autoWalk.targetNpcIdx === idx) {
      ctx.fillStyle = "rgba(0,255,136,0.7)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("...", dx + walkerSprite.drawW / 2, dy - 24);
    }
  });
}

function drawPlayer() {
  const row = walkerSprite.rows[player.dir];
  const col = player.moving ? Math.floor(player.frame) % 3 : 1;
  const sx = col * walkerSprite.cellW;
  const sy = row * walkerSprite.cellH;
  const dx = Math.round(player.x - walkerSprite.drawW / 2);
  const dy = Math.round(player.y - walkerSprite.drawH + 16);
  ctx.drawImage(walkerSheet, sx, sy, walkerSprite.cellW, walkerSprite.cellH,
    dx, dy, walkerSprite.drawW, walkerSprite.drawH);
}

function renderPortalScreen() {
  ctx.fillStyle = "#0d111c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (logoScreenImg) {
    const maxW = canvas.width * 0.75;
    const maxH = canvas.height * 0.65;
    const scale = Math.min(maxW / logoScreenImg.width, maxH / logoScreenImg.height);
    const w = logoScreenImg.width * scale;
    const h = logoScreenImg.height * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2 - 20;
    ctx.drawImage(logoScreenImg, x, y, w, h);
  }

  const elapsed = performance.now() - transition.startTime;
  const progress = Math.min(1, elapsed / transition.duration);
  const barW = 320; const barH = 10;
  const barX = (canvas.width - barW) / 2;
  const barY = canvas.height - 90;
  ctx.strokeStyle = "rgba(0,240,255,0.4)";
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = "#00f0ff";
  ctx.fillRect(barX + 2, barY + 2, (barW - 4) * progress, barH - 4);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "11px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  const msg = transition.targetZone === "interior" ? "INGRESANDO A PLANTA CLARIOS..." : "SALIENDO AL EXTERIOR...";
  ctx.fillText(msg, canvas.width / 2, barY + 32);
}

window.addEventListener("DOMContentLoaded", init);
