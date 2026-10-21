import { ViewId } from '../../lib/domain';

export interface TutorialStep {
  id: string;
  section: ViewId;
  targetSelector: string;
  title: string;
  badgeText: string;
  explanation: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  // -------------------------------------------------------------
  // SECCIÓN 1: RESUMEN GENERAL
  // -------------------------------------------------------------
  {
    id: 'resumen-kpis',
    section: 'resumen',
    targetSelector: '[data-tour="kpi-grid"]',
    title: 'Las 4 Medallas de la Fábrica',
    badgeText: 'Paso 1 de 4 · Resumen',
    explanation:
      'Aquí tienes los 4 números clave: la luz total gastada en el año, la salud energética de cada batería (SEC), el costo en pesos y cuánto dinero podemos ahorrar.',
  },
  {
    id: 'resumen-topology',
    section: 'resumen',
    targetSelector: '[data-tour="plant-topology"]',
    title: 'Mapa de las Instalaciones',
    badgeText: 'Paso 2 de 4 · Resumen',
    explanation:
      'Muestra las 4 plantas principales de Clarios (Formación, Ensamble, OREC y Rejillas). Puedes pulsar cualquier planta para ver sus medidores y estado.',
  },
  {
    id: 'resumen-chart',
    section: 'resumen',
    targetSelector: '[data-tour="monthly-chart"]',
    title: 'Curva de Carga y Simulación What-If',
    badgeText: 'Paso 3 de 4 · Resumen',
    explanation:
      'Muestra el consumo de energía a lo largo del año en bloques de terreno de 16-bits para identificar horas de mayor y menor gasto. La curva reacciona en tiempo real si mueves el simulador de producción.',
  },
  {
    id: 'resumen-whatif',
    section: 'resumen',
    targetSelector: '[data-tour="whatif-card"]',
    title: 'Calculadora de Futuro (What-If)',
    badgeText: 'Paso 4 de 4 · Resumen',
    explanation:
      'Mueve la barrita de producción para simular qué pasaría con la factura de luz y las emisiones si aumentamos o reducimos las baterías fabricadas.',
  },

  // -------------------------------------------------------------
  // SECCIÓN 2: VIGILANCIA SCADA EN VIVO
  // -------------------------------------------------------------
  {
    id: 'scada-telemetry',
    section: 'scada',
    targetSelector: '[data-tour="scada-telemetry"]',
    title: 'Latido Eléctrico en Vivo',
    badgeText: 'Paso 1 de 3 · SCADA',
    explanation:
      'Vigilancia minuto a minuto de la potencia en kilovatios (kW) que están jalando los circuitos y rectificadores en este preciso instante.',
  },
  {
    id: 'scada-wal',
    section: 'scada',
    targetSelector: '[data-tour="scada-wal"]',
    title: 'Escudo Anti-Apagones',
    badgeText: 'Paso 2 de 3 · SCADA',
    explanation:
      'Si se corta la luz o el internet en la fábrica, ningún dato del medidor se pierde. Se guarda en una memoria blindada (WAL) y se sincroniza automáticamente al reconectar.',
  },
  {
    id: 'scada-alerts',
    section: 'scada',
    targetSelector: '[data-tour="scada-alerts"]',
    title: 'Radar de Avisos y Alarmas',
    badgeText: 'Paso 3 de 3 · SCADA',
    explanation:
      'Te avisa al instante si alguna máquina tiene un consumo anormal o si un sensor se reinició. Los operadores pueden consultar la causa raíz con IA o pulsar "Reconocer" para confirmar la revisión.',
  },

  // -------------------------------------------------------------
  // SECCIÓN 3: GIMNASIO DE OPTIMIZACIÓN
  // -------------------------------------------------------------
  {
    id: 'opt-milp',
    section: 'optimizacion',
    targetSelector: '[data-tour="opt-milp"]',
    title: 'El Organizador de Horarios (HiGHS)',
    badgeText: 'Paso 1 de 3 · Optimización',
    explanation:
      'Revisa las tarifas de la energía en Colombia y programa las máquinas pesadas en la noche ($520 COP/kWh) en vez de las horas caras ($780 COP/kWh), ahorrando millones sin atrasar pedidos.',
  },
  {
    id: 'opt-mpc',
    section: 'optimizacion',
    targetSelector: '[data-tour="opt-mpc"]',
    title: 'El Termostato Protector (SLSQP)',
    badgeText: 'Paso 2 de 3 · Optimización',
    explanation:
      'Regula el calentamiento en las tinas de formación para que nunca superen el límite seguro de 55°C, protegiendo las baterías y reduciendo el gasto de ventilación.',
  },
  {
    id: 'opt-rect',
    section: 'optimizacion',
    targetSelector: '[data-tour="opt-rect"]',
    title: 'El Repartidor Inteligente de Motores',
    badgeText: 'Paso 3 de 3 · Optimización',
    explanation:
      'En lugar de prender todas las máquinas a media marcha gastando luz en vacío, calcula exactamente cuántas prender y a qué carga para trabajar en su punto de máxima eficiencia.',
  },

  // -------------------------------------------------------------
  // SECCIÓN 4: COPILOTO IA
  // -------------------------------------------------------------
  {
    id: 'copilot-agents',
    section: 'copiloto',
    targetSelector: '[data-tour="copilot-agents"]',
    title: 'Tu Equipo de 4 Especialistas',
    badgeText: 'Paso 1 de 2 · Copiloto IA',
    explanation:
      'Tienes 4 asistentes expertos a tu disposición: el Supervisor (coordina), el Experto en Luz, el Experto en Gas y el Analista de Alarmas.',
  },
  {
    id: 'copilot-chat',
    section: 'copiloto',
    targetSelector: '[data-tour="copilot-chat"]',
    title: 'Chat con Citas y Datos Reales',
    badgeText: 'Paso 2 de 2 · Copiloto IA',
    explanation:
      'Pregúntale en español cualquier duda sobre la energía de la planta. Te responderá con números calculados matemáticamente y citas a manuales oficiales.',
  },

  // -------------------------------------------------------------
  // SECCIÓN 5: ESCÁNER XAI (SHAP)
  // -------------------------------------------------------------
  {
    id: 'xai-bars',
    section: 'xai',
    targetSelector: '[data-tour="xai-bars"]',
    title: 'Escáner Pokédex: ¿Por qué sube el recibo?',
    badgeText: 'Paso 1 de 2 · XAI (SHAP)',
    explanation:
      'Las barras rojas señalan los factores que hicieron subir el recibo de la luz este mes, y las verdes las variables que te ayudaron a ahorrar.',
  },
  {
    id: 'xai-cert',
    section: 'xai',
    targetSelector: '[data-tour="xai-cert"]',
    title: 'Ficha de Confianza y Sello de Garantía',
    badgeText: 'Paso 2 de 2 · XAI (SHAP)',
    explanation:
      'Demuestra con números auditables que la inteligencia artificial acierta en más del 93% de sus pronósticos y que nadie puede alterar las fórmulas en secreto.',
  },
];

export function getStepsForSection(section: ViewId): TutorialStep[] {
  return TUTORIAL_STEPS.filter((s) => s.section === section);
}
