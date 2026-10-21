/** Tipos y constantes de dominio compartidos por el frontend. */

export type PlantCode = 'FA' | 'ENSAMBLE' | 'OREC' | 'RC';
export type ViewId = 'resumen' | 'scada' | 'optimizacion' | 'copiloto' | 'xai';
export type DataMode = 'LIVE' | 'DEMO' | 'CHECKING';
export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface PlantInfo {
  code: PlantCode;
  name: string;
  description: string;
  color: string;
  usesGas: boolean;
}

export const PLANTS: PlantInfo[] = [
  { code: 'FA', name: 'Formación & Acabado', description: 'Rectificadores de formación electroquímica', color: '#22d3ee', usesGas: false },
  { code: 'ENSAMBLE', name: 'Ensamble', description: 'Líneas de ensamble de baterías', color: '#a78bfa', usesGas: false },
  { code: 'OREC', name: 'Óxido (OREC)', description: 'Molino Barton y producción de óxido de plomo', color: '#fbbf24', usesGas: false },
  { code: 'RC', name: 'Reciclaje (RC)', description: 'Hornos rotatorios a gas natural', color: '#34d399', usesGas: true },
];

export const plantByCode = (c: PlantCode): PlantInfo => PLANTS.find((p) => p.code === c)!;

/** Factores de emisión (supuestos documentados para la demo). */
export const EMISSION_FACTORS = {
  /** kgCO2 por kWh — factor de emisión del SIN Colombia (UPME, orden de magnitud). */
  electricKgPerKwh: 0.126,
  /** kgCO2 por m3 de gas natural (IPCC). */
  gasKgPerM3: 1.98,
};

export interface MonthlyPoint {
  date: string;
  kwh: number;
  gas_m3: number;
  equiv: number;
  cost_cop: number;
}

export interface Alert {
  id: string;
  plant: PlantCode;
  severity: Severity;
  title: string;
  detail: string;
  detectedAt: string;
  deviationPct: number;
  acknowledged: boolean;
}

export interface ShapFeature {
  feature: string;
  value: number;
}

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  agent?: string;
  tools?: string[];
  citation?: string;
  mode?: DataMode;
}
