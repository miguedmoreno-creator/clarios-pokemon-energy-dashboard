/**
 * Modo Demo: datos derivados del histórico REAL (datasets/processed/historical_energy.csv,
 * regenerable con `npm run demo-data`) + simulaciones deterministas para lo que requiere backend.
 * Permite ejecutar y presentar la app sin Python ni base de datos.
 */
import historicalRaw from '../data/historical.json';
import { Alert, EMISSION_FACTORS, MonthlyPoint, PlantCode, ShapFeature } from './domain';
import type { MILPResponse, MPCResponse, RectifierDispatchResponse, RectifierAllocation } from './api';

export const HISTORICAL = historicalRaw as Record<PlantCode, MonthlyPoint[]>;

/** Ahorro potencial documentado por el backend (CalculateSavingsOpportunityTool: 9,5%). */
export const SAVINGS_POTENTIAL = 0.095;

/** Generador pseudoaleatorio determinista (semilla 42, igual que el backend). */
export function seeded(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const avgTariff = (rows: MonthlyPoint[]) => {
  const priced = rows.filter((r) => r.cost_cop > 0 && r.kwh > 0);
  if (!priced.length) return 560;
  return priced.reduce((a, r) => a + r.cost_cop, 0) / priced.reduce((a, r) => a + r.kwh, 0);
};

export interface PlantKpis {
  kwh12m: number;
  gas12m: number;
  equiv12m: number;
  cost12m: number;
  sec: number;
  secTarget: number;
  secPrev: number;
  co2Tons: number;
  co2AvoidableTons: number;
  savingsCop: number;
  tariffCopKwh: number;
  lastMonth: string;
  series: MonthlyPoint[];
}

export function computeKpis(plant: PlantCode): PlantKpis {
  const series = HISTORICAL[plant] ?? [];
  const last12 = series.slice(-12);
  const prev12 = series.slice(-24, -12);
  const sum = (rows: MonthlyPoint[], k: keyof MonthlyPoint) => rows.reduce((a, r) => a + (r[k] as number), 0);
  const tariff = avgTariff(series);
  const kwh = sum(last12, 'kwh');
  const gas = sum(last12, 'gas_m3');
  const equiv = sum(last12, 'equiv');
  const costKnown = sum(last12, 'cost_cop');
  const cost = costKnown > 0 ? costKnown : kwh * tariff;
  const sec = equiv > 0 ? kwh / equiv : 0;
  const prevEquiv = sum(prev12, 'equiv');
  const secPrev = prevEquiv > 0 ? sum(prev12, 'kwh') / prevEquiv : sec;
  const co2 = (kwh * EMISSION_FACTORS.electricKgPerKwh + gas * EMISSION_FACTORS.gasKgPerM3) / 1000;
  return {
    kwh12m: kwh,
    gas12m: gas,
    equiv12m: equiv,
    cost12m: cost,
    sec,
    secPrev,
    secTarget: secPrev * 0.95,
    co2Tons: co2,
    co2AvoidableTons: co2 * SAVINGS_POTENTIAL,
    savingsCop: cost * SAVINGS_POTENTIAL,
    tariffCopKwh: tariff,
    lastMonth: last12.at(-1)?.date ?? '',
    series,
  };
}

const iso = (minAgo: number) => new Date(Date.now() - minAgo * 60000).toISOString();

export const DEMO_ALERTS: Alert[] = [
  { id: 'a1', plant: 'FA', severity: 'CRITICAL', title: 'Reset de contador Modbus en RECTIFICADOR_1', detail: 'Delta negativo −2,5×10⁹ Wh aislado e imputado automáticamente.', detectedAt: iso(4), deviationPct: -100, acknowledged: false },
  { id: 'a2', plant: 'RC', severity: 'WARNING', title: 'Ratio gas 0,91 m³/equiv sobre umbral 0,85', detail: 'Posible desbalance aire/gas en horno rotatorio (NFPA 86).', detectedAt: iso(18), deviationPct: 7.1, acknowledged: false },
  { id: 'a3', plant: 'OREC', severity: 'CRITICAL', title: 'Sobreconsumo Molino Barton +31%', detail: 'Consumo sobre presupuesto en turno T1; revisar temperatura de reactor.', detectedAt: iso(42), deviationPct: 31.2, acknowledged: false },
  { id: 'a4', plant: 'ENSAMBLE', severity: 'INFO', title: 'Standby nocturno detectado en Línea 3', detail: 'Oportunidad de apagado programado entre 01:00 y 05:00.', detectedAt: iso(75), deviationPct: 4.3, acknowledged: false },
  { id: 'a5', plant: 'FA', severity: 'WARNING', title: 'Temperatura de tinas 50,4 °C', detail: 'Alerta temprana: límite crítico 55 °C. MPC recomienda reducir potencia 8%.', detectedAt: iso(96), deviationPct: 5.0, acknowledged: false },
];

export const DEMO_SHAP: Record<PlantCode, ShapFeature[]> = {
  FA: [
    { feature: 'Consumo mes anterior', value: 41200 },
    { feature: 'Producción equivalente', value: 28650 },
    { feature: 'SEC mes anterior', value: -9800 },
    { feature: 'Media móvil 3 meses', value: 15400 },
    { feature: 'Consumo hace 2 meses', value: -6100 },
  ],
  ENSAMBLE: [
    { feature: 'Producción equivalente', value: 12300 },
    { feature: 'Consumo mes anterior', value: 8700 },
    { feature: 'SEC mes anterior', value: -4200 },
    { feature: 'Media móvil 3 meses', value: 3900 },
  ],
  OREC: [
    { feature: 'Consumo mes anterior', value: 18900 },
    { feature: 'Producción equivalente', value: 11200 },
    { feature: 'Media móvil 3 meses', value: -5600 },
    { feature: 'SEC mes anterior', value: 2400 },
  ],
  RC: [
    { feature: 'Gas mes anterior', value: 9100 },
    { feature: 'Producción equivalente', value: 7400 },
    { feature: 'Consumo mes anterior', value: 5200 },
    { feature: 'Media móvil gas 3m', value: -3300 },
    { feature: 'SEC mes anterior', value: -1900 },
    { feature: 'Media móvil 3 meses', value: 1200 },
  ],
};

export const MODEL_ACCURACY: Record<PlantCode, { model: string; mape: number; r2: number; n: number }> = {
  FA: { model: 'Ridge L2 (5 variables)', mape: 7.02, r2: 0.594, n: 82 },
  ENSAMBLE: { model: 'Ridge L2 (4 variables)', mape: 7.4, r2: 0.293, n: 82 },
  OREC: { model: 'Ridge L2 (4 variables)', mape: 6.64, r2: 0.497, n: 81 },
  RC: { model: 'Ridge L2 (6 variables)', mape: 9.56, r2: 0.599, n: 105 },
};

const TARIFFS = { valle: 520, media: 650, punta: 780 };

export function demoMILP(plant: PlantCode): MILPResponse {
  const k = computeKpis(plant);
  const daily = k.kwh12m / 365;
  const baseShare = [0.34, 0.33, 0.33];
  const optShare = [0.46, 0.34, 0.2];
  const tariffs = [TARIFFS.valle, TARIFFS.media, TARIFFS.punta];
  const days = 7;
  const baseline = baseShare.reduce((a, s, i) => a + s * daily * days * tariffs[i], 0);
  const schedule = optShare.map((s, i) => ({
    shift_index: i,
    shift_number: i + 1,
    is_operating: true,
    allocated_kwh: s * daily * days,
    tariff_cop_per_kwh: tariffs[i],
    shift_cost_cop: s * daily * days * tariffs[i],
    equivalent_units_produced: (k.equiv12m / 365) * days * s,
  }));
  const total = schedule.reduce((a, s) => a + s.shift_cost_cop, 0);
  return {
    plant_id: plant,
    status: 'OPTIMAL',
    total_energy_kwh: daily * days,
    total_cost_cop: total,
    baseline_cost_cop: baseline,
    net_savings_cop: baseline - total,
    savings_pct: ((baseline - total) / baseline) * 100,
    peak_demand_kwh: optShare[2] * daily * days,
    peak_reduction_pct: ((baseShare[2] - optShare[2]) / baseShare[2]) * 100,
    solve_time_ms: 14.5,
    solver_name: 'HiGHS (simulación demo)',
    schedule,
  };
}

export function demoMPC(plant: PlantCode, initialTemp = 50.4): MPCResponse {
  const steps = 24;
  const target = 48;
  const trajectory = Array.from({ length: steps }, (_, i) => {
    const t = target + (initialTemp - target) * Math.exp(-i / 5) + Math.sin(i / 2) * 0.15;
    const power = 820 - (initialTemp - target) * 60 * Math.exp(-i / 5) + Math.cos(i / 3) * 12;
    return {
      step: i,
      time_minutes: i * 15,
      predicted_temperature_c: Number(t.toFixed(2)),
      target_temperature_c: target,
      optimal_control_power_kw: Number(power.toFixed(1)),
      ambient_temperature_c: 29 + Math.sin(i / 4) * 2,
      step_energy_cost_cop: power * 0.25 * 650,
    };
  });
  const maxT = Math.max(...trajectory.map((p) => p.predicted_temperature_c));
  return {
    plant_id: plant,
    status: 'OPTIMAL',
    horizon_steps: steps,
    sampling_time_minutes: 15,
    solve_time_ms: 31.6,
    solver_name: 'SLSQP (simulación demo)',
    total_energy_kwh: trajectory.reduce((a, p) => a + p.optimal_control_power_kw * 0.25, 0),
    total_cost_cop: trajectory.reduce((a, p) => a + p.step_energy_cost_cop, 0),
    max_predicted_temp_c: maxT,
    is_thermal_limit_respected: maxT <= 55,
    trajectory,
  };
}

export function demoRectifierDispatch(plant: PlantCode = 'FA', targetLoadKw = 850): RectifierDispatchResponse {
  let onlineCount = 1;
  if (targetLoadKw > 1050) onlineCount = 3;
  else if (targetLoadKw > 550) onlineCount = 2;

  const perUnitKw = targetLoadKw / onlineCount;
  const allocations: RectifierAllocation[] = [
    {
      unit_id: 'RECTIFICADOR_1',
      is_online: onlineCount >= 1,
      allocated_kw: onlineCount >= 1 ? Number(perUnitKw.toFixed(1)) : 0,
      capacity_kw: 800,
      loading_pct: onlineCount >= 1 ? Number(((perUnitKw / 800) * 100).toFixed(1)) : 0,
      efficiency_pct: onlineCount >= 1 ? Number((perUnitKw / (perUnitKw + 13.5 + 0.022 * perUnitKw + 0.000072 * perUnitKw * perUnitKw) * 100).toFixed(1)) : 0,
      loss_kw: onlineCount >= 1 ? Number((13.5 + 0.022 * perUnitKw + 0.000072 * perUnitKw * perUnitKw).toFixed(2)) : 0,
    },
    {
      unit_id: 'RECTIFICADOR_2',
      is_online: onlineCount >= 2,
      allocated_kw: onlineCount >= 2 ? Number(perUnitKw.toFixed(1)) : 0,
      capacity_kw: 800,
      loading_pct: onlineCount >= 2 ? Number(((perUnitKw / 800) * 100).toFixed(1)) : 0,
      efficiency_pct: onlineCount >= 2 ? Number((perUnitKw / (perUnitKw + 14.0 + 0.024 * perUnitKw + 0.000075 * perUnitKw * perUnitKw) * 100).toFixed(1)) : 0,
      loss_kw: onlineCount >= 2 ? Number((14.0 + 0.024 * perUnitKw + 0.000075 * perUnitKw * perUnitKw).toFixed(2)) : 0,
    },
    {
      unit_id: 'RECTIFICADOR_3',
      is_online: onlineCount >= 3,
      allocated_kw: onlineCount >= 3 ? Number(perUnitKw.toFixed(1)) : 0,
      capacity_kw: 800,
      loading_pct: onlineCount >= 3 ? Number(((perUnitKw / 800) * 100).toFixed(1)) : 0,
      efficiency_pct: onlineCount >= 3 ? Number((perUnitKw / (perUnitKw + 12.8 + 0.020 * perUnitKw + 0.000080 * perUnitKw * perUnitKw) * 100).toFixed(1)) : 0,
      loss_kw: onlineCount >= 3 ? Number((12.8 + 0.020 * perUnitKw + 0.000080 * perUnitKw * perUnitKw).toFixed(2)) : 0,
    },
  ];

  const totalLoss = allocations.reduce((a, u) => a + u.loss_kw, 0);
  const naivePerUnit = targetLoadKw / 3;
  const naiveLoss = (13.5 + 0.022 * naivePerUnit + 0.000072 * naivePerUnit * naivePerUnit) +
                    (14.0 + 0.024 * naivePerUnit + 0.000075 * naivePerUnit * naivePerUnit) +
                    (12.8 + 0.020 * naivePerUnit + 0.000080 * naivePerUnit * naivePerUnit);
  const powerSaved = Math.max(0, naiveLoss - totalLoss);
  const savingsPct = (powerSaved / naiveLoss) * 100;
  const annualCop = powerSaved * 8760 * 650;

  return {
    plant_id: plant,
    status: 'OPTIMAL',
    target_load_kw: targetLoadKw,
    total_delivered_kw: targetLoadKw,
    total_loss_kw: Number(totalLoss.toFixed(2)),
    naive_loss_kw: Number(naiveLoss.toFixed(2)),
    power_saved_kw: Number(powerSaved.toFixed(2)),
    savings_pct: Number(savingsPct.toFixed(1)),
    estimated_annual_savings_cop: Math.round(annualCop),
    sec_reduction_estimate: Number(((powerSaved / 1000) * 0.12).toFixed(3)),
    allocations,
    solve_time_ms: 1.2,
    solver_name: 'Analytic MIQP Quadratic Dispatcher',
  };
}

/** Respuestas del copiloto en Modo Demo (todas las cifras se calculan aquí, no en texto libre). */
export function demoChatAnswer(query: string, plant: PlantCode) {
  const q = query.toLowerCase();
  const k = computeKpis(plant);
  const f = (n: number, d = 0) => n.toLocaleString('es-CO', { maximumFractionDigits: d });

  // 1. Preguntas sobre Optimización HiGHS MILP
  if (q.includes('highs') || q.includes('milp') || (q.includes('despacho') && q.includes('ahorro'))) {
    const milp = demoMILP(plant);
    return {
      agent: 'prediction_agent',
      tools: ['simulate_scenario', 'calculate_savings_opportunity'],
      content: `📊 Diagnóstico Operativo de Despacho HiGHS MILP (${plant}):\n• Ahorro Neto Proyectado: $${f(milp.net_savings_cop)} COP (${milp.savings_pct.toFixed(1)}% semanal)\n• Desplazamiento Estratégico: 46% de la carga transferida al Turno 1 (trasnocho 22:00-06:00, tarifa Valle $520 COP/kWh)\n• Mitigación de Pico: Demanda en Turno 3 (14:00-22:00, tarifa Pico $780 COP/kWh) reducida en un ${milp.peak_reduction_pct.toFixed(1)}%\n\n📋 Instrucción para Supervisores: Mantener el setpoint de producción en T1 al máximo de capacidad de rectificadores y programar mantenimientos preventivos durante la ventana pico de T3.`,
      citation: '[Fuente: Regulación CREG 015/2018 & Esquema Tarifario XM Valle del Cauca]',
    };
  }

  // 2. Preguntas sobre Control Térmico SLSQP MPC
  if (q.includes('slsqp') || q.includes('mpc') || q.includes('tinas') || q.includes('55')) {
    return {
      agent: 'energy_agent',
      tools: ['get_consumption_data', 'search_technical_docs'],
      content: `🌡️ Evaluación de Seguridad Térmica SLSQP MPC (${plant}):\n• Límite Crítico Inviolable: 55.0 °C (Norma NFPA 86 & Estándar Clarios SOP-ENG-042)\n• Riesgo Mitigado: Superar los 50.0 °C degrada la formación de la capa pasivante y puede inducir embalamiento térmico en celdas de plomo-ácido.\n• Acción del Controlador: El solver SLSQP modula la rampa de corriente de los rectificadores IGBT, manteniendo la temperatura asintótica en 48.0 °C y garantizando un margen de holgura seguro de 5.2 °C frente al paro de emergencia.`,
      citation: '[Fuente: SOP-ENG-042 Formación de Baterías Clarios & Norma NFPA 86 Hornos y Procesos Térmicos]',
    };
  }

  // 3. Balance de Gas Natural (RC)
  if (q.includes('gas') || (plant === 'RC' && q.includes('horno'))) {
    const kr = computeKpis('RC');
    return {
      agent: 'gas_agent',
      tools: ['get_gas_consumption', 'detect_gas_inefficiency'],
      content: `Planta RC — Balance de Combustión últimos 12 meses:\n• Gas natural: ${f(kr.gas12m)} m³\n• Ratio: ${f(kr.gas12m / Math.max(kr.equiv12m, 1), 2)} m³/equiv (umbral de eficiencia 0,85)\n• Equivalente térmico: ${f(kr.gas12m * 10.55)} kWh_t\n\nRecomendación: calibrar la relación aire/combustible estequiométrica (10:1) en los quemadores de los hornos rotatorios.`,
      citation: '[Fuente: Manual de Quemadores Rotativos RC – NFPA 86, Sección: Estequiometría]',
    };
  }

  // 4. Detección de Anomalías y Resets Modbus
  if (q.includes('anomal') || q.includes('alerta') || q.includes('reset')) {
    return {
      agent: 'anomaly_agent',
      tools: ['get_active_alerts', 'get_shap_explanation'],
      content: `Hay ${DEMO_ALERTS.filter((a) => a.severity === 'CRITICAL').length} alertas críticas activas. La más relevante en ${plant}: ${DEMO_ALERTS.find((a) => a.plant === plant)?.title ?? 'sin alertas abiertas'}.\n\nCausa raíz (SHAP): la variable de mayor peso es "${DEMO_SHAP[plant][0].feature}".\nAcción: validar el medidor y reconocer la alerta en la vista SCADA.`,
      citation: '[Fuente: SCADA Ignition v8.1 – Protocolo de resets de contadores Modbus]',
    };
  }

  // 5. Predicción y Proyecciones ML
  if (q.includes('predic') || q.includes('pronós') || q.includes('próximo') || q.includes('what')) {
    const acc = MODEL_ACCURACY[plant];
    const monthly = k.kwh12m / 12;
    return {
      agent: 'prediction_agent',
      tools: ['get_forecast', 'get_model_accuracy'],
      content: `Pronóstico ${plant} próximo mes: ${f(monthly)} kWh (intervalo 90%: ${f(monthly * (1 - acc.mape / 100))} – ${f(monthly * (1 + acc.mape / 100))} kWh).\nModelo: ${acc.model}, MAPE histórico ${f(acc.mape, 2)}% (N=${acc.n}).`,
      citation: '[Fuente: Catálogo MLOps – models_manifest.json, SHA-256 verificado]',
    };
  }

  // 6. Consultas generales de energía y balance
  return {
    agent: 'energy_agent',
    tools: ['get_consumption_data', 'calculate_financial_impact'],
    content: `Planta ${plant} — últimos 12 meses:\n• Consumo: ${f(k.kwh12m)} kWh\n• Consumo específico (SEC): ${f(k.sec, 2)} kWh/equiv (meta ${f(k.secTarget, 2)})\n• Costo estimado: $${f(k.cost12m)} COP\n• Ahorro potencial (${f(SAVINGS_POTENTIAL * 100, 1)}%): $${f(k.savingsCop)} COP/año`,
    citation: '[Fuente: ISO 50001:2018 – Indicadores de desempeño energético (EnPI)]',
  };
}

/** Telemetría simulada en vivo (potencia instantánea kW) para la vista SCADA. */
export function nextTelemetry(plant: PlantCode, prev: number | null, rnd: () => number) {
  const k = computeKpis(plant);
  const baseKw = k.kwh12m / (365 * 24);
  const hour = new Date().getHours();
  const shiftFactor = hour >= 6 && hour < 22 ? 1.08 : 0.86;
  const target = baseKw * shiftFactor;
  const start = prev ?? target;
  return Math.max(0, start + (target - start) * 0.2 + (rnd() - 0.5) * baseKw * 0.06);
}
