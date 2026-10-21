/**
 * Cliente del backend FastAPI con fallback automático a Modo Demo.
 * Si el backend no responde en `TIMEOUT_MS`, cada función devuelve datos demo
 * y marca `mode: 'DEMO'` para que la UI lo muestre con transparencia.
 */
import { Alert, DataMode, PlantCode, Severity } from './domain';
import { DEMO_ALERTS, demoChatAnswer, demoMILP, demoMPC, demoRectifierDispatch } from './demo';

export const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
const TIMEOUT_MS = 2500;

export interface MILPResponse {
  plant_id: string;
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'ERROR';
  total_energy_kwh: number;
  total_cost_cop: number;
  baseline_cost_cop: number;
  net_savings_cop: number;
  savings_pct: number;
  peak_demand_kwh: number;
  peak_reduction_pct: number;
  solve_time_ms: number;
  solver_name: string;
  schedule: Array<{
    shift_index: number;
    shift_number: number;
    is_operating: boolean;
    allocated_kwh: number;
    tariff_cop_per_kwh: number;
    shift_cost_cop: number;
    equivalent_units_produced: number;
  }>;
}

export interface MPCResponse {
  plant_id: string;
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'ERROR';
  horizon_steps: number;
  sampling_time_minutes: number;
  solve_time_ms: number;
  solver_name: string;
  total_energy_kwh: number;
  total_cost_cop: number;
  max_predicted_temp_c: number;
  is_thermal_limit_respected: boolean;
  trajectory: Array<{
    step: number;
    time_minutes: number;
    predicted_temperature_c: number;
    target_temperature_c: number;
    optimal_control_power_kw: number;
    ambient_temperature_c: number;
    step_energy_cost_cop: number;
  }>;
}

export interface RectifierAllocation {
  unit_id: string;
  is_online: boolean;
  allocated_kw: number;
  capacity_kw: number;
  loading_pct: number;
  efficiency_pct: number;
  loss_kw: number;
}

export interface RectifierDispatchResponse {
  plant_id: string;
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'ERROR';
  target_load_kw: number;
  total_delivered_kw: number;
  total_loss_kw: number;
  naive_loss_kw: number;
  power_saved_kw: number;
  savings_pct: number;
  estimated_annual_savings_cop: number;
  sec_reduction_estimate: number;
  allocations: RectifierAllocation[];
  solve_time_ms: number;
  solver_name: string;
}

export interface WithMode<T> { data: T; mode: DataMode }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function withFallback<T>(live: () => Promise<T>, demo: () => T): Promise<WithMode<T>> {
  try {
    return { data: await live(), mode: 'LIVE' };
  } catch {
    return { data: demo(), mode: 'DEMO' };
  }
}

export async function checkBackend(): Promise<DataMode> {
  try {
    await request('/livez');
    return 'LIVE';
  } catch {
    return 'DEMO';
  }
}

export const runLoadShifting = (plant: PlantCode) =>
  withFallback(
    () => request<MILPResponse>('/v1/optimization/load-shifting', {
      method: 'POST',
      body: JSON.stringify({ plant_id: plant, horizon_days: 7, peak_tariff_cop: 780, mid_tariff_cop: 650, off_peak_tariff_cop: 520 }),
    }),
    () => demoMILP(plant),
  );

export const runMPC = (plant: PlantCode, initialTemp: number) =>
  withFallback(
    () => request<MPCResponse>('/v1/optimization/mpc-thermal', {
      method: 'POST',
      body: JSON.stringify({ plant_id: plant, initial_temperature_c: initialTemp, target_temperature_c: 48, horizon_steps: 24 }),
    }),
    () => demoMPC(plant, initialTemp),
  );

export const runRectifierDispatch = (plant: PlantCode, targetLoadKw: number = 850) =>
  withFallback(
    () => request<RectifierDispatchResponse>('/v1/optimization/rectifier-dispatch', {
      method: 'POST',
      body: JSON.stringify({ plant_id: plant, target_load_kw: targetLoadKw }),
    }),
    () => demoRectifierDispatch(plant, targetLoadKw),
  );

interface BackendAlert {
  id: string; plant_id: string; detected_at: string; severity: string;
  deviation_percentage: number; agent_analysis?: string | null; is_acknowledged: boolean;
}

export const fetchAlerts = () =>
  withFallback<Alert[]>(
    async () => {
      const rows = await request<BackendAlert[]>('/v1/alerts');
      if (!rows.length) throw new Error('sin alertas');
      return rows.map((a) => ({
        id: a.id,
        plant: a.plant_id as PlantCode,
        severity: (a.severity as Severity) ?? 'INFO',
        title: `Desviación ${a.deviation_percentage.toFixed(1)}% en ${a.plant_id}`,
        detail: a.agent_analysis ?? 'Sin análisis del agente.',
        detectedAt: a.detected_at,
        deviationPct: a.deviation_percentage,
        acknowledged: a.is_acknowledged,
      }));
    },
    () => DEMO_ALERTS.map((a) => ({ ...a })),
  );

export async function acknowledgeAlert(id: string): Promise<void> {
  try {
    await request(`/v1/alerts/${id}/acknowledge`, { method: 'POST' });
  } catch {
    /* En modo demo el reconocimiento es solo local. */
  }
}

export interface ChatEvents {
  onAgent: (agent: string) => void;
  onToken: (chunk: string) => void;
  onTool: (tool: string) => void;
  onDone: (final: { content: string; agent: string; mode: DataMode; citation?: string; tools?: string[] }) => void;
}

/** Chat con streaming SSE (POST /v1/agent/chat). Fallback: respuesta demo con efecto de escritura. */
export async function streamChat(query: string, plant: PlantCode, sessionId: string, ev: ChatEvents) {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, plant_id: plant, session_id: sessionId }),
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let agent = 'supervisor';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        const evName = /^event: (.+)$/m.exec(block)?.[1];
        const raw = /^data: (.+)$/m.exec(block)?.[1];
        if (!evName || !raw || raw === '[DONE]') continue;
        const data = JSON.parse(raw);
        if (evName === 'routing' && data.active_agent) { agent = data.active_agent; ev.onAgent(agent); }
        if (evName === 'node_complete' && data.tool_outputs) Object.keys(data.tool_outputs).forEach(ev.onTool);
        if (evName === 'token') { content += data.chunk; ev.onToken(data.chunk); }
        if (evName === 'final_response') { content = data.content || content; agent = data.active_agent || agent; }
        if (evName === 'error') throw new Error(data.message);
      }
    }
    ev.onDone({ content, agent, mode: 'LIVE' });
  } catch {
    const ans = demoChatAnswer(query, plant);
    ev.onAgent(ans.agent);
    ans.tools.forEach(ev.onTool);
    for (const word of ans.content.split(/(\s+)/)) {
      ev.onToken(word);
      await new Promise((r) => setTimeout(r, 18));
    }
    ev.onDone({ content: ans.content, agent: ans.agent, mode: 'DEMO', citation: ans.citation, tools: ans.tools });
  }
}
