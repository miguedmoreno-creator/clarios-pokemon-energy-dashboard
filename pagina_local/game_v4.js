// ==========================================
// CLARIOS INDUSTRIAL SIMULATOR - GAME ENGINE
// Concurso Clarios: Optimizacion Energetica Planta Yumbo
// ==========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const posDisplay = document.getElementById("pos-display");
const clickDisplay = document.getElementById("click-display");

ctx.imageSmoothingEnabled = false;

// ===== ESCALA CLASICA EXACTA (TAMANO ANTERIOR) =====
// Mapa a escala 2x: cada tile de 16x16 px se renderiza a 32x32 px en pantalla
// Los personajes son de 64x64 px (2 tiles de alto x 2 tiles de ancho), tamano natural
const MAP_SCALE = 2;
const TILE_SIZE = 16;
const WORLD_TILE = TILE_SIZE * MAP_SCALE; // 32 px por tile de mundo

let mapData = null;
let tilesetImage = null;
let walkerSheet = null;
let preRenderedMap = null;
let lastTime = 0;

let npcOakImg = null;
let npcLeafImg = null;
let npcErikaImg = null;
let npcScientistImg = null;
let snorlaxImg = null;
let logoScreenImg = null;

const walkerSprite = {
  cellW: 32,
  cellH: 32,
  drawW: 64,
  drawH: 64,
  rows: { down: 0, left: 1, up: 2, right: 3 },
};

const player = {
  x: 22.5 * WORLD_TILE,
  y: 69.5 * WORLD_TILE,
  speed: 210,
  dir: "up",
  moving: false,
  frame: 1,
};

function getZone(tx, ty) {
  if (ty >= 50) return "exterior";
  if (tx <= 30 && ty <= 20) return "lab";
  return "interior";
}

let currentZone = "exterior";

const transition = {
  active: false,
  startTime: 0,
  duration: 1200,
  targetZone: "interior",
  targetX: 69.5 * WORLD_TILE,
  targetY: 30.5 * WORLD_TILE,
  targetDir: "up",
  message: "ENTRANDO AL EDIFICIO CLARIOS...",
};

// Portales entre zonas
const portals = [
  {
    name: "ext_to_int",
    // Portal exterior corregido a (21, 65) y (22, 65)
    from: [{ x: 21, y: 65 }, { x: 22, y: 65 }],
    triggerDir: null,
    target: { x: 69.5, y: 30.5 },
    targetDir: "up",
    zone: "interior",
    duration: 1200,
    message: "ENTRANDO AL EDIFICIO CLARIOS...",
  },
  {
    name: "int_to_ext",
    from: [{ x: 69, y: 31 }, { x: 70, y: 31 }],
    triggerDir: null,
    target: { x: 21.5, y: 66.5 },
    targetDir: "down",
    zone: "exterior",
    duration: 1200,
    message: "SALIENDO AL EXTERIOR...",
  },
  {
    name: "int_to_lab",
    from: [{ x: 78, y: 12 }, { x: 78, y: 11 }],
    triggerDir: null,
    // Spawn en (17.5, 11.5) mirando arriba, fuera de la alfombra de salida para evitar rebotes
    target: { x: 17.5, y: 11.5 },
    targetDir: "up",
    zone: "lab",
    duration: 1200,
    message: "TRANSPORTE AL LABORATORIO DE INVESTIGACION...",
  },
  {
    name: "lab_to_int",
    // Alfombra de salida del lab en y=13 al caminar hacia abajo
    from: [{ x: 16, y: 13 }, { x: 17, y: 13 }, { x: 18, y: 13 }],
    triggerDir: "down",
    target: { x: 78.5, y: 13.5 },
    targetDir: "down",
    zone: "interior",
    duration: 1200,
    message: "REGRESANDO AL EDIFICIO CLARIOS...",
  },
  {
    name: "lab_to_snorlax",
    from: [{ x: 8, y: 12 }, { x: 9, y: 12 }, { x: 10, y: 12 }],
    triggerDir: null,
    target: { x: 60.5, y: 12.5 },
    targetDir: "down",
    zone: "interior",
    duration: 1200,
    message: "TRANSPORTE A SALA SNORLAX...",
  },
  {
    name: "snorlax_to_lab",
    from: [{ x: 59, y: 12 }, { x: 60, y: 12 }, { x: 61, y: 12 }, { x: 60, y: 11 }],
    triggerDir: null,
    target: { x: 9.5, y: 11.5 },
    targetDir: "down",
    zone: "lab",
    duration: 1200,
    message: "TRANSPORTE AL LABORATORIO...",
  },
];

// ===== SISTEMA DE COLISIONES RIGIDAS =====
const solidTiles = new Set();

function initSolidCollisions(map) {
  solidTiles.clear();
  if (!map) return;

  // 1. Delimitacion de arbustos (Tile ID 23)
  for (const layer of map.layers) {
    for (const tile of layer.tiles) {
      if (parseInt(tile.id, 10) === 23) {
        solidTiles.add(`${tile.x},${tile.y}`);
      }
    }
  }

  // 2. Cerca exterior de arbustos
  for (let y = 66; y <= 71; y++) solidTiles.add(`12,${y}`);
  for (let x = 12; x <= 31; x++) {
    solidTiles.add(`${x},71`);
    solidTiles.add(`${x},72`);
  }
  for (let y = 66; y <= 71; y++) solidTiles.add(`31,${y}`);

  // 3. Fachada exterior del edificio (excepto entrada 21 y 22)
  for (let x = 12; x <= 31; x++) {
    if (x !== 21 && x !== 22) {
      solidTiles.add(`${x},64`);
    }
  }

  // 4. Barreras en laboratorio de Oak (macetas, librerias y escritorios)
  for (let y = 7; y <= 12; y++) solidTiles.add(`12,${y}`);
  for (let x = 12; x <= 14; x++) solidTiles.add(`${x},7`);
  // Brecha libre en (15,7) y (16,7)
  for (let x = 17; x <= 20; x++) {
    for (let y = 7; y <= 9; y++) {
      solidTiles.add(`${x},${y}`);
    }
  }
  for (let x = 12; x <= 14; x++) solidTiles.add(`${x},4`);

  // 5. QUITAR TODOS LOS BLOQUES BARRERA A 5 BLOQUES DE DISTANCIA DE SNORLAX (55, 14)
  // OJO: solo se quitan barreras, los portales se mantienen intactos
  for (let x = 50; x <= 60; x++) {
    for (let y = 9; y <= 19; y++) {
      solidTiles.delete(`${x},${y}`);
    }
  }

  // Snorlax ocupa su casilla
  solidTiles.add("55,14");
  solidTiles.add("56,14");

  // Entrada exterior (21,65) y (22,65) completamente libre
  for (let y = 64; y <= 70; y++) {
    solidTiles.delete(`21,${y}`);
    solidTiles.delete(`22,${y}`);
  }
}

// ===== ESTRUCTURA DE CONTENIDOS Y EXPERTOS =====
// 1er NPC interior (62, 25): Problema con Contexto
// 2do NPC interior (80, 22): Objetivo
// 3er NPC interior (75, 14): Planteamiento
// 4to NPC lab (14, 10): Metodologia utilizada
// 5to NPC lab (13, 5): Prof. Oak (solo / reservado para mas adelante)
// 6to NPC (55, 14): Snorlax (Paso a paso + Resultados encontrados)
const npcs = [
  {
    id: "lucia",
    name: "1. Problema & Contexto",
    fullName: "Ing. Lucía Gómez — Contexto y Definición del Problema",
    x: 62,
    y: 25,
    role: "Coordinación Operativa Clarios Planta Yumbo",
    dialog: `?Bienvenido a Clarios Planta Yumbo! Este es el diagn?stico cr?tico actual:

? **Reportes Lentos y Actualizaciones Tard?as:** Los informes de consumo y temperatura llegan con desfases de hasta 24 horas, impidiendo decisiones operativas en tiempo real.
? **Saltos de Lectura en Telemetr?a:** El monitoreo t?rmico presenta ruido y picos an?malos en sensores que generan lecturas err?ticas en los tanques de formaci?n.
? **Uso Excesivo de Energ?a:** El 62% del consumo de potencia coincide con las horas pico tarifarias (CREG 015, 18:00 a 22:00), disparando sobrecostos millonarios y saturando los chillers.

El reto urgente: optimizar y aplanar la demanda sin frenar la producci?n ni degradar las celdas.`,
    img: null,
    isSnorlax: false,
  },
  {
    id: "mateo",
    name: "2. Objetivo del Proyecto",
    fullName: "Ing. Mateo Rivas — Objetivos Generales y Estratégicos",
    x: 80,
    y: 22,
    role: "Estrategia Energética & Telemetría IIoT",
    dialog: `Nuestras metas estrat?gicas y cuantitativas para Clarios Yumbo:

? **Objetivo Principal:** Optimizaci?n energ?tica continua (MILP + MPC) para coordinar rectificadores IGBT, chillers HVAC y almacenamiento BESS.
? **-27% en Sobrecosto Tarifario:** Desplazar 280 kW fuera de las 4 horas pico de la CREG (18:00 a 22:00).
? **Estabilidad T?rmica:** Mantener el electrolito en rango seguro (?42?C, tolerancia ?0.8?C) para extender la vida ?til de las bater?as.
? **Cero Impacto Productivo:** Garantizar el cumplimiento del 100% de los lotes programados de bater?as automotrices.`,
    img: null,
    isSnorlax: false,
  },
  {
    id: "elena",
    name: "3. Planteamiento",
    fullName: "Dra. Elena Vargas — Planteamiento de la Solución",
    x: 75,
    y: 14,
    role: "Líder de Modelado & Optimización",
    dialog: `Arquitectura de la soluci?n planteada en 3 capas acopladas:

1. **Ingesta Edge SCADA:** Telemetr?a por segundo desde los rectificadores de formaci?n y bombas de agua helada.
2. **Optimizador MILP (HiGHS):** Programa turnos de formaci?n y despacho de carga evitando las franjas tarifarias costosas.
3. **Control Predictivo MPC (SLSQP):** Modula la potencia t?rmica segundo a segundo anticipando la inercia qu?mica de los tanques.`,
    img: null,
    isSnorlax: false,
  },
  {
    id: "cientifico",
    name: "4. Metodología Utilizada",
    fullName: "Dr. Aris — Metodología de Ingeniería & Ciencia de Datos",
    x: 14,
    y: 10,
    role: "Investigador en Modelado Predictivo & Machine Learning",
    dialog: `Pipeline de anal?tica y Machine Learning aplicado al proceso:

1. **Limpieza & Filtros:** Eliminaci?n de saltos de lectura y ruido sensor con filtros pasa-bajas e interpolaci?n BRIN en bases anal?ticas.
2. **Modelado Predictivo (XGBoost):** Predicci?n de curvas de demanda el?ctrica y temperatura con 24 horas de anticipaci?n.
3. **Explicabilidad SHAP:** Identificaci?n matem?tica exacta de qu? par?metros operativos inducen mayor sobrecalentamiento.
4. **Validaci?n What-If:** Pruebas de estr?s y corte de suministro para operar la planta en modo microrred isla acoplada a energ?a solar.`,
    img: null,
    isSnorlax: false,
  },
  {
    id: "oak",
    name: "5. Prof. Oak (Dirección)",
    fullName: "Profesor Oak — Director Científico Clarios",
    x: 13,
    y: 5,
    role: "Dirección Científica Clarios",
    dialog: `Saludos, investigador. Me alegra verte explorando las instalaciones de Clarios.

En este momento me encuentro preparando la suite analítica completa. Más adelante te presentaré a fondo las fórmulas matemáticas, algoritmos detallados y las gráficas interactivas del sistema SLSQP MPC y HiGHS MILP.

Por ahora, continúa revisando los módulos del laboratorio o acércate a Snorlax en el área contigua para examinar la hoja de ruta paso a paso y los resultados consolidados de la planta.`,
    img: null,
    isSnorlax: false,
  },
  {
    id: "snorlax",
    name: "6. Snorlax: Pasos & Resultados",
    fullName: "Snorlax — Hoja de Ruta Operativa y Resultados Encontrados",
    x: 55,
    y: 14,
    role: "Roadmap de Implementación & Resultados Clave",
    dialog: `?Zzz... Hoja de ruta y resultados comprobados de Clarios Yumbo!

**Roadmap de Implementaci?n en 5 Pasos:**
1. **Conectividad Edge SCADA:** Telemetr?a en tiempo real de rectificadores y chillers.
2. **Calibraci?n T?rmica:** Ajuste de coeficientes de transferencia de calor en tanques.
3. **Puesta en Marcha MILP:** Despacho ?ptimo con l?mite contratado en 760 kW.
4. **Modo Copiloto Asistido:** Sugerencias autom?ticas a supervisores de planta.
5. **Control Aut?nomo & Auditor?a:** Operaci?n en lazo cerrado con monitoreo de KPIs.

**Resultados Encontrados:**
? **-27% en Sobrecosto El?ctrico:** Pico recortado de 1,040 kW a 760 kW.
? **?0.8?C de Estabilidad T?rmica:** Eliminaci?n de sobrecalentamientos >42?C.
? **85% de Resiliencia en Modo Isla:** Soporte cr?tico solar + bater?as BESS.
? **100% de Cumplimiento Regulatorio XM y CREG 015.**`,
    img: null,
    isSnorlax: true,
  },
];

// ===== PATHFINDING AUTOMATICO =====
const autoWalk = {
  active: false,
  path: [],
  stepIndex: 0,
  targetNpcIdx: -1,
};

let pendingAutoWalkTargetNpc = -1;
let portalCooldownTimer = 0;
let lastClickTile = null;

function buildPath(fromTX, fromTY, toTX, toTY) {
  if (fromTX === toTX && fromTY === toTY) return [];

  const isWalkable = (tx, ty) => {
    if (!mapData) return false;
    if (tx < 0 || tx >= mapData.mapWidth || ty < 0 || ty >= mapData.mapHeight) return false;
    if (tx === toTX && ty === toTY) return true;
    if (solidTiles.has(`${tx},${ty}`)) return false;
    return true;
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
        queue.push({
          x: nx,
          y: ny,
          path: path.concat([{ tileX: x, tileY: y, dir: d.dir }]),
        });
      }
    }
  }
  return null;
}

function getWalkableAdjacentTile(npcX, npcY) {
  const candidates = [
    { x: npcX, y: npcY + 1 }, // al frente
    { x: npcX - 1, y: npcY }, // izquierda
    { x: npcX + 1, y: npcY }, // derecha
    { x: npcX, y: npcY - 1 }, // atras
    { x: npcX, y: npcY + 2 }, // dos casillas abajo (util para Snorlax)
  ];

  for (const c of candidates) {
    if (c.x >= 0 && c.x < mapData.mapWidth && c.y >= 0 && c.y < mapData.mapHeight) {
      if (!solidTiles.has(`${c.x},${c.y}`)) {
        return c;
      }
    }
  }
  return { x: npcX, y: npcY + 1 };
}

function goToNPC(idx) {
  const npc = npcs[idx];
  if (!npc) return;

  const currentTX = Math.floor(player.x / WORLD_TILE);
  const currentTY = Math.floor(player.y / WORLD_TILE);
  const curZone = getZone(currentTX, currentTY);
  const targetZone = getZone(npc.x, npc.y);

  document.querySelectorAll(".npc-list-btn").forEach((b, i) => {
    b.classList.toggle("active-npc", i === idx);
  });

  if (curZone === targetZone) {
    pendingAutoWalkTargetNpc = -1;
    const targetTile = getWalkableAdjacentTile(npc.x, npc.y);
    const path = buildPath(currentTX, currentTY, targetTile.x, targetTile.y);
    if (path && path.length > 0) {
      autoWalk.active = true;
      autoWalk.path = path;
      autoWalk.stepIndex = 0;
      autoWalk.targetNpcIdx = idx;
    } else {
      openNPCDialog(idx);
    }
  } else {
    pendingAutoWalkTargetNpc = idx;
    let portalTile = null;

        if (curZone === "exterior") {
      portalTile = { x: 21, y: 65 };
    } else if (curZone === "interior" && targetZone === "lab") {
      portalTile = { x: 78, y: 12 };
    } else if (curZone === "lab" && targetZone === "interior") {
      // Si el objetivo es Snorlax, tomar el ascensor directo a Snorlax (9, 12)
      if (npc.isSnorlax || npc.id === "snorlax") {
        portalTile = { x: 9, y: 12 };
      } else {
        portalTile = { x: 17, y: 12 };
      }
    } else if (curZone === "interior" && targetZone === "exterior") {
      portalTile = { x: 69, y: 31 };
    }

    if (portalTile) {
      const path = buildPath(currentTX, currentTY, portalTile.x, portalTile.y);
      if (path && path.length > 0) {
        autoWalk.active = true;
        autoWalk.path = path;
        autoWalk.stepIndex = 0;
        autoWalk.targetNpcIdx = idx;
      }
    }
  }
}
window.goToNPC = goToNPC;

// ===== DIALOGO FORMATEADO SIN GRAFICAS =====
let activeNPCDialog = -1;

function formatDialogText(text) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong style='color:#00f0ff;'>$1</strong>");
  html = html.split("\n\n").join("<br><br>");
  html = html.split("\n").join("<br>");
  return html;
}


function isOakDashboardOpen() {
  const modal = document.getElementById("oak-dashboard-modal");
  return modal && !modal.classList.contains("hidden");
}

function openOakDashboard() {
  const modal = document.getElementById("oak-dashboard-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  closeNPCDialog();
  keys.clear();
  player.moving = false;
  autoWalk.active = false;
  const promptEl = document.getElementById("oak-interaction-prompt");
  if (promptEl) promptEl.classList.add("hidden");
}
window.openOakDashboard = openOakDashboard;

function closeOakDashboard() {
  const modal = document.getElementById("oak-dashboard-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  keys.clear();
  player.moving = false;
  const canvasEl = document.getElementById("gameCanvas");
  if (canvasEl) canvasEl.focus();
}
window.closeOakDashboard = closeOakDashboard;

function updateInteractionPrompt() {
  const promptEl = document.getElementById("oak-interaction-prompt");
  if (!promptEl) return;
  if (isOakDashboardOpen() || activeNPCDialog !== -1 || transition.active) {
    promptEl.classList.add("hidden");
    return;
  }
  const currentTX = Math.floor(player.x / WORLD_TILE);
  const currentTY = Math.floor(player.y / WORLD_TILE);

  let nearestNpc = null;
  let minDist = 2.4;
  for (let i = 0; i < npcs.length; i++) {
    const npc = npcs[i];
    const dist = Math.hypot(npc.x - currentTX, npc.y - currentTY);
    if (dist <= minDist) {
      minDist = dist;
      nearestNpc = { ...npc, index: i };
    }
  }

  if (nearestNpc) {
    promptEl.classList.remove("hidden");
    const textEl = document.getElementById("oak-prompt-text");
    if (textEl) {
      if (nearestNpc.id === "oak" || nearestNpc.name.includes("Oak")) {
        textEl.textContent = "Abrir Dashboard Pok?mon (Prof. Oak)";
      } else {
        textEl.textContent = `Hablar con ${nearestNpc.name}`;
      }
    }
  } else {
    promptEl.classList.add("hidden");
  }
}

function openNPCDialog(idx) {
  const npc = npcs[idx];
  if (!npc) return;

  // Interaccion con el Profesor Oak: abrir directamente el Dashboard tematico de SantiagoS
  if (npc.id === "oak" || npc.name.includes("Oak")) {
    openOakDashboard();
    const btn = document.getElementById(`btn-npc-${idx}`);
    if (btn) {
      btn.classList.remove("active-npc");
      btn.classList.add("visited-npc");
    }
    return;
  }

  activeNPCDialog = idx;
  const dialog = document.getElementById("npc-dialog");
  document.getElementById("npc-dialog-name").textContent = npc.fullName || npc.name;
  document.getElementById("npc-dialog-role").textContent = npc.role;
  document.getElementById("npc-dialog-text").innerHTML = formatDialogText(npc.dialog);

  // Avatar
  const avatarCanvas = document.getElementById("npc-dialog-avatar");
  if (avatarCanvas && npc.img) {
    const actx = avatarCanvas.getContext("2d");
    actx.imageSmoothingEnabled = false;
    actx.clearRect(0, 0, avatarCanvas.width, avatarCanvas.height);
    if (npc.isSnorlax) {
      actx.drawImage(npc.img, 0, 0, npc.img.width, npc.img.height, 0, 0, avatarCanvas.width, avatarCanvas.height);
    } else {
      actx.drawImage(npc.img, 0, 0, 32, 32, 0, 0, avatarCanvas.width, avatarCanvas.height);
    }
  }

  // Ocultar contenedor de graficas (eliminadas a peticion del usuario)
  const chartDiv = document.getElementById("npc-dialog-chart");
  if (chartDiv) {
    chartDiv.style.display = "none";
    chartDiv.innerHTML = "";
  }

  dialog.classList.remove("hidden");

  const btn = document.getElementById(`btn-npc-${idx}`);
  if (btn) {
    btn.classList.remove("active-npc");
    btn.classList.add("visited-npc");
  }
}
window.openNPCDialog = openNPCDialog;

function closeNPCDialog() {
  document.getElementById("npc-dialog").classList.add("hidden");
  activeNPCDialog = -1;
}
window.closeNPCDialog = closeNPCDialog;

// ===== INPUT Y CONTROL =====
const keys = new Set();
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (isOakDashboardOpen()) {
      closeOakDashboard();
      e.preventDefault();
      return;
    }
    closeNPCDialog();
    return;
  }

  if (isOakDashboardOpen()) return;

  keys.add(e.key.toLowerCase());
  if (e.key.toLowerCase() === "e" || e.key === " ") {
    const currentTX = Math.floor(player.x / WORLD_TILE);
    const currentTY = Math.floor(player.y / WORLD_TILE);
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const dist = Math.hypot(npc.x - currentTX, npc.y - currentTY);
      if (dist <= 2.4) {
        openNPCDialog(i);
        e.preventDefault();
        break;
      }
    }
  }
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
  lastClickTile = { x: clickedTileX, y: clickedTileY };

  for (let i = 0; i < npcs.length; i++) {
    const npc = npcs[i];
    const threshold = npc.isSnorlax ? 2 : 1;
    if (Math.abs(clickedTileX - npc.x) <= threshold && Math.abs(clickedTileY - npc.y) <= threshold) {
      goToNPC(i);
      return;
    }
  }

  if (clickDisplay) clickDisplay.textContent = `X: ${clickedTileX}, Y: ${clickedTileY}`;
});

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 640;

function resizeCanvas() {
  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;
  ctx.imageSmoothingEnabled = false;
}

function initNPCUI() {
  const container = document.querySelector(".npc-list-items");
  if (!container) return;

  container.innerHTML = "";
  npcs.forEach((npc, i) => {
    const btn = document.createElement("button");
    btn.className = "npc-list-btn";
    btn.id = `btn-npc-${i}`;
    btn.innerHTML = `
      <canvas class="npc-btn-canvas" id="canvas-npc-${i}" width="32" height="32"></canvas>
      <div class="npc-btn-info">
        <span class="npc-btn-name">${npc.name}</span>
        <span class="npc-btn-role">${npc.role}</span>
      </div>
      <span class="npc-btn-arrow">&#x2192;</span>
    `;
    btn.addEventListener("click", () => goToNPC(i));
    container.appendChild(btn);

    setTimeout(() => {
      const c = document.getElementById(`canvas-npc-${i}`);
      if (c && npc.img) {
        const bctx = c.getContext("2d");
        bctx.imageSmoothingEnabled = false;
        if (npc.isSnorlax) {
          bctx.drawImage(npc.img, 0, 0, npc.img.width, npc.img.height, 0, 0, 32, 32);
        } else {
          bctx.drawImage(npc.img, 0, 0, 32, 32, 0, 0, 32, 32);
        }
      }
    }, 150);
  });
}

async function init() {
  try {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const mapResponse = await fetch("./map.json");
    mapData = await mapResponse.json();

    tilesetImage = await loadImage("./spritesheet.png");
    walkerSheet = await loadImage("./brendan-walk.png");
    logoScreenImg = await loadImage("./logo_screen.png");

    npcOakImg = await loadImage("./npc_oak_32.png");
    npcLeafImg = await loadImage("./npc_leaf_32.png");
    npcErikaImg = await loadImage("./npc_erika_32.png");
    npcScientistImg = await loadImage("./npc_scientist_32.png");
    snorlaxImg = await loadImage("./snorlax_scaled.png");

    initSolidCollisions(mapData);

    // Asignar sprites correspondientes
    npcs[0].img = npcErikaImg;
    npcs[1].img = npcLeafImg;
    npcs[2].img = npcErikaImg;
    npcs[3].img = npcScientistImg;
    npcs[4].img = npcOakImg;
    npcs[5].img = snorlaxImg;

    initNPCUI();

        const fsBtn = document.getElementById("btn-fullscreen");
    if (fsBtn) {
      fsBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    const toggleBtn = document.getElementById("toggle-npc-panel");
    const panel = document.getElementById("npc-list-panel");
    if (toggleBtn && panel) {
      toggleBtn.addEventListener("click", () => {
        panel.classList.toggle("hidden-panel");
      });
    }

    const closeBtn = document.getElementById("btn-close-dialog");
    if (closeBtn) closeBtn.addEventListener("click", closeNPCDialog);

    const closeOakBtn = document.getElementById("btn-close-oak-dashboard");
    if (closeOakBtn) closeOakBtn.addEventListener("click", closeOakDashboard);

    const oakOverlay = document.getElementById("oak-dashboard-overlay");
    if (oakOverlay) oakOverlay.addEventListener("click", closeOakDashboard);

    const oakIframe = document.getElementById("oak-dashboard-iframe");
    if (oakIframe) {
      oakIframe.addEventListener("load", () => {
        try {
          oakIframe.contentWindow.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
              closeOakDashboard();
            }
          });
        } catch (err) {
          console.warn("Could not attach listener directly to iframe:", err);
        }
      });
    }

    window.addEventListener("message", (e) => {
      if (e.data && e.data.type === "CLOSE_OAK_DASHBOARD") {
        closeOakDashboard();
      }
    });

    preRenderedMap = renderMapCanvas(mapData, tilesetImage);

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  } catch (err) {
    console.error("Error al inicializar:", err);
  }
}

function renderMapCanvas(map, tileset) {
  const mapCanvas = document.createElement("canvas");
  mapCanvas.width = map.mapWidth * map.tileSize;
  mapCanvas.height = map.mapHeight * map.tileSize;
  const mctx = mapCanvas.getContext("2d");
  mctx.imageSmoothingEnabled = false;

  const cols = Math.floor(tileset.width / map.tileSize);
  for (const layer of map.layers) {
    for (const tile of layer.tiles) {
      const id = parseInt(tile.id, 10);
      const sx = (id % cols) * map.tileSize;
      const sy = Math.floor(id / cols) * map.tileSize;
      const dx = tile.x * map.tileSize;
      const dy = tile.y * map.tileSize;
      mctx.drawImage(tileset, sx, sy, map.tileSize, map.tileSize, dx, dy, map.tileSize, map.tileSize);
    }
  }
  return mapCanvas;
}

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  update(dt);
  render();
  updateInteractionPrompt();
  requestAnimationFrame(gameLoop);
}

function canMoveTo(nextX, nextY) {
  if (!mapData) return true;
  const margin = 6;
  const checkPoints = [
    { x: nextX - margin, y: nextY - margin },
    { x: nextX + margin, y: nextY - margin },
    { x: nextX - margin, y: nextY + margin },
    { x: nextX + margin, y: nextY + margin },
  ];

  for (const pt of checkPoints) {
    const tx = Math.floor(pt.x / WORLD_TILE);
    const ty = Math.floor(pt.y / WORLD_TILE);
    if (tx < 0 || tx >= mapData.mapWidth || ty < 0 || ty >= mapData.mapHeight) {
      return false;
    }
    if (solidTiles.has(`${tx},${ty}`)) {
      return false;
    }
  }
  return true;
}

function update(dt) {
  if (isOakDashboardOpen()) {
    keys.clear();
    player.moving = false;
    return;
  }
  // 1. Transicion de portal
  if (transition.active) {
    const elapsed = performance.now() - transition.startTime;
    if (elapsed >= transition.duration) {
      transition.active = false;
      player.x = transition.targetX;
      player.y = transition.targetY;
      player.dir = transition.targetDir;
      currentZone = transition.targetZone;
      portalCooldownTimer = 1.0;

      if (pendingAutoWalkTargetNpc >= 0) {
        const nextTarget = pendingAutoWalkTargetNpc;
        setTimeout(() => {
          goToNPC(nextTarget);
        }, 60);
      }
    }
    return;
  }

  // 2. Movimiento automatico por ruta
  if (autoWalk.active) {
    const step = autoWalk.path[autoWalk.stepIndex];
    if (!step) {
      autoWalk.active = false;
      if (pendingAutoWalkTargetNpc === -1 && autoWalk.targetNpcIdx >= 0) {
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
      player.x = targetX;
      player.y = targetY;
      autoWalk.stepIndex++;

      const currentTileX = Math.floor(player.x / WORLD_TILE);
      const currentTileY = Math.floor(player.y / WORLD_TILE);
      if (portalCooldownTimer <= 0) {
        for (const p of portals) {
          const matchTile = p.from.some((f) => f.x === currentTileX && f.y === currentTileY);
          if (matchTile) {
            startPortalTransition(
              p.zone || "interior",
              p.target.x * WORLD_TILE,
              p.target.y * WORLD_TILE,
              p.targetDir || "down",
              p.message,
              p.duration || 3000
            );
            closeNPCDialog();
            autoWalk.active = false;
            return;
          }
        }
      }

      if (autoWalk.stepIndex >= autoWalk.path.length) {
        autoWalk.active = false;
        if (pendingAutoWalkTargetNpc === -1 && autoWalk.targetNpcIdx >= 0) {
          openNPCDialog(autoWalk.targetNpcIdx);
        }
      }
    } else {
      const speed = player.speed * dt;
      player.x += (dx / dist) * speed;
      player.y += (dy / dist) * speed;

      if (Math.abs(dx) > Math.abs(dy)) {
        player.dir = dx > 0 ? "right" : "left";
      } else {
        player.dir = dy > 0 ? "down" : "up";
      }
      player.moving = true;
      player.frame = (player.frame + dt * 8) % 3;
    }
    return;
  }

  // 3. Movimiento manual por teclado
  let dx = 0; let dy = 0;
  if (keys.has("arrowup") || keys.has("w")) { dy -= 1; player.dir = "up"; }
  if (keys.has("arrowdown") || keys.has("s")) { dy += 1; player.dir = "down"; }
  if (keys.has("arrowleft") || keys.has("a")) { dx -= 1; player.dir = "left"; }
  if (keys.has("arrowright") || keys.has("d")) { dx += 1; player.dir = "right"; }

  if (dx !== 0 || dy !== 0) {
    autoWalk.active = false;
    pendingAutoWalkTargetNpc = -1;
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

  // Activacion manual de portales
  if (portalCooldownTimer > 0) portalCooldownTimer -= dt;

  if (!transition.active && portalCooldownTimer <= 0) {
    for (const p of portals) {
      const matchTile = p.from.some((f) => f.x === currentTileX && f.y === currentTileY);
      const matchDir = !p.triggerDir || player.dir === p.triggerDir;
      if (matchTile && matchDir) {
        startPortalTransition(
          p.zone || "interior",
          p.target.x * WORLD_TILE,
          p.target.y * WORLD_TILE,
          p.targetDir || "down",
          p.message,
          p.duration || 3000
        );
        closeNPCDialog();
        autoWalk.active = false;
        break;
      }
    }
  }

  if (posDisplay) {
    posDisplay.textContent = `X: ${currentTileX}, Y: ${currentTileY}`;
  }
}

function startPortalTransition(targetZone, targetX, targetY, targetDir, message, duration = 3000) {
  transition.active = true;
  transition.startTime = performance.now();
  transition.duration = duration || 3000;
  transition.targetZone = targetZone;
  transition.targetX = targetX;
  transition.targetY = targetY;
  transition.targetDir = targetDir;
  transition.message = message || "TELETRANSPORTANDO...";
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

  drawEntities();
  drawClickMarker();
  drawPlayer();

  ctx.restore();
}

function drawEntities() {
  // Renderizar a los 5 personajes humanos (sin badges ni texto flotante encima)
  for (let i = 0; i < 5; i++) {
    const ent = npcs[i];
    if (!ent || !ent.img) continue;
    const dx = Math.round((ent.x + 0.5) * WORLD_TILE - walkerSprite.drawW / 2);
    const dy = Math.round((ent.y + 1) * WORLD_TILE - walkerSprite.drawH + 16);
    ctx.drawImage(ent.img, 0, 0, 32, 32, dx, dy, walkerSprite.drawW, walkerSprite.drawH);
  }

  // Renderizar a Snorlax en (55, 14) ocupando 2x2 bloques
  if (snorlaxImg) {
    const snorlaxW = 72;
    const snorlaxH = 63;
    const sx = Math.round((55 + 1.0) * WORLD_TILE - snorlaxW / 2);
    const sy = Math.round((14 + 1.0) * WORLD_TILE - snorlaxH + 20);
    ctx.drawImage(snorlaxImg, sx, sy, snorlaxW, snorlaxH);
  }
}

function drawClickMarker() {
  if (!lastClickTile) return;
  const tx = lastClickTile.x * WORLD_TILE;
  const ty = lastClickTile.y * WORLD_TILE;

  ctx.fillStyle = "rgba(0, 255, 136, 0.25)";
  ctx.fillRect(tx, ty, WORLD_TILE, WORLD_TILE);

  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 2;
  ctx.strokeRect(tx, ty, WORLD_TILE, WORLD_TILE);

  const cx = tx + WORLD_TILE / 2;
  const cy = ty + WORLD_TILE / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
  ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
  ctx.stroke();

  const text = `(${lastClickTile.x}, ${lastClickTile.y})`;
  ctx.font = "10px 'Press Start 2P', monospace";
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = "rgba(13, 17, 28, 0.9)";
  ctx.fillRect(cx - tw / 2 - 4, ty - 18, tw + 8, 14);
  ctx.strokeStyle = "rgba(0, 255, 136, 0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - tw / 2 - 4, ty - 18, tw + 8, 14);
  ctx.fillStyle = "#00ff88";
  ctx.textAlign = "center";
  ctx.fillText(text, cx, ty - 7);
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
  const msg = transition.message || "TELETRANSPORTANDO...";
  ctx.fillText(msg, canvas.width / 2, barY + 32);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
