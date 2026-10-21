const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const statusNode = document.querySelector("#status");

const rockPopupEl = document.querySelector("#rock-popup");
const rockPopupImgEl = document.querySelector("#rock-popup-img");
const rockPopupTextEl = document.querySelector("#rock-popup-text");
const rockPopupCloseEl = document.querySelector("#rock-popup-close");

ctx.imageSmoothingEnabled = false;

const assets = {
  map: loadJSON("./assets/map.json?v=" + Date.now()),
  tileset: loadImage("./assets/spritesheet.png?v=" + Date.now()),
  rider: loadImage("./assets/brendan-gyarados.png?v=" + Date.now()),
  walker: loadImage("./assets/brendan-walk.png?v=" + Date.now()),
  gyarados: loadImage("./assets/gyarados-wait.png?v=" + Date.now()),
  warship: loadImage("./assets/warship_resized.png?v=" + Date.now()),
  oakIntro: loadImage("./assets/oak-stage.png?v=" + Date.now()),
  gyaradosIntro: loadImage("./assets/gyarados-intro.jpg?v=" + Date.now()),
  shipInterior: loadImage("./assets/ship-interior.png?v=" + Date.now()),
  interiorPlayer: loadImage("./assets/brendan-oras-horizontal.png?v=" + Date.now()),
  shipBoss: loadImage("./assets/npc-boss-ship.png?v=" + Date.now()),
  caveBoss: loadImage("./assets/npc-boss-cave.png?v=" + Date.now()),
  blockerNpcImg: loadImage("./assets/ship-exit-npc.png?v=" + Date.now()),
  remolino: loadImage("./assets/remolino.png?v=" + Date.now()),
  texto_1: loadImage("./assets/oak_slide_1.png?v=" + Date.now()),
  texto_2: loadImage("./assets/oak_slide_2.png?v=" + Date.now()),
  texto_3: loadImage("./assets/oak_slide_3.png?v=" + Date.now()),
  texto_4: loadImage("./assets/oak_slide_4.png?v=" + Date.now()),
  texto_5: loadImage("./assets/oak_slide_5.png?v=" + Date.now()),
  swimmer_1: loadImage("./assets/swimmer_1.png?v=" + Date.now()),
  swimmer_2: loadImage("./assets/swimmer_2.png?v=" + Date.now()),
  swimmer_3: loadImage("./assets/swimmer_3.png?v=" + Date.now()),
  nlpKeywords: loadImage("./assets/03_nlp_keywords.png?v=" + Date.now()),
  intensityDist: loadImage("./assets/13_intensity_distribution.png?v=" + Date.now()),
  graficaRoja: loadImage("./assets/grafica roja.jpeg?v=" + Date.now()),
  graficaVerde: loadImage("./assets/grafica verde.jpeg?v=" + Date.now()),
  dualDashboard: loadImage("./assets/20_dual_dashboard_v4.png?v=" + Date.now()),
  umapClusters: loadImage("./assets/09_umap_clusters.png?v=" + Date.now()),
  topicDistributions: loadImage("./assets/10_topic_distributions.png?v=" + Date.now()),
  gdeltTone: loadImage("./assets/08_gdelt_tone.png?v=" + Date.now()),
};

const keys = new Set();
const controlKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D", " ", "Enter"]);
const mapScale = 2;
let viewScale = 1;
let tileSize = 16;
const terrain = {
  water: new Set([
    "0", "1", "16", "62", "77", "79", "82", "126"
  ]),
  rock: new Set([
    "29", "30", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45",
    "46", "47", "48", "49", "50", "55", "56", "57", "58", "59", "60", "61",
    "63", "76", "78",
    "80", "81", "84", "86", "90", "91", "92", "93", "94", "95", "96", "97", "98",
    "99", "100", "102", "104", "105", "106", "108", "109", "110", "111", "112", "113", "114",
    "117", "118", "119", "120", "121", "122", "123",
    // Nuevas texturas de roca del mapa actualizado
    "153", "154", "155",
    // Muros y casco exterior del buque (sólidas/colisión)
    "131", "132", "133", "134", "135", "136", "137", "138", "139", "140", "141", "142", "143", "144", "145", "146", "147", "148"
  ]),
  land: new Set([
    "11", "18", "19", "21", "22", "24", "25", "26", "27", "28", "124", "125", "31", "32", "33", "34", "35", "51", "52", "53", "54", "70", "71",
    "83", "85", "87", "88", "89", "101", "103", "107", "115", "116", "127",
    "64", "65", "66", "67", "68", "69", "72", "73", "74", "75",
    // Texturas transitables de la cubierta y muelle del buque
    "128", "129", "130", "149", "150", "151", "152"
  ]),
};

const riderSprite = {
  cellW: 168,
  cellH: 116,
  drawW: 132,
  drawH: 92,
  rows: {
    down: 0,
    left: 1,
    right: 2,
    up: 3,
  },
};

const walkerSprite = {
  cellW: 24,
  cellH: 32,
  drawW: 48,
  drawH: 64,
  rows: {
    down: 0,
    left: 1,
    up: 2,
    right: 3,
  },
};

// Cropping / display metrics for interior sprites (fixed offsets found from assets)
const interiorPlayerCrop = {
  srcCellW: 24,
  srcCellH: 32,
  // small left padding inside each 24px cell; crop tighter to remove extra padding
  offsetX: 6,
  offsetY: 0,
  cropW: 18,
  cropH: 32,
  baseDrawW: 42,
  baseDrawH: 56,
};

const music = {
  oak: createMusicTrack("./assets/audio/musica-oak.mp3", 0.46),
  route: createMusicTrack("./assets/audio/ruta-1.mp3", 0.4),
  cave: createMusicTrack("./assets/audio/cueva.mp3", 0.44),
  ship: createMusicTrack("./assets/audio/buque-interior.mp3", 0.5),
  underwater: createMusicTrack("./assets/audio/remolino-musica.mp3", 0.45),
  final: createMusicTrack("./assets/audio/final.mp3", 0.48),
};

const footstepSounds = [
  createSoundEffect("./assets/sfx/boots_step_left_1.wav", 0.2),
  createSoundEffect("./assets/sfx/boots_step_right_1.wav", 0.2),
];

let currentMusic = null;
let audioStarted = false;
let footstepIndex = 0;
let lastShipStepFrame = -1;

const player = {
  x: 300,
  y: 320,
  speed: 132,
  dir: "down",
  frame: 0,
  moving: false,
  riding: false,
};

const gyarados = {
  x: 0,
  y: 0,
  dir: "down",
  frame: 0,
  visible: true,
};

const warshipPlacement = {
  tileX: 65,
  tileY: 15,
  widthTiles: 18,
};

const shipDoor = {
  get tileX() { return warshipPlacement.tileX + 11; },
  get tileY() { return warshipPlacement.tileY + 8; }
};

const scene = {
  mode: "exterior",
};

const shipInterior = {
  x: 96,
  dir: "right",
  frame: 0,
  moving: false,
  cameraX: 0,
  returnRiding: true,
};

const intro = {
  active: true,
  phase: "title",
  dialogIndex: 0,
  dialogs: [
    {
      image: "oak",
      text: "Desde febrero de 2026 hemos tenido un conflicto politico en el que los protagonistas son Iran, Israel y Estados Unidos.",
    },
    {
      image: "oak",
      text: "Tu objetivo en este juego es derrotar a los desinformadores amarillistas que enganan al publico.",
    },
    {
      image: "oak",
      text: "Tambien tendras que encontrar un modelo que nos ayude a comprender al maximo los datos que poseemos.",
    },
    {
      image: "gyarados",
      text: "Te presento a tu Pokemon, Gyarados. Junto a el tendras la aventura para combatir esta situacion.",
    },
    {
      image: "oak",
      text: "Tienes que ir a las 3 zonas del estrecho: la cueva, el buque y el remolino. En cada una encontraras informacion. Buena suerte.",
    },
  ],
};

const caveBoss = {
  tileX: 23,
  tileY: 36,
};

const blockerNpc = {
  tileX: 76,
  tileY: 73,
};

const restrictedTiles = [
  { x: 75, y: 73 },
  { x: 75, y: 72 },
  { x: 75, y: 71 },
  { x: 75, y: 70 },
  { x: 75, y: 69 },
];

const activeDialog = {
  active: false,
  text: "",
};

const remolinoAnim = {
  frame: 0,
  speed: 12,
};

const swimmerAnim = {
  frame: 0,
  speed: 6,
};

const swimmerImages = [];
const oakDialogImages = [];
const oakDialogWords = [];

const camera = { x: 0, y: 0 };
let riderSheet;
let walkerSheet;
let gyaradosSheet;
let warshipImage;
let oakIntroImage;
let gyaradosIntroImage;
let shipInteriorImage;
let interiorPlayerSheet;
let shipBossImage;
let caveBossImage;
let blockerNpcImage;
let remolinoImage;
let mapImage;
let tileMap;
let tilesetImage;
let terrainGrid;
let tileIdGrid;
const bushTiles = new Set(["64", "65", "66", "67", "68", "69", "72", "73", "74", "75"]);
let waterMask;
let waterTexture;

let nlpKeywordsImage;
const resolvedAssets = {};

const interactiveRocks = [
  {
    x: 26,
    y: 39,
    imageKey: "nlpKeywords",
    text: "procesamos información de fuentes como: GDELT, YouTube y RSS. donde encontramos que términos tácticos como \"attack\" y \"strike\" dominan la frecuencia, seguidos por vectores de amenaza como \"drone\" y \"missile\". Es la alarma temprana del sistema."
  },
  {
    x: 26,
    y: 45,
    imageKey: "topicDistributions",
    text: "10_topic_distributions.png (Distribución Temporal de Tópicos):\n\nInsight: El tópico de escalada (cluster_2_w24h) secuestra la atención digital por ventanas completas, alcanzando picos de saturación absoluta (1.0) de manera intermitente entre 2024 y 2026. Evidencia campañas coordinadas en el tiempo."
  },
  {
    x: 19,
    y: 45,
    imageKey: "gdeltTone",
    text: "08_gdelt_tone.png (Tono Promedio Global):\n\nInsight: El histograma revela una fuerte polarización con un sesgo marcadamente negativo, concentrando la mayor cantidad de reportes en un sentimiento de tono entre -3 y -5. Muestra la hostilidad mediática latente de la región."
  }
];

const rockPopupState = {
  active: false,
  rock: null,
  closeBtn: null
};

const shipPopups = [
  {
    image: "./assets/12_nerve_war_outliers.png",
    text: "Este modelo realiza una clasificación binaria para diferenciar si la tensión de un día específico corresponde a una \"Guerra de Nervios\" (0 = alta actividad digital pero sin impacto físico) o a una \"Acción Física\" (1 = eventos reales en tierra)."
  },
  {
    image: "./assets/05_acled_actors.png",
    text: "Lo que se encontró: El gráfico de barras revela que Hezbollah es el actor con mayor actividad cinética registrada, superando por un margen abrumador (casi 3,000 eventos) al resto de las facciones analizadas por ACLED (como Hamas o los Houthis). Define el mapa de actores asimétricos reales en el tablero."
  },
  {
    image: "./assets/06_nasa_daynight.png",
    text: "Lo que se encontró: Existe un sesgo nocturno/diurno masivo, donde los impactos y fuegos detectados por satélite durante el día (\"D\", casi 30,000) superan a los nocturnos (\"N\", ~17,500). Muestra los patrones operativos de los ataques cinéticos para planificar el monitoreo satelital."
  },
  {
    image: "./assets/07_opensky_altitudes.png",
    text: "Lo que se encontró: El gráfico de violín de OpenSky detectó una deformación anómala en la base de la distribución (entre los 6,000 y 8,000 metros de altitud). Descubre que el tráfico aéreo comercial se ve forzado a descender o desatender cotas seguras óptimas (~12,000 metros) debido a alertas operativas en el espacio aéreo de Medio Oriente."
  }
];

const shipPopupState = {
  active: false,
  index: -1
};

const caveBossDialog = {
  active: false,
  step: 0,
  texts: [
    "Me obligaron a mentir en los medios de comunicación, yo nunca quise hacerlo!",
    "Te ayudaré a acabar con la desinformación, toca las piedras que están en la cueva con tu mouse y click izquierdo."
  ]
};

const shipBossDialog = {
  active: false,
  step: 0,
  texts: [
    "Amenzaron de muerte a mi familia, ya me cansé de cubrir sus mentiras y engaños, toma esto. Te dará acceso a el remolino y encontrarás un ultimo modelo para mejorar tu investigación. Suerte.",
    "*Haz recibido un pato de pato de hule.*"
  ]
};

let hasRubberDuck = false;

const underwaterScene = {
  x: 100,
  dir: "right",
  frame: 0,
  moving: false,
  cameraX: 0,
  worldW: 2400,
};

const underwaterPopups = [
  {
    image: null,
    text: "📈 Zona 3: El Centro de Comando Dual (El Frente Predictivo y Macroeconómico)\n\nRidge Regression - Selección Definitiva (V4 RAG-Optimized):\nCuriosamente, esta arquitectura lineal penalizada superó a los modelos basados en árboles. Consiguió el mínimo error histórico del proyecto con un RMSE de 9.24 y un MAE de 7.17.\n\nEl Factor Clave: El éxito de su estabilidad se debió a la implementación de Memoria Inercial (variables lag1, lag3 y medias móviles de 7 días) y a la Optimización RAG conectada a PostgreSQL + pgvector, inyectando el contexto semántico de los 5 días históricos más similares.\n\nModelos Evaluados (V4):\n- Random Forest (RAG): RMSE 10.72, MAE 8.65\n- XGBoost (RAG-Optimized): RMSE 10.85, MAE 8.74 (captura excelente de \"picos tácticos\")."
  },
  {
    image: "./assets/13_intensity_distribution.png",
    text: "📊 Distribución del Target de Intensidad:\n\nLo que se encontró: El gráfico muestra una distribución con una asimetría positiva extrema (\"cola pesada\"), donde la inmensa mayoría de los días con conflicto se concentran en scores bajos (entre 2 y 20 puntos de intensidad).\n\nEsto justificó técnicamente la aplicación de la transformación logarítmica log1p para evitar que los escasos picos de intensidad extrema (puntos en 80 y 100) destruyeran los gradientes durante el entrenamiento."
  },
  {
    image: "./assets/grafica roja.jpeg",
    text: "🔴 Fase 1: Clasificación de Naturaleza:\n\nLo que se encontró: Al graficar la predicción de la tipología del riesgo frente al precio del crudo WTI de la API de FRED, se descubrió una estrecha relación entre la volatilidad económica y la escalada real.\n\nEl Linear SVC (V5) utiliza esta señal del crudo para estabilizarse, logrando su máximo histórico de F1-Macro de 0.608 y evitando que el pánico en redes sociales genere falsas alarmas de ataque físico."
  },
  {
    image: "./assets/grafica verde.jpeg",
    text: "🟢 Fase 2: Estimación de Intensidad:\n\nLo que se encontró: Muestra la curva de la predicción suavizada del modelo Ridge RAG-Optimized siguiendo con precisión milimétrica la sinuosidad de la Intensidad Real.\n\nSe descubrió que la combinación de variables de memoria inercial (lags) y la inyección del contexto semántico histórico desde PostgreSQL + pgvector permitieron estabilizar la regresión, alcanzando el mínimo error histórico del sistema (RMSE de 9.24)."
  }
];

const underwaterPopupState = {
  active: false,
  index: -1
};

const underwaterBubbles = [];

const creditsState = {
  active: false,
  startTime: 0,
  text: [
    "PROYECTO FINAL",
    "",
    "MIGUEL MORENO",
    "SANTIAGO SANDOVAL",
    "",
    "Pulsa enter para repetir la experiencia."
  ]
};

let waterLayer;
let lastTime = performance.now();
let elapsed = 0;
// Debug toggle to visualize sprite source/destination boxes in interior
let debugSpriteOverlay = false;
// Manual override for the warship interior walk line.
// sourceY is the foot line on ship-interior.png, placed on the visible floor surface.
const manualInteriorLine = { enabled: true, sourceY: 625 };

Promise.all([
  assets.map,
  assets.tileset,
  assets.rider,
  assets.walker,
  assets.gyarados,
  assets.warship,
  assets.oakIntro,
  assets.gyaradosIntro,
  assets.shipInterior,
  assets.interiorPlayer,
  assets.shipBoss,
  assets.caveBoss,
  assets.blockerNpcImg,
  assets.remolino,
  assets.texto_1,
  assets.texto_2,
  assets.texto_3,
  assets.texto_4,
  assets.texto_5,
  assets.swimmer_1,
  assets.swimmer_2,
  assets.swimmer_3,
  assets.nlpKeywords,
  assets.intensityDist,
  assets.graficaRoja,
  assets.graficaVerde,
  assets.dualDashboard,
  assets.umapClusters,
  assets.topicDistributions,
  assets.gdeltTone,
  // Custom font loader promise
  (document.fonts && FontFace) ? 
    new FontFace('PokemonGB', 'url(./assets/Pokemon_GB.ttf)').load().then(f => {
      document.fonts.add(f);
      return f;
    }).catch(e => {
      console.warn("Could not load PokemonGB font", e);
      return null;
    }) : Promise.resolve(null),
]).then(([
  mapData, tilesetImg, riderImg, walkerImg, gyaradosImg, warshipImg, 
  oakIntroImg, gyaradosIntroImg, shipInteriorImg, interiorPlayerImg, 
  shipBossImg, caveBossImg, blockerNpcImg, remolinoImg,
  txt1, txt2, txt3, txt4, txt5, swim1, swim2, swim3, nlpImg,
  intensityDistImg, graficaRojaImg, graficaVerdeImg, dualDashboardImg,
  umapClustersImg, topicDistributionsImg, gdeltToneImg,
  fontObj
]) => {
  tileMap = mapData;
  tilesetImage = tilesetImg;
  tileSize = mapData.tileSize;

  // Change tile at (101, 27) to water (ID 0) as requested by the user
  if (mapData && mapData.layers && mapData.layers[0]) {
    const layer = mapData.layers[0];
    const targetTile = layer.tiles.find(t => t.x === 101 && t.y === 27);
    if (targetTile) {
      targetTile.id = "0";
      console.log("Programmatically changed tile at (101, 27) to water ID 0");
    } else {
      layer.tiles.push({ x: 101, y: 27, id: "0" });
    }
  }

  mapImage = renderTileMap(mapData, tilesetImg);
  terrainGrid = buildTerrainGrid(mapData);
  tileIdGrid = buildTileIdGrid(mapData);
  riderSheet = removePinkBackground(riderImg);
  walkerSheet = walkerImg;
  gyaradosSheet = gyaradosImg;
  warshipImage = warshipImg;
  oakIntroImage = oakIntroImg;
  gyaradosIntroImage = gyaradosIntroImg;
  shipInteriorImage = shipInteriorImg;
  interiorPlayerSheet = interiorPlayerImg;
  shipBossImage = shipBossImg;
  caveBossImage = caveBossImg;
  blockerNpcImage = blockerNpcImg;
  remolinoImage = remolinoImg;

  // Swimmer frames
  swimmerImages[0] = swim1;
  swimmerImages[1] = swim2;
  swimmerImages[2] = swim3;
  nlpKeywordsImage = nlpImg;
  resolvedAssets["nlpKeywords"] = nlpImg;
  resolvedAssets["intensityDist"] = intensityDistImg;
  resolvedAssets["graficaRoja"] = graficaRojaImg;
  resolvedAssets["graficaVerde"] = graficaVerdeImg;
  resolvedAssets["dual_dashboard"] = dualDashboardImg;
  resolvedAssets["umapClusters"] = umapClustersImg;
  resolvedAssets["topicDistributions"] = topicDistributionsImg;
  resolvedAssets["gdeltTone"] = gdeltToneImg;

  // GBA Text preloaded images
  oakDialogImages[0] = txt1;
  oakDialogImages[1] = txt2;
  oakDialogImages[2] = txt3;
  oakDialogImages[3] = txt4;
  oakDialogImages[4] = txt5;

  // Fullscreen oak intro slides are used directly; pre-slicing is omitted for fast loading.
  if (manualInteriorLine && manualInteriorLine.enabled) console.log('Using ship interior floor sourceY=', manualInteriorLine.sourceY);
  waterMask = createWaterMask(mapImage);
  waterTexture = createWaterTexture(tilesetImg);
  waterLayer = document.createElement("canvas");
  waterLayer.width = mapImage.width * mapScale;
  waterLayer.height = mapImage.height * mapScale;
  resizeCanvas();
  placePlayerAtStart(mapData);
  placeGyarados(mapData);
  clampPlayer(mapImage);
  requestAnimationFrame(loop);
});

window.addEventListener("resize", resizeCanvas);

canvas.addEventListener("click", (e) => {
  if (intro.active || rockPopupState.active) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) / viewScale;
  const clickY = (e.clientY - rect.top) / viewScale;
  const worldX = clickX + camera.x;
  const worldY = clickY + camera.y;

  const tileX = Math.floor(worldX / (tileSize * mapScale));
  const tileY = Math.floor(worldY / (tileSize * mapScale));
  console.log(`Clicked Tile: (${tileX}, ${tileY})`);

  // Check if clicked an interactive rock
  const clickedRock = interactiveRocks.find(r => r.x === tileX && r.y === tileY);
  if (clickedRock) {
    openRockPopup(clickedRock);
    console.log(`Opened popup for rock at (${clickedRock.x}, ${clickedRock.y})`);
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (intro.active || rockPopupState.active) {
    canvas.style.cursor = "default";
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const hoverX = (e.clientX - rect.left) / viewScale;
  const hoverY = (e.clientY - rect.top) / viewScale;
  const worldX = hoverX + camera.x;
  const worldY = hoverY + camera.y;

  const tileX = Math.floor(worldX / (tileSize * mapScale));
  const tileY = Math.floor(worldY / (tileSize * mapScale));

  const isOverRock = interactiveRocks.some(r => r.x === tileX && r.y === tileY);
  if (isOverRock) {
    canvas.style.cursor = "help"; // displays standard question mark cursor!
  } else {
    canvas.style.cursor = "default";
  }
});

window.addEventListener("keydown", (event) => {
  if (intro.active) {
    event.preventDefault();
    handleIntroKey(event);
    return;
  }

  if (activeDialog.active) {
    event.preventDefault();
    if (event.key === " " || event.key === "Enter") {
      advanceActiveDialog();
    }
    return;
  }

  if (controlKeys.has(event.key)) {
    event.preventDefault();

    if (event.key === " ") {
      interact();
    } else {
      keys.add(event.key.toLowerCase());
    }
  }
});

// Toggle debug overlay with F1
window.addEventListener("keydown", (event) => {
  if (event.key === "F1") {
    event.preventDefault();
    debugSpriteOverlay = !debugSpriteOverlay;
    console.log("Debug sprite overlay:", debugSpriteOverlay);
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function handleIntroKey(event) {
  if (intro.phase === "title") {
    intro.phase = "dialog";
    startAudio();
    playMusic("oak");
    return;
  }

  // Any key will advance the professor oak dialogs!
  if (intro.dialogIndex < intro.dialogs.length - 1) {
    intro.dialogIndex += 1;
    return;
  }

  finishIntro();
}

function finishIntro() {
  intro.active = false;
  keys.clear();
  updateAmbientMusic(true);
}

function startAudio() {
  audioStarted = true;
  Object.values(music).forEach((track) => {
    track.load();
  });
  footstepSounds.forEach((sound) => {
    sound.load();
  });
}

function createMusicTrack(src, volume) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = volume;
  return audio;
}

function createSoundEffect(src, volume) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = volume;
  return audio;
}

function updateAmbientMusic(force = false) {
  if (!audioStarted || intro.active) return;
  playMusic(getAmbientMusicName(), force);
}

function getAmbientMusicName() {
  if (scene.mode === "shipInterior") return "ship";
  if (isInCaveZone()) return "cave";
  return "route";
}

function isInCaveZone() {
  if (scene.mode !== "exterior" || player.riding) return false;
  const tile = getTileFromWorld(player.x, player.y);
  return tile.x >= 0 && tile.x <= 42 && tile.y >= 19 && tile.y <= 59;
}

function playMusic(name, force = false) {
  if (!audioStarted && name !== "oak") return;
  if (!force && currentMusic === name) return;

  Object.entries(music).forEach(([key, track]) => {
    if (key !== name) {
      track.pause();
    }
  });

  const track = music[name];
  if (!track) return;
  currentMusic = name;
  track.play().catch(() => {
    currentMusic = null;
  });
}

function updateShipFootsteps() {
  const frame = Math.floor(shipInterior.frame) % 4;
  const isStepFrame = frame === 0 || frame === 2;

  if (isStepFrame && frame !== lastShipStepFrame) {
    playFootstep();
    lastShipStepFrame = frame;
  } else if (!isStepFrame) {
    lastShipStepFrame = -1;
  }
}

function playFootstep() {
  if (!audioStarted || currentMusic !== "ship") return;
  const sound = footstepSounds[footstepIndex % footstepSounds.length];
  footstepIndex += 1;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

const teleporters = [
  // De la cueva a la sala (destino: 22, 46)
  { fromX: 60, fromY: 44, toX: 22, toY: 46 },
  // De la sala a la cueva (origen: puerta 22, 47, destino: justo al lado de la cueva, en 60, 45)
  { fromX: 22, fromY: 47, toX: 60, toY: 45 }
];

const noCollisionZones = [];

function checkTeleporters() {
  if (player.riding) return; // Only teleport when walking

  const currentTileX = Math.floor(player.x / (tileSize * mapScale));
  const currentTileY = Math.floor(player.y / (tileSize * mapScale));

  for (const t of teleporters) {
    if (currentTileX === t.fromX && currentTileY === t.fromY) {
      player.x = t.toX * tileSize * mapScale + (tileSize * mapScale) / 2;
      player.y = t.toY * tileSize * mapScale + (tileSize * mapScale) / 2;
      statusNode.textContent = "¡Te has teletransportado!";
      break;
    }
  }
}

function checkShipDoor() {
  const currentTile = getTileFromWorld(player.x, player.y);
  if (currentTile.x === shipDoor.tileX && currentTile.y === shipDoor.tileY) {
    enterShipInterior();
  }
}

function loop(now) {
  const delta = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;

  update(delta);
  draw();

  requestAnimationFrame(loop);
}

function update(delta) {
  if (rockPopupState.active) {
    return; // Block movement updates when popup is open
  }

  if (activeDialog.active) {
    return; // Block movement updates when dialogue is active
  }

  if (intro.active) {
    updateCamera(mapImage);
    statusNode.textContent = intro.phase === "title" ? "Inicio" : "Profesor Oak";
    return;
  }

  elapsed += delta;
  updateAmbientMusic();

  if (remolinoImage) {
    remolinoAnim.frame = (remolinoAnim.frame + delta * remolinoAnim.speed) % 16;
  }

  if (swimmerImages && swimmerImages.length > 0) {
    swimmerAnim.frame = (swimmerAnim.frame + delta * swimmerAnim.speed) % 3;
  }

  if (scene.mode === "shipInterior") {
    updateShipInterior(delta);
    return;
  }

  if (scene.mode === "underwater") {
    updateUnderwater(delta);
    return;
  }

  if (scene.mode === "credits") {
    updateCredits(delta);
    return;
  }

  const input = getMovementInput();
  player.moving = input.x !== 0 || input.y !== 0;

  if (player.moving) {
    if (Math.abs(input.x) > Math.abs(input.y)) {
      player.dir = input.x > 0 ? "right" : "left";
    } else {
      player.dir = input.y > 0 ? "down" : "up";
    }

    const normalizer = input.x && input.y ? Math.SQRT1_2 : 1;
    const speed = player.riding ? 178 : player.speed;
    const nextX = player.x + input.x * normalizer * speed * delta;
    const nextY = player.y + input.y * normalizer * speed * delta;

    // Check collision with Cave Boss to trigger dialogue immediately
    if (!player.riding) {
      const nextTile = getTileFromWorld(nextX, nextY);
      if (isCaveBossTile(nextTile)) {
        triggerCaveBossDialogue();
      }
    }

    movePlayer(nextX, nextY);
    player.frame = (player.frame + delta * 9) % 4;
  } else {
    player.frame = 0;
  }

  clampPlayer(mapImage);
  pushPlayerFromSwimmer();
  updateCamera(mapImage);
  updateStatus();
  checkTeleporters();
  checkShipDoor();
  checkWhirlpool();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  if (scene.mode === "shipInterior") {
    drawShipInterior();
    return;
  }

  if (scene.mode === "underwater") {
    drawUnderwater();
    return;
  }

  if (scene.mode === "credits") {
    drawCredits();
    return;
  }

  ctx.save();
  ctx.scale(viewScale, viewScale);
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
  drawMap(mapImage);
  drawWarship();
  drawShipDoor();
  drawCaveBoss();
  drawBlockerNpc();
  drawSwimmerNpc();
  drawGyarados();
  if (remolinoImage) {
    const worldTile = tileSize * mapScale;
    drawWhirlpool((101 + 0.5) * worldTile, (27 + 0.5) * worldTile, 2.5);
  }
  drawPlayer();
  ctx.restore();

  drawVignette();
  drawMountHelper();
  drawIntroOverlay();

  if (activeDialog.active) {
    const displayW = canvas.width / viewScale;
    const displayH = canvas.height / viewScale;
    ctx.save();
    ctx.scale(viewScale, viewScale);
    drawDialogBox(displayW, displayH, activeDialog.text);
    ctx.restore();
  }
}

function drawMap(mapImg) {
  ctx.drawImage(
    mapImg,
    0,
    0,
    mapImg.width,
    mapImg.height,
    0,
    0,
    mapImg.width * mapScale,
    mapImg.height * mapScale
  );
  drawAnimatedWater(mapImg);
}

function drawAnimatedWater(mapImg) {
  const worldW = mapImg.width * mapScale;
  const worldH = mapImg.height * mapScale;
  const layerCtx = waterLayer.getContext("2d");
  layerCtx.imageSmoothingEnabled = false;
  layerCtx.setTransform(1, 0, 0, 1, 0, 0);
  layerCtx.globalCompositeOperation = "source-over";
  layerCtx.globalAlpha = 1;
  layerCtx.clearRect(0, 0, worldW, worldH);

  drawWaterCurrent(layerCtx, worldW, worldH);

  layerCtx.globalCompositeOperation = "destination-in";
  layerCtx.drawImage(waterMask, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.95;
  ctx.drawImage(waterLayer, 0, 0);
  ctx.restore();
}

function drawWaterCurrent(layerCtx, worldW, worldH) {
  const drift = pingPong(elapsed * 28, 64);
  const shimmer = 0.55 + Math.sin(elapsed * 5) * 0.14;

  layerCtx.save();
  layerCtx.globalAlpha = 0.32;
  layerCtx.fillStyle = "#43c8ff";
  for (let y = -32; y < worldH + 64; y += 32) {
    const offset = (Math.floor(y / 32) % 2) * 32;
    for (let x = -96; x < worldW + 96; x += 64) {
      layerCtx.fillRect(Math.round(x + offset + drift), Math.round(y), 30, 6);
    }
  }
  layerCtx.restore();

  layerCtx.save();
  layerCtx.globalAlpha = shimmer;
  layerCtx.fillStyle = "#c8f7ff";
  for (let y = -48; y < worldH + 80; y += 48) {
    const offset = (Math.floor(y / 48) % 2) * 36;
    for (let x = -120; x < worldW + 120; x += 96) {
      layerCtx.fillRect(Math.round(x + offset - drift * 0.75), Math.round(y + 10), 42, 4);
    }
  }
  layerCtx.restore();

  layerCtx.save();
  layerCtx.globalAlpha = 0.22;
  layerCtx.fillStyle = "#1e76d2";
  const counterDrift = pingPong(elapsed * 18, 48);
  for (let y = -24; y < worldH + 72; y += 24) {
    for (let x = -72; x < worldW + 72; x += 48) {
      layerCtx.fillRect(Math.round(x - counterDrift), Math.round(y + 14), 22, 4);
    }
  }
  layerCtx.restore();
}

function drawPlayer() {
  if (player.riding) {
    drawRider(player);
  } else {
    drawWalker(player);
  }
}

function drawWarship() {
  if (!warshipImage) return;

  const worldTile = tileSize * mapScale;
  const dx = Math.round(warshipPlacement.tileX * worldTile);
  const dy = Math.round(warshipPlacement.tileY * worldTile);
  const drawW = Math.round(warshipPlacement.widthTiles * worldTile);
  const drawH = Math.round(drawW * (warshipImage.height / warshipImage.width));

  ctx.drawImage(warshipImage, dx, dy, drawW, drawH);
}

function drawShipDoor() {
  const worldTile = tileSize * mapScale;
  const cx = (shipDoor.tileX + 0.5) * worldTile;
  const cy = (shipDoor.tileY + 0.5) * worldTile;
  const pulse = 0.65 + Math.sin(elapsed * 5) * 0.25;
  const ring = 18 + Math.sin(elapsed * 4) * 3;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = `rgba(132, 232, 255, ${pulse})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, ring, 9, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = `rgba(198, 250, 255, ${0.42 + pulse * 0.25})`;
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 5 + Math.sin(elapsed * 7) * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#89f3ff";
  for (let i = 0; i < 3; i += 1) {
    const offset = (elapsed * 18 + i * 12) % 36;
    ctx.fillRect(Math.round(cx - 1), Math.round(cy + 10 - offset), 2, 8);
  }
  ctx.restore();
}

function drawCaveBoss() {
  if (!caveBossImage) return;

  const worldTile = tileSize * mapScale;
  const footX = Math.round((caveBoss.tileX + 0.5) * worldTile);
  const footY = Math.round((caveBoss.tileY + 1) * worldTile);
  const drawH = 58;
  const drawW = Math.round(drawH * (caveBossImage.width / caveBossImage.height));
  const dx = Math.round(footX - drawW / 2);
  const dy = Math.round(footY - drawH);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(caveBossImage, 0, 0, caveBossImage.width, caveBossImage.height, dx, dy, drawW, drawH);
  ctx.restore();
}

function drawSwimmerNpc() {
  if (!swimmerImages || swimmerImages.length < 3) return;
  const frameIndex = Math.floor(swimmerAnim.frame) % 3;
  const swimmerImg = swimmerImages[frameIndex];
  if (!swimmerImg) return;

  const worldTile = tileSize * mapScale;
  const footX = Math.round((88 + 0.5) * worldTile);
  const footY = Math.round((34 + 0.5) * worldTile);

  const drawH = 48; // a bit smaller for a swimming sprite
  const drawW = Math.round(drawH * (swimmerImg.width / swimmerImg.height));

  const dx = Math.round(footX - drawW / 2);
  const dy = Math.round(footY - drawH / 2); // Center vertically in water tile

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(swimmerImg, 0, 0, swimmerImg.width, swimmerImg.height, dx, dy, drawW, drawH);
  ctx.restore();
}

function triggerSwimmerDialogue() {
  if (activeDialog.active) return;
  keys.clear();
  activeDialog.active = true;
  activeDialog.text = "El nadador: 'La entrada está bloqueada hasta que hables con los demás NPC del Estrecho.'";
  statusNode.textContent = "Corrientes peligrosas";
}

function pushPlayerFromSwimmer() {
  if (hasRubberDuck) return; // If player has rubber duck, swimmer won't block them anymore!
  const playerTile = getTileFromWorld(player.x, player.y);
  // Swimmer visual range of vision from (88, 34) to (88, 40)
  if (playerTile.x === 88 && playerTile.y >= 34 && playerTile.y <= 40) {
    // Search left for the first available water tile to place the player in
    let targetX = 87;
    while (targetX > 0) {
      if (getTerrainAtTile(targetX, playerTile.y) === "water") {
        break;
      }
      targetX--;
    }

    const worldTile = tileSize * mapScale;
    player.x = (targetX + 0.5) * worldTile;
    player.dir = "left";
    
    // Clear rightward movement keys to prevent instant re-triggering
    keys.delete("arrowright");
    keys.delete("d");
    
    // Trigger swimmer conversation and push back
    triggerSwimmerDialogue();
  }
}

function drawIntroOverlay() {
  if (!intro.active) return;

  const displayW = canvas.width / viewScale;
  const displayH = canvas.height / viewScale;

  ctx.save();
  ctx.scale(viewScale, viewScale);

  if (intro.phase === "title") {
    drawIntroTitle(displayW, displayH);
    ctx.restore();
    return;
  }

  ctx.fillStyle = "#05070b";
  ctx.fillRect(0, 0, displayW, displayH);

  ctx.imageSmoothingEnabled = false;

  const slideImg = oakDialogImages[intro.dialogIndex];
  if (slideImg) {
    drawIntroImageCover(slideImg, 0, 0, displayW, displayH);
  }

  ctx.restore();
}

function sliceTextWordImages(img) {
  try {
    if (!img || !img.width || !img.height) {
      console.warn("sliceTextWordImages: Invalid image or image not fully loaded");
      return [];
    }
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(img, 0, 0);
    const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;

    const w = img.width;
    const h = img.height;

    // Scan columns. Background is GBA Peach (251, 175, 93)
    const isEmptyCol = new Array(w).fill(true);
    for (let x = 0; x < w; x++) {
      for (let y = 3; y < h - 3; y++) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx+1];
        const b = data[idx+2];
        // If a pixel is significantly different from the background peach color or is dark
        if (r < 200 || (Math.abs(r - 251) > 20 || Math.abs(g - 175) > 20 || Math.abs(b - 93) > 20)) {
          isEmptyCol[x] = false;
          break;
        }
      }
    }

    const words = [];
    let inWord = false;
    let wordStart = 0;
    let consecutiveEmpty = 0;

    for (let x = 0; x < w; x++) {
      const isEmpty = isEmptyCol[x];
      if (!isEmpty) {
        if (!inWord) {
          inWord = true;
          wordStart = x;
        }
        consecutiveEmpty = 0;
      } else {
        if (inWord) {
          consecutiveEmpty++;
          // A word gap in these generated texts is at least 35 pixels wide.
          if (consecutiveEmpty >= 35) {
            const wordEnd = x - consecutiveEmpty + 1;
            if (wordEnd - wordStart >= 2) {
              words.push({ sx: wordStart, sw: wordEnd - wordStart });
            }
            inWord = false;
            consecutiveEmpty = 0;
          }
        }
      }
    }
    if (inWord) {
      const wordEnd = w - consecutiveEmpty;
      if (wordEnd - wordStart >= 2) {
        words.push({ sx: wordStart, sw: wordEnd - wordStart });
      }
    }

    return words;
  } catch (e) {
    console.error("sliceTextWordImages failed due to canvas security/CORS restriction. Returning fallback.", e);
    // Return a fallback of length 1 to trigger the dynamic PokemonGB text rendering
    return img ? [{ sx: 0, sw: img.width }] : [];
  }
}

function drawDialogBoxImg(displayW, displayH, textImg, words) {
  const margin = Math.max(10, Math.round(Math.min(displayW, displayH) * 0.025));
  const boxH = Math.min(190, Math.max(124, displayH * 0.3));
  const x = margin;
  const y = displayH - boxH - margin;
  const w = displayW - margin * 2;
  const h = boxH;
  const border = Math.max(4, Math.round(Math.min(displayW, displayH) / 140));

  ctx.save();
  // GBA authentic peach background interior color!
  ctx.fillStyle = "#fbaf5d";
  ctx.strokeStyle = "#7fc4df";
  ctx.lineWidth = border;
  roundRect(ctx, x, y, w, h, 7);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#d6f0fb";
  ctx.lineWidth = Math.max(1, Math.floor(border / 2));
  roundRect(ctx, x + border, y + border, w - border * 2, h - border * 2, 4);
  ctx.stroke();

  const startX = x + 24;
  const startY = y + 22;
  const maxTextW = w - 48;
  const scale = 0.40; // slightly smaller GBA scale to ensure everything fits inside the balloon!
  const lineHeight = Math.round(textImg.height * scale) + 6;

  let curX = startX;
  let curY = startY;

  for (const word of words) {
    const wordW = word.sw * scale;
    if (curX + wordW > startX + maxTextW) {
      curX = startX;
      curY += lineHeight;
    }

    ctx.drawImage(textImg, word.sx, 0, word.sw, textImg.height, Math.round(curX), Math.round(curY), Math.round(wordW), Math.round(textImg.height * scale));
    curX += wordW + 28 * scale; // spacing between words (approx. 11px)
  }

  drawDialogCursor(x + w - 28, y + h - 22);
  ctx.restore();
}

function drawSpacebarHelper(displayW, displayH) {
  const w = 230;
  const h = 32;
  const x = displayW - w - 10;
  const y = 10;
  const border = 3;

  ctx.save();
  ctx.fillStyle = "#f8fbff";
  ctx.strokeStyle = "#7fc4df";
  ctx.lineWidth = border;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#d6f0fb";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x + border, y + border, w - border * 2, h - border * 2, 4);
  ctx.stroke();

  ctx.fillStyle = "#e94560";
  ctx.font = '6px "PokemonGB", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("[ ESPACIO ] PARA AVANZAR", x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function drawBlockerNpc() {
  // Disabled as per user request to remove NPC from starting island
  return;
}

function isBlockerNpcTile(tile) {
  // Disabled as per user request to remove NPC from starting island
  return false;
}

function isRestrictedTile(x, y) {
  return restrictedTiles.some(t => t.x === x && t.y === y);
}

function triggerBlockerDialogue() {
  if (activeDialog.active) return;
  activeDialog.active = true;
  activeDialog.text = "ALTO! El cientifico de OSINT te detiene: 'Esta zona esta restringida. No podras pasar hasta encontrar el modelo de clasificacion correcto.'";
  statusNode.textContent = "Camino bloqueado";
}

function drawWhirlpool(x, y, scale = 2) {
  if (!remolinoImage) return;
  const whirlpoolFrames = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1];
  const frameIndex = whirlpoolFrames[Math.floor(remolinoAnim.frame) % 16];
  const col = frameIndex % 3;
  const row = Math.floor(frameIndex / 3);
  const cellW = 48;
  const cellH = 48;
  const sx = col * cellW;
  const sy = row * cellH;
  const drawW = cellW * scale;
  const drawH = cellH * scale;
  const dx = Math.round(x - drawW / 2);
  const dy = Math.round(y - drawH / 2);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(remolinoImage, sx, sy, cellW, cellH, dx, dy, drawW, drawH);
  ctx.restore();
}

function drawIntroTitle(displayW, displayH) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, displayW, displayH);
  ctx.fillStyle = "rgba(240, 248, 255, 0.84)";
  ctx.font = '10px "PokemonGB", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("toca cualquier tecla para comenzar", displayW / 2, displayH / 2);
}

function drawIntroImageCover(image, x, y, width, height) {
  const imageRatio = image.width / image.height;
  const areaRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

  if (imageRatio > areaRatio) {
    sw = Math.round(image.height * areaRatio);
    sx = Math.round((image.width - sw) / 2);
  } else {
    sh = Math.round(image.width / areaRatio);
    sy = Math.round((image.height - sh) / 2);
  }

  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawDialogBox(displayW, displayH, text) {
  const margin = Math.max(10, Math.round(Math.min(displayW, displayH) * 0.025));
  const boxH = Math.min(190, Math.max(124, displayH * 0.3));
  const x = margin;
  const y = displayH - boxH - margin;
  const w = displayW - margin * 2;
  const h = boxH;
  const border = Math.max(4, Math.round(Math.min(displayW, displayH) / 140));
  const maxTextW = w - 52;
  const maxTextH = h - 46;
  let fontSize = clamp(Math.floor(displayW / 70), 8, 12);
  let lineHeight = Math.round(fontSize * 1.8);
  let lines = [];

  ctx.save();
  ctx.fillStyle = "#f8fbff";
  ctx.strokeStyle = "#7fc4df";
  ctx.lineWidth = border;
  roundRect(ctx, x, y, w, h, 7);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#d6f0fb";
  ctx.lineWidth = Math.max(1, Math.floor(border / 2));
  roundRect(ctx, x + border, y + border, w - border * 2, h - border * 2, 4);
  ctx.stroke();

  ctx.fillStyle = "#26313b";
  do {
    ctx.font = `${fontSize}px "PokemonGB", monospace`;
    lineHeight = Math.round(fontSize * 1.8);
    lines = getWrappedLines(ctx, text, maxTextW);
    if (lines.length * lineHeight <= maxTextH || fontSize <= 8) break;
    fontSize -= 1;
  } while (fontSize >= 8);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  lines.forEach((line, index) => {
    ctx.fillText(line, x + 20, y + 18 + index * lineHeight);
  });

  drawDialogCursor(x + w - 28, y + h - 22);
  ctx.restore();
}

function drawDialogCursor(x, y) {
  ctx.save();
  ctx.fillStyle = "#d92835";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 12, y);
  ctx.lineTo(x + 6, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function getWrappedLines(context, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function updateShipInterior(delta) {
  const input = getMovementInput();
  shipInterior.moving = input.x !== 0;

  if (shipInterior.moving) {
    shipInterior.dir = input.x > 0 ? "right" : "left";
    shipInterior.x += input.x * 185 * delta;
    shipInterior.frame = (shipInterior.frame + delta * 9) % 4;
    updateShipFootsteps();
  } else {
    shipInterior.frame = 0;
    lastShipStepFrame = -1;
  }

  const metrics = getShipInteriorMetrics();
  shipInterior.x = clamp(shipInterior.x, metrics.minX, metrics.maxX);
  shipInterior.cameraX = clamp(
    shipInterior.x - canvas.width * 0.45,
    0,
    Math.max(0, metrics.worldW - canvas.width)
  );

  // Check normalized position to trigger popups as player walks!
  const pct = (shipInterior.x - metrics.minX) / (metrics.npcX - metrics.minX);
  let activeIndex = -1;
  
  if (pct >= 0.15 && pct <= 0.30) activeIndex = 0;
  else if (pct >= 0.35 && pct <= 0.50) activeIndex = 1;
  else if (pct >= 0.55 && pct <= 0.70) activeIndex = 2;
  else if (pct >= 0.75 && pct <= 0.90) activeIndex = 3;

  if (activeIndex !== shipPopupState.index) {
    shipPopupState.index = activeIndex;
    if (activeIndex !== -1) {
      showShipPopup(activeIndex);
    } else {
      hideShipPopup();
    }
  }

  statusNode.textContent = isNearShipNpc() ? "Espacio: enfrentar jefe" : "Interior del buque";
}

function drawShipInterior() {
  const metrics = getShipInteriorMetrics();

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(
    shipInteriorImage,
    -Math.round(shipInterior.cameraX),
    metrics.offsetY,
    metrics.worldW,
    metrics.worldH
  );

  drawInteriorNpc(metrics);
  drawInteriorPlayer(metrics);

  ctx.fillStyle = "rgba(3, 6, 10, 0.35)";
  ctx.fillRect(0, 0, canvas.width, Math.max(0, metrics.lineY - 132));
  ctx.restore();

  // Draw GBA dialogue box on top of the ship interior!
  if (activeDialog.active) {
    ctx.save();
    drawDialogBox(canvas.width, canvas.height, activeDialog.text);
    ctx.restore();
  }
}

function drawInteriorPlayer(metrics) {
  // Use the exterior walker sprite for interior sideways movement
  const row = shipInterior.dir === "left" ? walkerSprite.rows.left : walkerSprite.rows.right;
  const col = shipInterior.moving ? Math.floor(shipInterior.frame) % 3 : 1;
  const sx = col * walkerSprite.cellW;
  const sy = row * walkerSprite.cellH;
  const sw = walkerSprite.cellW;
  const sh = walkerSprite.cellH;

  const screenX = Math.round(shipInterior.x - shipInterior.cameraX);
  // interior player scale multiplier (adjusted to match original design height)
  const interiorScaleMultiplier = 1.7;
  const drawW = Math.round(walkerSprite.drawW * metrics.scale * interiorScaleMultiplier);
  const drawH = Math.round(walkerSprite.drawH * metrics.scale * interiorScaleMultiplier);
  const dx = Math.round(screenX - drawW / 2);
  const dy = Math.round(metrics.lineY - drawH);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // Use left/right rows directly so sprite faces the movement direction
  ctx.drawImage(walkerSheet, sx, sy, sw, sh, dx, dy, drawW, drawH);
  ctx.restore();

  if (debugSpriteOverlay) {
    ctx.save();
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(dx, dy, drawW, drawH);
    ctx.strokeStyle = "#00ff00";
    ctx.beginPath(); ctx.moveTo(0, metrics.lineY); ctx.lineTo(canvas.width, metrics.lineY); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText(`lineY:${metrics.lineY}`, dx + 4, metrics.lineY - 6);
    ctx.fillText(`walker sx:${sx} sy:${sy} sw:${sw} sh:${sh}`, dx + 4, dy + 12);
    ctx.restore();
  }
}

function drawInteriorNpc(metrics) {
  if (!shipBossImage) return;

  const sx = 0;
  const sy = 0;
  const sw = shipBossImage.width;
  const sh = shipBossImage.height;
  const drawH = Math.round(98 * metrics.scale);
  const drawW = Math.round(drawH * (sw / sh));
  const dx = Math.round(metrics.npcX - shipInterior.cameraX - drawW / 2);
  const dy = Math.round(metrics.lineY - drawH);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(shipBossImage, sx, sy, sw, sh, dx, dy, drawW, drawH);
  ctx.restore();

  if (debugSpriteOverlay) {
    ctx.save();
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 2;
    ctx.strokeRect(dx, dy, drawW, drawH);
    ctx.strokeStyle = "#00ff00";
    ctx.beginPath(); ctx.moveTo(0, metrics.lineY); ctx.lineTo(canvas.width, metrics.lineY); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText(`npc sx:${sx} sy:${sy} sw:${sw} sh:${sh}`, dx + 2, dy + 12);
    ctx.restore();
  }
}

function getShipInteriorMetrics() {
  const scale = Math.max(canvas.height / shipInteriorImage.height, canvas.width / shipInteriorImage.width);
  const worldW = Math.round(shipInteriorImage.width * scale);
  const worldH = Math.round(shipInteriorImage.height * scale);
  const offsetY = Math.round((canvas.height - worldH) / 2);
  // Use empirically-detected ground ratio for this interior image and allow lowering
  // Increased slightly by default, but allow manual override from DevTools coords.
  const groundRatio = 0.82; // fraction down the source image where the floor is
  let lineY = Math.round(offsetY + worldH * groundRatio);

  // Pin the walking line to the visible floor in the source background.
  if (typeof manualInteriorLine !== 'undefined' && manualInteriorLine && manualInteriorLine.enabled) {
    lineY = Math.round(offsetY + manualInteriorLine.sourceY * scale);
  }
  const minX = 86;
  const maxX = Math.max(minX + 1, worldW - 112);
  const npcX = Math.max(minX + 120, worldW - 92);

  return { scale, worldW, worldH, offsetY, lineY, minX, maxX, npcX };
}

function drawGyarados() {
  if (!gyarados.visible) return;
  const dx = Math.round(gyarados.x - riderSprite.drawW / 2);
  const dy = Math.round(gyarados.y - riderSprite.drawH + 24);
  ctx.drawImage(gyaradosSheet, 0, 0, riderSprite.cellW, riderSprite.cellH, dx, dy, riderSprite.drawW, riderSprite.drawH);
}

function drawRider(entity) {
  const row = riderSprite.rows[entity.dir];
  const col = Math.floor(entity.frame);
  const sx = col * riderSprite.cellW;
  const sy = row * riderSprite.cellH;
  const dx = Math.round(entity.x - riderSprite.drawW / 2);
  const dy = Math.round(entity.y - riderSprite.drawH + 24);

  ctx.drawImage(riderSheet, sx, sy, riderSprite.cellW, riderSprite.cellH, dx, dy, riderSprite.drawW, riderSprite.drawH);
}

function drawWalker(entity) {
  const row = walkerSprite.rows[entity.dir];
  const col = entity.moving ? Math.floor(entity.frame) % 3 : 1;
  const sx = col * walkerSprite.cellW;
  const sy = row * walkerSprite.cellH;
  const dx = Math.round(entity.x - walkerSprite.drawW / 2);
  const dy = Math.round(entity.y - walkerSprite.drawH + 14);

  ctx.drawImage(walkerSheet, sx, sy, walkerSprite.cellW, walkerSprite.cellH, dx, dy, walkerSprite.drawW, walkerSprite.drawH);

  // Efecto de hierba alta cuando se camina sobre arbustos
  const tile = getTileFromWorld(entity.x, entity.y);
  const tileId = getTileIdAt(tile.x, tile.y);
  if (bushTiles.has(tileId)) {
    drawGrassOverlay(entity);
  }
}

function drawVignette() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "rgba(8, 18, 32, 0.18)");
  gradient.addColorStop(0.45, "rgba(8, 18, 32, 0)");
  gradient.addColorStop(1, "rgba(8, 18, 32, 0.22)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function getMovementInput() {
  let x = 0;
  let y = 0;

  if (keys.has("arrowleft") || keys.has("a")) x -= 1;
  if (keys.has("arrowright") || keys.has("d")) x += 1;
  if (keys.has("arrowup") || keys.has("w")) y -= 1;
  if (keys.has("arrowdown") || keys.has("s")) y += 1;

  return { x, y };
}

function movePlayer(nextX, nextY) {
  if (canOccupy(nextX, player.y, player.riding)) {
    player.x = nextX;
  }

  if (canOccupy(player.x, nextY, player.riding)) {
    player.y = nextY;
  }
}

function interact() {
  if (activeDialog.active) {
    advanceActiveDialog();
    return;
  }

  if (scene.mode === "shipInterior") {
    if (isNearShipNpc()) {
      triggerShipBossDialogue();
    } else {
      statusNode.textContent = "Sigue avanzando";
    }
    return;
  }

  if (isAtShipDoor()) {
    enterShipInterior();
    return;
  }

  if (player.riding) {
    tryDismount();
    return;
  }

  if (gyarados.visible && isFacingGyarados()) {
    player.riding = true;
    player.x = gyarados.x;
    player.y = gyarados.y;
    player.dir = gyarados.dir;
    gyarados.visible = false;
    statusNode.textContent = "Montaste a Gyarados";
  } else if (gyarados.visible && distance(player, gyarados) <= tileSize * mapScale * 2.2) {
    statusNode.textContent = "Ponte frente a Gyarados";
  }
}

function enterShipInterior() {
  shipInterior.returnRiding = player.riding;
  shipInterior.x = 96;
  shipInterior.dir = "right";
  shipInterior.frame = 0;
  shipInterior.moving = false;
  shipInterior.cameraX = 0;
  scene.mode = "shipInterior";
  keys.clear();
  playMusic("ship");
  statusNode.textContent = "Interior del buque";
}

function exitShipInterior() {
  const worldTile = tileSize * mapScale;
  player.x = Math.round((shipDoor.tileX + 0.5) * worldTile);
  player.y = Math.round((shipDoor.tileY + 1.5) * worldTile);
  player.dir = "down";
  player.riding = true;
  gyarados.visible = false;
  gyarados.x = player.x;
  gyarados.y = player.y;
  scene.mode = "exterior";
  hideShipPopup(); // Clear any remaining walking popup from screen!
  keys.clear();
  updateCamera(mapImage);
  updateAmbientMusic(true);
  statusNode.textContent = "Saliste del buque";
}

function isAtShipDoor() {
  const currentTile = getTileFromWorld(player.x, player.y);
  const front = getFrontTile();
  return (
    (currentTile.x === shipDoor.tileX && currentTile.y === shipDoor.tileY) ||
    (front.x === shipDoor.tileX && front.y === shipDoor.tileY)
  );
}

function isNearShipNpc() {
  if (scene.mode !== "shipInterior" || !shipInteriorImage) return false;
  const metrics = getShipInteriorMetrics();
  return Math.abs(shipInterior.x - metrics.npcX) <= 48;
}

function tryDismount() {
  const front = getFrontTile();
  const terrainType = getTerrainAtTile(front.x, front.y);

  if (terrainType === "land") {
    player.riding = false;
    player.x = Math.round((front.x + 0.5) * tileSize * mapScale);
    player.y = Math.round((front.y + 0.5) * tileSize * mapScale);
    gyarados.x = Math.round((front.fromX + 0.5) * tileSize * mapScale);
    gyarados.y = Math.round((front.fromY + 0.5) * tileSize * mapScale);
    gyarados.dir = player.dir;
    gyarados.visible = true;
    statusNode.textContent = "Bajaste a tierra";
  } else {
    statusNode.textContent = "Necesitas estar frente a tierra";
  }
}

function canOccupy(x, y, riding) {
  const halfW = riding ? 8 : 7;
  const halfH = riding ? 6 : 5;
  const points = [
    { x, y },
    { x: x - halfW, y },
    { x: x + halfW, y },
    { x: x - halfW, y: y + halfH },
    { x: x + halfW, y: y + halfH },
    { x, y: y + halfH },
  ];

  // NPC / restricted tile collision (walking only)
  if (!riding && points.some((point) => {
    const tile = getTileFromWorld(point.x, point.y);
    if (isCaveBossTile(tile) || isBlockerNpcTile(tile)) {
      return true;
    }
    if (isRestrictedTile(tile.x, tile.y)) {
      triggerBlockerDialogue();
      return true;
    }
    return false;
  })) {
    return false;
  }

  // Riding Gyarados: can only move on water tiles
  if (riding) {
    return points.every((point) => {
      const foot = getTileFromWorld(point.x, point.y);
      if (foot.x === shipDoor.tileX && foot.y === shipDoor.tileY) return true; // Allow entering portal tile when riding!
      if (isNoCollisionTile(foot.x, foot.y)) return true;
      return getTerrainAtTile(foot.x, foot.y) === "water";
    });
  }

  // Walking on foot: can only move on land tiles (rocks and water block)
  return points.every((point) => {
    const foot = getTileFromWorld(point.x, point.y);
    if (foot.x === shipDoor.tileX && foot.y === shipDoor.tileY) return true; // Allow entering portal tile when walking!
    if (isNoCollisionTile(foot.x, foot.y)) return true;
    return getTerrainAtTile(foot.x, foot.y) === "land";
  });
}

function isCaveBossTile(tile) {
  return tile.x === caveBoss.tileX && tile.y === caveBoss.tileY;
}

function getFrontTile() {
  const current = getTileFromWorld(player.x, player.y);
  const delta = directionDelta(player.dir);
  return {
    x: current.x + delta.x,
    y: current.y + delta.y,
    fromX: current.x,
    fromY: current.y,
  };
}

function getTileFromWorld(x, y) {
  return {
    x: Math.floor(x / (tileSize * mapScale)),
    y: Math.floor(y / (tileSize * mapScale)),
  };
}

function getTerrainAtTile(x, y) {
  if (!terrainGrid || y < 0 || x < 0 || y >= terrainGrid.length || x >= terrainGrid[0].length) {
    return "rock";
  }

  if (isNoCollisionTile(x, y)) {
    return "land";
  }

  return terrainGrid[y][x] || "water";
}

function isNoCollisionTile(x, y) {
  return noCollisionZones.some((zone) =>
    x >= zone.minX &&
    x <= zone.maxX &&
    y >= zone.minY &&
    y <= zone.maxY
  );
}

function getTileIdAt(x, y) {
  if (!tileIdGrid || y < 0 || x < 0 || y >= tileIdGrid.length || x >= tileIdGrid[0].length) {
    return "";
  }
  return tileIdGrid[y][x];
}

function buildTileIdGrid(mapData) {
  const grid = Array.from({ length: mapData.mapHeight }, () => Array.from({ length: mapData.mapWidth }, () => ""));

  mapData.layers.forEach((layer) => {
    layer.tiles.forEach((tile) => {
      grid[tile.y][tile.x] = String(tile.id);
    });
  });

  return grid;
}

function drawGrassOverlay(entity) {
  ctx.save();
  ctx.fillStyle = "#387830"; // Verde de hierba alta clásica de Pokémon RF/VH
  
  const animOffset = entity.moving ? Math.sin(elapsed * 18) * 2.5 : 0;
  
  const bx = entity.x;
  const by = entity.y + 14; // Alineado perfectamente con el nivel del suelo del sprite
  
  // Hojas de hierba del lado izquierdo
  ctx.beginPath();
  ctx.moveTo(bx - 12 + animOffset, by);
  ctx.lineTo(bx - 17 + animOffset, by - 14);
  ctx.lineTo(bx - 9 + animOffset, by);
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(bx - 6 - animOffset, by);
  ctx.lineTo(bx - 11 - animOffset, by - 16);
  ctx.lineTo(bx - 3 - animOffset, by);
  ctx.fill();

  // Hojas de hierba del lado derecho
  ctx.beginPath();
  ctx.moveTo(bx + 12 + animOffset, by);
  ctx.lineTo(bx + 17 + animOffset, by - 14);
  ctx.lineTo(bx + 9 + animOffset, by);
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(bx + 6 - animOffset, by);
  ctx.lineTo(bx + 11 - animOffset, by - 16);
  ctx.lineTo(bx + 3 - animOffset, by);
  ctx.fill();
  
  // Hojas interiores más claras para dar profundidad (efecto 3D premium)
  ctx.fillStyle = "#50a040";
  ctx.beginPath();
  ctx.moveTo(bx - 10 + animOffset, by);
  ctx.lineTo(bx - 13 + animOffset, by - 10);
  ctx.lineTo(bx - 7 + animOffset, by);
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(bx + 10 - animOffset, by);
  ctx.lineTo(bx + 13 - animOffset, by - 10);
  ctx.lineTo(bx + 7 - animOffset, by);
  ctx.fill();

  ctx.restore();
}

function directionDelta(dir) {
  if (dir === "up") return { x: 0, y: -1 };
  if (dir === "down") return { x: 0, y: 1 };
  if (dir === "left") return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function updateStatus() {
  if (player.riding) {
    statusNode.textContent = player.moving ? "Surfeando" : "Sobre Gyarados";
  } else if (gyarados.visible && isFacingGyarados()) {
    statusNode.textContent = "Espacio: montar";
  } else if (gyarados.visible && distance(player, gyarados) <= tileSize * mapScale * 2.2) {
    statusNode.textContent = "Mira hacia Gyarados";
  } else {
    statusNode.textContent = player.moving ? "Explorando" : "Listo";
  }
}

function isFacingGyarados() {
  const front = getFrontTile();
  const gyaradosTile = getTileFromWorld(gyarados.x, gyarados.y);
  return front.x === gyaradosTile.x && front.y === gyaradosTile.y;
}

function updateCamera(mapImg) {
  const worldW = mapImg.width * mapScale;
  const worldH = mapImg.height * mapScale;
  const displayW = canvas.width / viewScale;
  const displayH = canvas.height / viewScale;
  camera.x = clamp(player.x - displayW / 2, 0, Math.max(0, worldW - displayW));
  camera.y = clamp(player.y - displayH / 2, 0, Math.max(0, worldH - displayH));
}

function clampPlayer(mapImg) {
  const margin = 34;
  const worldW = mapImg.width * mapScale;
  const worldH = mapImg.height * mapScale;
  player.x = clamp(player.x, margin, worldW - margin);
  player.y = clamp(player.y, margin, worldH - margin);
}

function resizeCanvas() {
  const panel = canvas.parentElement;
  const rect = panel.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(380, Math.floor(rect.height));
  if (mapImage) {
    const worldW = mapImage.width * mapScale;
    const worldH = mapImage.height * mapScale;
    viewScale = Math.max(1, width / worldW, height / worldH) * 1.33; // 133% increased zoom for a closer, more comfortable viewport!
  }

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

function removePinkBackground(image) {
  const sheet = document.createElement("canvas");
  sheet.width = image.width;
  sheet.height = image.height;

  const sheetCtx = sheet.getContext("2d", { willReadFrequently: true });
  sheetCtx.imageSmoothingEnabled = false;
  sheetCtx.drawImage(image, 0, 0);

  const frame = sheetCtx.getImageData(0, 0, sheet.width, sheet.height);
  const data = frame.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (Math.abs(r - 255) < 12 && Math.abs(g - 166) < 16 && Math.abs(b - 204) < 16) {
      data[i + 3] = 0;
    }
  }

  sheetCtx.putImageData(frame, 0, 0);
  return sheet;
}

function createWaterMask(image) {
  const source = document.createElement("canvas");
  source.width = image.width;
  source.height = image.height;

  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);

  const pixels = sourceCtx.getImageData(0, 0, image.width, image.height);
  const data = pixels.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isWater = b > 105 && g > 70 && r < 105 && b > r + 35;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = isWater ? 255 : 0;
  }

  sourceCtx.putImageData(pixels, 0, 0);

  const mask = document.createElement("canvas");
  mask.width = image.width * mapScale;
  mask.height = image.height * mapScale;
  const maskCtx = mask.getContext("2d");
  maskCtx.imageSmoothingEnabled = false;
  maskCtx.drawImage(source, 0, 0, mask.width, mask.height);

  return mask;
}

function createWaterTexture(image) {
  const tile = document.createElement("canvas");
  tile.width = 64;
  tile.height = 64;
  const tileCtx = tile.getContext("2d");
  tileCtx.imageSmoothingEnabled = false;
  tileCtx.drawImage(image, 0, 0, 16, 16, 0, 0, 64, 64);

  tileCtx.globalAlpha = 0.28;
  tileCtx.fillStyle = "#bdf4ff";
  for (let y = -32; y < 80; y += 16) {
    tileCtx.fillRect(0, y, 64, 4);
  }

  return tile;
}

function renderTileMap(mapData, tilesetImg) {
  const mapCanvas = document.createElement("canvas");
  mapCanvas.width = mapData.mapWidth * mapData.tileSize;
  mapCanvas.height = mapData.mapHeight * mapData.tileSize;

  const mapCtx = mapCanvas.getContext("2d");
  mapCtx.imageSmoothingEnabled = false;

  mapData.layers.forEach((layer) => {
    layer.tiles.forEach((tile) => {
      const tileId = Number(tile.id);
      if (Number.isNaN(tileId)) return;

      const tilesPerRow = Math.floor(tilesetImg.width / mapData.tileSize);
      const sx = (tileId % tilesPerRow) * mapData.tileSize;
      const sy = Math.floor(tileId / tilesPerRow) * mapData.tileSize;
      const dx = tile.x * mapData.tileSize;
      const dy = tile.y * mapData.tileSize;

      mapCtx.drawImage(
        tilesetImg,
        sx,
        sy,
        mapData.tileSize,
        mapData.tileSize,
        dx,
        dy,
        mapData.tileSize,
        mapData.tileSize
      );
    });
  });

  return mapCanvas;
}

function placePlayerAtStart(mapData) {
  const island = getMainBottomIsland(mapData);
  const bottomY = Math.max(...island.map((tile) => tile.y));
  const bottomTiles = island.filter((tile) => tile.y === bottomY).sort((a, b) => a.x - b.x);
  const spawnTile = bottomTiles[Math.floor(bottomTiles.length / 2)] || findSpawnTile(mapData);
  player.x = Math.round((spawnTile.x + 0.5) * mapData.tileSize * mapScale);
  player.y = Math.round((spawnTile.y + 0.5) * mapData.tileSize * mapScale);
}

function placeGyarados(mapData) {
  const island = getMainBottomIsland(mapData);
  const topY = Math.min(...island.map((tile) => tile.y));
  const topTiles = island.filter((tile) => tile.y === topY).sort((a, b) => a.x - b.x);
  const middleTop = topTiles[Math.floor(topTiles.length / 2)] || getTileFromWorld(player.x, player.y);
  const preferred = { x: middleTop.x, y: middleTop.y - 1 };
  const chosen = getTerrainAtTile(preferred.x, preferred.y) === "water" ? preferred : findAdjacentWater(middleTop);

  gyarados.x = Math.round((chosen.x + 0.5) * mapData.tileSize * mapScale);
  gyarados.y = Math.round((chosen.y + 0.5) * mapData.tileSize * mapScale);
  gyarados.dir = "up";
  gyarados.visible = true;
}

function findAdjacentWater(tile) {
  const queue = [{ x: tile.x, y: tile.y }];
  const visited = new Set();
  visited.add(`${tile.x},${tile.y}`);
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (getTerrainAtTile(current.x, current.y) === "water") {
      return current;
    }
    
    const neighbors = [
      { x: current.x, y: current.y - 1 },
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y + 1 },
    ];
    
    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(n);
      }
    }
  }
  return tile;
}

function findSpawnTile(mapData) {
  const candidates = [];

  mapData.layers.forEach((layer) => {
    layer.tiles.forEach((tile) => {
      if (classifyTileId(tile.id) === "land") {
        candidates.push({ x: tile.x, y: tile.y });
      }
    });
  });

  if (!candidates.length) {
    return { x: Math.floor(mapData.mapWidth / 2), y: Math.floor(mapData.mapHeight / 2) };
  }

  candidates.sort((a, b) => b.y - a.y || Math.abs(a.x - mapData.mapWidth / 2) - Math.abs(b.x - mapData.mapWidth / 2));
  return candidates[0];
}

function buildTerrainGrid(mapData) {
  const grid = Array.from({ length: mapData.mapHeight }, () => Array.from({ length: mapData.mapWidth }, () => "water"));

  mapData.layers.forEach((layer) => {
    layer.tiles.forEach((tile) => {
      const type = classifyTileId(tile.id);
      if (type === "empty") return;
      grid[tile.y][tile.x] = type;
    });
  });

  return grid;
}

function getMainBottomIsland(mapData) {
  const visited = Array.from({ length: mapData.mapHeight }, () => Array.from({ length: mapData.mapWidth }, () => false));
  const components = [];

  for (let y = 0; y < mapData.mapHeight; y += 1) {
    for (let x = 0; x < mapData.mapWidth; x += 1) {
      if (visited[y][x] || getTerrainAtTile(x, y) !== "land") continue;

      const queue = [{ x, y }];
      const component = [];
      visited[y][x] = true;

      while (queue.length) {
        const current = queue.shift();
        component.push(current);

        [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 },
        ].forEach((next) => {
          if (
            next.x >= 0 &&
            next.y >= 0 &&
            next.x < mapData.mapWidth &&
            next.y < mapData.mapHeight &&
            !visited[next.y][next.x] &&
            getTerrainAtTile(next.x, next.y) === "land"
          ) {
            visited[next.y][next.x] = true;
            queue.push(next);
          }
        });
      }

      components.push(component);
    }
  }

  if (!components.length) {
    return [{ x: Math.floor(mapData.mapWidth / 2), y: Math.floor(mapData.mapHeight / 2) }];
  }

  // Filtrar islas muy pequeñas (decoraciones o errores) para evitar atrapar al jugador
  const validComponents = components.filter((c) => c.length >= 10);
  const targetComponents = validComponents.length ? validComponents : components;

  targetComponents.sort((a, b) => {
    const maxYA = Math.max(...a.map((tile) => tile.y));
    const maxYB = Math.max(...b.map((tile) => tile.y));
    return maxYB - maxYA || b.length - a.length;
  });

  return targetComponents[0];
}

function classifyTileId(id) {
  const key = String(id);
  if (terrain.rock.has(key)) return "rock";
  if (terrain.land.has(key)) return "land";
  if (terrain.water.has(key)) return "water";
  return "water";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// Safe image loader: resolves to `null` on error instead of rejecting.
function safeLoadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('safeLoadImage: failed to load', src);
      resolve(null);
    };
    img.src = src;
  });
}

function loadJSON(src) {
  return fetch(src).then((response) => {
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${src}`);
    }
    return response.json();
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function pingPong(value, length) {
  const cycle = length * 2;
  const position = value % cycle;
  return position <= length ? position : cycle - position;
}

function drawMountHelper() {
  if (intro.active || scene.mode !== "exterior" || activeDialog.active || rockPopupState.active) return;

  const displayW = canvas.width / viewScale;
  const displayH = canvas.height / viewScale;

  let text = "";
  if (player.riding) {
    text = "[ ESPACIO ] PARA BAJARSE";
  } else if (gyarados.visible && isFacingGyarados()) {
    text = "[ ESPACIO ] PARA SUBIRSE";
  }

  if (!text) return;

  const w = 180;
  const h = 24;
  const x = displayW - w - 10;
  const y = 10;
  const border = 2.5;

  ctx.save();
  ctx.scale(viewScale, viewScale);
  
  ctx.fillStyle = "#f8fbff";
  ctx.strokeStyle = "#7fc4df";
  ctx.lineWidth = border;
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#d6f0fb";
  ctx.lineWidth = 1;
  roundRect(ctx, x + border, y + border, w - border * 2, h - border * 2, 3);
  ctx.stroke();

  ctx.fillStyle = "#e94560";
  ctx.font = '5px "PokemonGB", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function openRockPopup(rock) {
  if (!rockPopupEl) return;
  rockPopupEl.classList.remove("ship-mode"); // Make sure non-blocking ship layout is disabled
  rockPopupState.active = true;
  rockPopupState.rock = rock;
  keys.clear();

  // Clear any previous dual container if exists
  const existingDual = rockPopupEl.querySelector(".rock-popup-dual-container");
  if (existingDual) existingDual.remove();

  if (rock.dualImages) {
    rockPopupImgEl.style.display = "none";
    // Create side-by-side elements dynamically!
    const dualContainer = document.createElement("div");
    dualContainer.className = "rock-popup-dual-container";
    
    rock.dualImages.forEach(src => {
      const img = document.createElement("img");
      img.src = src + "?v=" + Date.now();
      img.alt = "Gráfica doble";
      dualContainer.appendChild(img);
    });
    
    // Insert before text element
    rockPopupTextEl.parentNode.insertBefore(dualContainer, rockPopupTextEl);
  } else if (rock.imageKey) {
    let src = "";
    if (rock.imageKey === "nlpKeywords") src = "./assets/03_nlp_keywords.png";
    else if (rock.imageKey === "gdeltTone") src = "./assets/08_gdelt_tone.png";
    else if (rock.imageKey === "umapClusters") src = "./assets/09_umap_clusters.png";
    else if (rock.imageKey === "topicDistributions") src = "./assets/10_topic_distributions.png";

    if (src) {
      rockPopupImgEl.src = src + "?v=" + Date.now();
      rockPopupImgEl.style.display = "block";
    } else {
      rockPopupImgEl.style.display = "none";
    }
  } else {
    rockPopupImgEl.style.display = "none";
  }
  
  rockPopupTextEl.textContent = rock.text;
  
  if (rockPopupCloseEl) {
    rockPopupCloseEl.style.display = "flex"; // Make sure close button is visible
  }
  
  rockPopupEl.classList.add("active");
}

function closeRockPopup() {
  if (rockPopupEl) {
    rockPopupEl.classList.remove("active");
    const existingDual = rockPopupEl.querySelector(".rock-popup-dual-container");
    if (existingDual) existingDual.remove();
  }
  rockPopupState.active = false;
  rockPopupState.rock = null;
  keys.clear();
}

if (rockPopupCloseEl) {
  rockPopupCloseEl.addEventListener("click", closeRockPopup);
}

function showShipPopup(index) {
  if (!rockPopupEl) return;
  const p = shipPopups[index];
  
  // Set popup properties dynamically
  rockPopupImgEl.src = p.image + "?v=" + Date.now();
  rockPopupImgEl.style.display = "block";
  rockPopupTextEl.textContent = p.text;
  
  // Hide the close button since walking removes it!
  if (rockPopupCloseEl) {
    rockPopupCloseEl.style.display = "none";
  }
  
  rockPopupEl.classList.add("ship-mode");
  rockPopupEl.classList.add("active");
}

function hideShipPopup() {
  if (!rockPopupEl) return;
  rockPopupEl.classList.remove("active");
  rockPopupEl.classList.remove("ship-mode");
  
  // Restore the close button for the rocks popups
  if (rockPopupCloseEl) {
    rockPopupCloseEl.style.display = "flex";
  }
}

function triggerCaveBossDialogue() {
  if (activeDialog.active) return;
  keys.clear(); // Stop player movement immediately!
  caveBossDialog.active = true;
  caveBossDialog.step = 0;
  activeDialog.active = true;
  activeDialog.text = caveBossDialog.texts[0];
  statusNode.textContent = "Conversando con Científico";
}

function triggerShipBossDialogue() {
  if (activeDialog.active) return;
  keys.clear();
  shipBossDialog.active = true;
  shipBossDialog.step = 0;
  activeDialog.active = true;
  activeDialog.text = shipBossDialog.texts[0];
  statusNode.textContent = "Conversando con Capitán";
}

function advanceActiveDialog() {
  if (caveBossDialog.active) {
    if (caveBossDialog.step < caveBossDialog.texts.length - 1) {
      caveBossDialog.step++;
      activeDialog.text = caveBossDialog.texts[caveBossDialog.step];
    } else {
      activeDialog.active = false;
      caveBossDialog.active = false;
      keys.clear(); // Clear movement keys when dialogue completes to prevent immediate re-triggering!
    }
  } else if (shipBossDialog.active) {
    if (shipBossDialog.step < shipBossDialog.texts.length - 1) {
      shipBossDialog.step++;
      activeDialog.text = shipBossDialog.texts[shipBossDialog.step];
    } else {
      activeDialog.active = false;
      shipBossDialog.active = false;
      hasRubberDuck = true; // Unlock the whirlpool!
      statusNode.textContent = "Jefe neutralizado";
      exitShipInterior();
    }
  } else {
    activeDialog.active = false;
    keys.clear();
  }
}

function checkWhirlpool() {
  const worldTile = tileSize * mapScale;
  const targetX = (101 + 0.5) * worldTile;
  const targetY = (27 + 0.5) * worldTile;
  const dist = distance(player, { x: targetX, y: targetY });
  if (dist <= worldTile * 2.0) {
    if (hasRubberDuck) {
      enterUnderwaterScene();
    }
  }
}

function enterUnderwaterScene() {
  underwaterScene.x = 100;
  underwaterScene.dir = "right";
  underwaterScene.frame = 0;
  underwaterScene.moving = false;
  underwaterScene.cameraX = 0;
  scene.mode = "underwater";
  activeDialog.active = false;
  rockPopupState.active = false;
  hideShipPopup();
  closeRockPopup();
  keys.clear();
  
  // Initialize bubbles
  underwaterBubbles.length = 0;
  for (let i = 0; i < 45; i++) {
    underwaterBubbles.push({
      x: Math.random() * underwaterScene.worldW,
      y: Math.random() * canvas.height,
      r: 2 + Math.random() * 5,
      speed: 30 + Math.random() * 40,
      swaySpeed: 1 + Math.random() * 2,
      swayAmp: 4 + Math.random() * 8,
      seed: Math.random() * 100
    });
  }

  playMusic("underwater", true);
  statusNode.textContent = "Bajo el agua";
}

function updateUnderwater(delta) {
  if (activeDialog.active) {
    return; // Block movement when dialog is active (e.g. credits transition)
  }

  const input = getMovementInput();
  underwaterScene.moving = input.x !== 0;

  if (underwaterScene.moving) {
    underwaterScene.dir = input.x > 0 ? "right" : "left";
    underwaterScene.x += input.x * 210 * delta; // Gyarados moves majestically fast!
    underwaterScene.frame = (underwaterScene.frame + delta * 8) % 4;
  } else {
    underwaterScene.frame = 0;
  }

  // Bound the swimming path
  underwaterScene.x = clamp(underwaterScene.x, 100, underwaterScene.worldW - 100);
  
  // Set camera to center on player
  underwaterScene.cameraX = clamp(
    underwaterScene.x - canvas.width * 0.45,
    0,
    Math.max(0, underwaterScene.worldW - canvas.width)
  );

  // Update bubble particle positions
  underwaterBubbles.forEach(b => {
    b.y -= b.speed * delta;
    if (b.y < -20) {
      b.y = canvas.height + 20;
      b.x = Math.random() * underwaterScene.worldW;
    }
  });

  // Check normalized position to trigger popups as Gyarados swims!
  const pct = (underwaterScene.x - 100) / (underwaterScene.worldW - 200);
  let activeIndex = -1;
  
  if (pct >= 0.05 && pct <= 0.22) activeIndex = 0;
  else if (pct >= 0.28 && pct <= 0.45) activeIndex = 1;
  else if (pct >= 0.51 && pct <= 0.68) activeIndex = 2;
  else if (pct >= 0.74 && pct <= 0.91) activeIndex = 3;
  else if (pct >= 0.93) {
    enterCredits();
  }

  if (activeIndex !== underwaterPopupState.index) {
    underwaterPopupState.index = activeIndex;
    if (activeIndex !== -1) {
      showUnderwaterPopup(activeIndex);
    } else {
      hideShipPopup();
    }
  }

  statusNode.textContent = "Nadando en Gyarados - " + Math.round(pct * 100) + "%";
}

function showUnderwaterPopup(index) {
  if (!rockPopupEl) return;
  const p = underwaterPopups[index];
  
  // Set popup properties dynamically
  if (p.image) {
    rockPopupImgEl.src = p.image + "?v=" + Date.now();
    rockPopupImgEl.style.display = "block";
  } else {
    rockPopupImgEl.style.display = "none";
  }
  rockPopupTextEl.textContent = p.text;
  
  // Hide the close button since walking/swimming away removes it!
  if (rockPopupCloseEl) {
    rockPopupCloseEl.style.display = "none";
  }
  
  rockPopupEl.classList.add("ship-mode");
  rockPopupEl.classList.add("active");
}

function drawUnderwaterPlayer() {
  const row = underwaterScene.dir === "left" ? riderSprite.rows.left : riderSprite.rows.right;
  const col = Math.floor(underwaterScene.frame);
  const sx = col * riderSprite.cellW;
  const sy = row * riderSprite.cellH;
  const sw = riderSprite.cellW;
  const sh = riderSprite.cellH;

  const screenX = Math.round(underwaterScene.x - underwaterScene.cameraX);
  const screenY = Math.round(canvas.height * 0.65); // Majestically deep in water

  const drawW = Math.round(riderSprite.drawW * 1.4);
  const drawH = Math.round(riderSprite.drawH * 1.4);
  const dx = Math.round(screenX - drawW / 2);
  const dy = Math.round(screenY - drawH / 2);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(riderSheet, sx, sy, sw, sh, dx, dy, drawW, drawH);
  ctx.restore();
}

function drawUnderwater() {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Draw beautiful deep sea gradient
  const deepGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  deepGrad.addColorStop(0, "#071c35");
  deepGrad.addColorStop(0.5, "#040f21");
  deepGrad.addColorStop(1, "#020712");
  ctx.fillStyle = deepGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Parallax background - deep sea reefs or seaweed
  const cameraX = underwaterScene.cameraX;

  // Parallax layer 1 (very far, dark and slow)
  ctx.fillStyle = "rgba(4, 15, 32, 0.45)";
  for (let i = 0; i < 15; i++) {
    const rx = (i * 240) - (cameraX * 0.25) % 240;
    ctx.beginPath();
    ctx.moveTo(rx, canvas.height);
    ctx.lineTo(rx + 80, canvas.height - 180);
    ctx.lineTo(rx + 160, canvas.height);
    ctx.fill();
  }

  // Parallax layer 2 (middle depth, medium blue)
  ctx.fillStyle = "rgba(8, 25, 54, 0.6)";
  for (let i = 0; i < 20; i++) {
    const rx = (i * 180) - (cameraX * 0.5) % 180;
    ctx.beginPath();
    ctx.moveTo(rx, canvas.height);
    ctx.lineTo(rx + 60, canvas.height - 130);
    ctx.lineTo(rx + 120, canvas.height);
    ctx.fill();
  }

  // 3. Draw light rays filtering from surface
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const numRays = 6;
  for (let i = 0; i < numRays; i++) {
    const angle = -0.15 + Math.sin(elapsed * 0.8 + i) * 0.05;
    const rayX = (i * (canvas.width / (numRays - 1))) - (cameraX * 0.1) % canvas.width;
    const rayW = 120 + Math.sin(elapsed + i) * 30;

    const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + Math.tan(angle) * canvas.height, canvas.height);
    rayGrad.addColorStop(0, "rgba(80, 200, 255, 0.18)");
    rayGrad.addColorStop(0.5, "rgba(40, 150, 220, 0.07)");
    rayGrad.addColorStop(1, "rgba(10, 50, 120, 0)");

    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(rayX - rayW / 2, 0);
    ctx.lineTo(rayX + rayW / 2, 0);
    ctx.lineTo(rayX + Math.tan(angle) * canvas.height + rayW, canvas.height);
    ctx.lineTo(rayX + Math.tan(angle) * canvas.height - rayW, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 4. Draw bubbles particle system
  ctx.save();
  ctx.fillStyle = "rgba(130, 225, 255, 0.35)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 1;
  underwaterBubbles.forEach(b => {
    const sway = Math.sin(elapsed * b.swaySpeed + b.seed) * b.swayAmp;
    const bx = Math.round(b.x - cameraX + sway);
    const by = Math.round(b.y);

    if (bx > -20 && bx < canvas.width + 20) {
      ctx.beginPath();
      ctx.arc(bx, by, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  });
  ctx.restore();

  // 5. Draw Gyarados (with Brendan riding)
  drawUnderwaterPlayer();

  // 6. Draw foreground kelp layer
  ctx.fillStyle = "#020a17";
  for (let i = 0; i < 25; i++) {
    const rx = (i * 140) - cameraX % 140;
    const wave = Math.sin(elapsed * 1.5 + i) * 6;
    ctx.beginPath();
    ctx.moveTo(rx, canvas.height);
    ctx.quadraticCurveTo(rx + wave, canvas.height - 70, rx + wave * 1.5, canvas.height - 110);
    ctx.quadraticCurveTo(rx + wave, canvas.height - 70, rx + 16, canvas.height);
    ctx.closePath();
    ctx.fill();
  }

  // 7. Ambient vignette overlay
  const ambientGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 3, canvas.width / 2, canvas.height / 2, canvas.width * 0.8);
  ambientGrad.addColorStop(0, "rgba(0, 10, 30, 0)");
  ambientGrad.addColorStop(1, "rgba(1, 4, 12, 0.72)");
  ctx.fillStyle = ambientGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.restore();
}

function enterCredits() {
  scene.mode = "credits";
  keys.clear();
  hideShipPopup();
  playMusic("final", true);
  creditsState.active = true;
  creditsState.startTime = performance.now();
  statusNode.textContent = "🏆 Fin del Juego - Créditos";
}

function updateCredits(delta) {
  if (keys.has("enter")) {
    window.location.reload();
  }
}

function drawCredits() {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Draw beautiful deep sea gradient (same as underwater)
  const deepGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  deepGrad.addColorStop(0, "#071c35");
  deepGrad.addColorStop(0.5, "#040f21");
  deepGrad.addColorStop(1, "#020712");
  ctx.fillStyle = deepGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw light rays filtering from surface (same as underwater)
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const numRays = 6;
  for (let i = 0; i < numRays; i++) {
    const angle = -0.15 + Math.sin(elapsed * 0.8 + i) * 0.05;
    const rayX = (i * (canvas.width / (numRays - 1)));
    const rayW = 120 + Math.sin(elapsed + i) * 30;

    const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + Math.tan(angle) * canvas.height, canvas.height);
    rayGrad.addColorStop(0, "rgba(80, 200, 255, 0.18)");
    rayGrad.addColorStop(0.5, "rgba(40, 150, 220, 0.07)");
    rayGrad.addColorStop(1, "rgba(10, 50, 120, 0)");

    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(rayX - rayW / 2, 0);
    ctx.lineTo(rayX + rayW / 2, 0);
    ctx.lineTo(rayX + Math.tan(angle) * canvas.height + rayW, canvas.height);
    ctx.lineTo(rayX + Math.tan(angle) * canvas.height - rayW, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 3. Draw bubbles particle system (same as underwater)
  ctx.save();
  ctx.fillStyle = "rgba(130, 225, 255, 0.35)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 1;
  underwaterBubbles.forEach(b => {
    const sway = Math.sin(elapsed * b.swaySpeed + b.seed) * b.swayAmp;
    const bx = Math.round(b.x + sway) % canvas.width; // Wrap around screen width
    const by = Math.round(b.y);

    ctx.beginPath();
    ctx.arc(bx, by, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();

  // 4. Draw background kelp layer
  ctx.fillStyle = "#020a17";
  for (let i = 0; i < 25; i++) {
    const rx = (i * 140) % canvas.width;
    const wave = Math.sin(elapsed * 1.5 + i) * 6;
    ctx.beginPath();
    ctx.moveTo(rx, canvas.height);
    ctx.quadraticCurveTo(rx + wave, canvas.height - 70, rx + wave * 1.5, canvas.height - 110);
    ctx.quadraticCurveTo(rx + wave, canvas.height - 70, rx + 16, canvas.height);
    ctx.closePath();
    ctx.fill();
  }

  // 5. Draw credits text!
  const duration = (performance.now() - creditsState.startTime) / 1000;
  const rollSpeed = 34; // pixels per second
  const startY = canvas.height + 40;
  const currentY = startY - duration * rollSpeed;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let lastLineY = 0;
  creditsState.text.forEach((line, i) => {
    const lineY = currentY + i * 42;
    lastLineY = lineY;

    if (lineY > -40 && lineY < canvas.height + 40) {
      if (line === "PROYECTO FINAL") {
        ctx.fillStyle = "#ffcb05"; // Pokémon FRLG Yellow
        ctx.font = '16px "PokemonGB", monospace';
      } else if (line.startsWith("Pulsa")) {
        ctx.fillStyle = "#4af626"; // Shiny green
        ctx.font = '11px "PokemonGB", monospace';
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.font = '12px "PokemonGB", monospace';
      }
      ctx.fillText(line, canvas.width / 2, lineY);
    }
  });

  // Loop back credits if rolled out completely
  if (lastLineY < -40) {
    creditsState.startTime = performance.now();
  }

  // Ambient vignette overlay
  const ambientGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 3, canvas.width / 2, canvas.height / 2, canvas.width * 0.8);
  ambientGrad.addColorStop(0, "rgba(0, 10, 30, 0)");
  ambientGrad.addColorStop(1, "rgba(1, 4, 12, 0.72)");
  ctx.fillStyle = ambientGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.restore();
}
