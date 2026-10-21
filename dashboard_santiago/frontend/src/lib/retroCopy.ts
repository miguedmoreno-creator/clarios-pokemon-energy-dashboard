/**
 * Copys y explicaciones para humanos del Dashboard Retro 16-bits
 * 100% amigable, intuitivo y sin palabras complejas o jerga técnica.
 */

export const TRAINER_GUIDES = {
  resumen: '¡Bienvenido! Aquí puedes ver cuánta luz gasta la fábrica y qué pasaría con tu dinero si aumentas o bajas la producción.',
  scada: 'Pantalla de vigilancia en directo: mira las máquinas trabajando segundo a segundo y atiende los avisos importantes.',
  optimizacion: 'El cerebro de ahorro: organiza los horarios de las máquinas para no pagar luz cara y cuida que nada se caliente de más.',
  copiloto: 'El Profesor Clarios: pregúntale lo que quieras sobre la fábrica y te responderá con datos reales y comprobados.',
  xai: 'El escáner Pokédex: descubre qué aparatos o procesos te están subiendo o bajando la cuenta de la luz.',
};

export interface RetroTooltipItem {
  title: string;
  text: string;
  technicalNote?: string;
}

export const RETRO_TOOLTIPS: Record<string, RetroTooltipItem> = {
  kwh12m: {
    title: 'Luz Total Gastada en el Año',
    text: 'Es como el medidor de tu casa, pero sumando toda la electricidad que consumieron todas las máquinas durante los últimos 12 meses.',
  },
  sec: {
    title: 'Barra de Vida (Salud de la Fábrica)',
    text: 'Mide cuánta energía cuesta armar cada batería. Si la barra está verde, gastamos poca luz por batería (¡excelente!). Si se pone amarilla o roja, estamos desperdiciando energía y debemos corregirlo.',
  },
  costo: {
    title: 'Recibo de la Luz Estimado',
    text: 'La cuenta total que hay que pagar en pesos colombianos por toda la energía que se utilizó en el año.',
  },
  ahorro: {
    title: 'Plata que Podemos Ahorrar',
    text: 'El dinero que la fábrica se puede ahorrar en el año apagando máquinas que no se usan o pasándolas a horarios más económicos.',
  },
  scadaWal: {
    title: 'Escudo Anti-Apagones',
    text: 'Si se va la luz o el internet, el sistema no pierde ningún dato. Guarda todo en una memoria especial y se recupera solo apenas vuelva la conexión.',
  },
  shifts: {
    title: 'Horarios de Trabajo',
    text: 'La fábrica trabaja en 3 turnos (mañana, tarde y noche). Por la noche la electricidad suele ser más barata que de día.',
  },
  milp: {
    title: 'El Organizador de Horarios',
    text: 'Es un asistente inteligente que revisa a qué horas del día la luz es más barata y programa las máquinas pesadas para que trabajen en esas horas, ahorrando dinero sin atrasar los pedidos.',
  },
  mpc: {
    title: 'Termostato Protector',
    text: 'Como el termostato de un calentador o nevera: cuida que las piscinas donde se cargan las baterías nunca pasen de 55°C para que no se dañen ni haya accidentes.',
  },
  shap: {
    title: 'Escáner Pokédex: ¿Por qué sube el recibo?',
    text: 'Te dice el motivo exacto del costo: las barras rojas muestran las cosas que hicieron subir el recibo de la luz, y las barras verdes las que te ayudaron a ahorrar dinero.',
  },
    rectifiers: {
    title: 'El Repartidor Inteligente de Motores',
    text: 'En lugar de prender todas las máquinas a media marcha gastando luz de más, calcula exactamente cuántas prender y a qué porcentaje para entregar la potencia con el menor desperdicio de energía.',
  },
  accuracy: {
    title: 'Ficha de Confianza',
    text: 'Demuestra que los cálculos de la inteligencia artificial son confiables: el sistema acierta en más del 93% de sus pronósticos y nadie puede alterar las fórmulas en secreto.',
  },
};
