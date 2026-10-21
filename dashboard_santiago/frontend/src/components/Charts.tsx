import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { MonthlyPoint, ShapFeature } from '../lib/domain';

interface LoadCurveProps {
  data: MonthlyPoint[];
  plantColor: string;
  whatIfPercent?: number;
}

export const LoadCurveChart: React.FC<LoadCurveProps> = ({
  data,
  plantColor,
  whatIfPercent = 0,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;
    const chart = echarts.init(chartRef.current);

    const dates = data.map((d) => d.date);
    const kwh = data.map((d) => Math.round(d.kwh));
    const gas = data.map((d) => Math.round(d.gas_m3));
    const hasGas = gas.some((v) => v > 0);

    // Si el usuario movió el slider What-If (!= 0), calculamos la curva proyectada
    const hasWhatIf = whatIfPercent !== 0;
    const factor = 1 + whatIfPercent / 100;
    const whatIfKwh = kwh.map((v) => Math.round(v * factor));

    const yAxes: echarts.YAXisComponentOption[] = [
      {
        type: 'value',
        name: 'kWh',
        nameTextStyle: { color: '#8b98ad' },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.08)' } },
        axisLabel: {
          color: '#8b98ad',
          formatter: (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}k`),
        },
      },
    ];

    if (hasGas) {
      yAxes.push({
        type: 'value',
        name: 'm³ Gas',
        nameTextStyle: { color: '#fbbf24' },
        splitLine: { show: false },
        axisLabel: { color: '#fbbf24', formatter: (v: number) => `${(v / 1e3).toFixed(0)}k` },
      });
    }

    const legendItems = ['Consumo Eléctrico Real (kWh)'];
    if (hasWhatIf) {
      legendItems.push(`Simulación What-If (${whatIfPercent > 0 ? `+${whatIfPercent}%` : `${whatIfPercent}%`})`);
    }
    if (hasGas) {
      legendItems.push('Gas Natural (m³)');
    }

    const seriesList: echarts.SeriesOption[] = [
      {
        name: 'Consumo Eléctrico Real (kWh)',
        type: 'line',
        step: 'end',
        smooth: false,
        data: kwh,
        symbol: 'none',
        lineStyle: { width: 3, color: plantColor },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(34, 211, 238, 0.25)' },
            { offset: 1, color: 'rgba(0, 0, 0, 0)' },
          ]),
        },
      },
    ];

    if (hasWhatIf) {
      seriesList.push({
        name: `Simulación What-If (${whatIfPercent > 0 ? `+${whatIfPercent}%` : `${whatIfPercent}%`})`,
        type: 'line',
        smooth: true,
        data: whatIfKwh,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: {
          width: 2.5,
          color: whatIfPercent > 0 ? '#f43f5e' : '#34d399',
          type: 'dashed',
        },
        itemStyle: {
          color: whatIfPercent > 0 ? '#f43f5e' : '#34d399',
        },
      });
    }

    if (hasGas) {
      seriesList.push({
        name: 'Gas Natural (m³)',
        type: 'line',
        yAxisIndex: 1,
        step: 'end',
        smooth: false,
        data: gas,
        symbol: 'none',
        lineStyle: { width: 2.5, color: '#fbbf24', type: 'dashed' },
      });
    }

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(11, 17, 28, 0.95)',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        textStyle: { color: '#e6edf7', fontFamily: 'Inter' },
        formatter: (params: any) => {
          let res = `<div style="font-weight:bold;margin-bottom:4px;">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const unit = p.seriesName.includes('Gas') ? 'm³' : 'kWh';
            res += `<div style="display:flex;justify-content:space-between;gap:16px;">
              <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}:</span>
              <span style="font-family:JetBrains Mono;font-weight:600;">${p.value.toLocaleString('es-CO')} ${unit}</span>
            </div>`;
          });
          return res;
        },
      },
      legend: {
        data: legendItems,
        textStyle: { color: '#8b98ad', fontSize: 11 },
        top: 0,
        right: 10,
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '8%',
        top: '16%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
        axisLabel: { color: '#8b98ad', fontSize: 10 },
      },
      yAxis: yAxes,
      series: seriesList,
    };

    chart.setOption(option, true);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data, plantColor, whatIfPercent]);

  return <div ref={chartRef} className="chart tall" />;
};

interface ShapWaterfallProps {
  features: ShapFeature[];
}

export const ShapWaterfallChart: React.FC<ShapWaterfallProps> = ({ features }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !features.length) return;
    const chart = echarts.init(chartRef.current);

    const names = features.map((f) => f.feature);
    const values = features.map((f) => f.value);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = params[0];
          const val = item.value;
          const sign = val > 0 ? '+' : '';
          return `<b>${item.name}</b><br/>Impacto SHAP: <span style="font-family:JetBrains Mono;">${sign}${val.toLocaleString('es-CO')} kWh</span>`;
        },
      },
      grid: { left: '3%', right: '8%', bottom: '5%', top: '5%', containLabel: true },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
        axisLabel: { color: '#8b98ad' },
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
        axisLabel: { color: '#e6edf7', fontSize: 11 },
      },
      series: [
        {
          name: 'Impacto SHAP',
          type: 'bar',
          data: values.map((val) => ({
            value: val,
            itemStyle: {
              color: val >= 0 ? '#f43f5e' : '#34d399',
              borderRadius: 0 as any,
            },
          })),
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [features]);

  return <div ref={chartRef} className="chart" />;
};

/* -------------------------------------------------------------
 * NUEVO: Gráfico ECharts de Despacho de Cargas HiGHS MILP
 * ------------------------------------------------------------- */
interface MilpScheduleProps {
  schedule: Array<{
    shift_number: number;
    allocated_kwh: number;
    tariff_cop_per_kwh: number;
    shift_cost_cop: number;
  }>;
}

export const MilpScheduleChart: React.FC<MilpScheduleProps> = ({ schedule }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !schedule.length) return;
    const chart = echarts.init(chartRef.current);

    const shifts = ['Turno 1 (Valle $520)', 'Turno 2 (Medio $650)', 'Turno 3 (Pico $780)'];
    const allocatedKwh = schedule.map((s) => Math.round(s.allocated_kwh));
    // Estimación de línea base antes de optimizar para comparar
    const total = allocatedKwh.reduce((a, b) => a + b, 0);
    const baselineKwh = [Math.round(total * 0.33), Math.round(total * 0.33), Math.round(total * 0.34)];

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          let res = `<div style="font-weight:bold;margin-bottom:4px;">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            res += `<div style="display:flex;justify-content:space-between;gap:12px;">
              <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}:</span>
              <span style="font-family:JetBrains Mono;font-weight:bold;">${p.value.toLocaleString('es-CO')} kWh</span>
            </div>`;
          });
          return res;
        },
      },
      legend: {
        data: ['Sin Optimizar (Línea Base)', 'Despacho HiGHS MILP'],
        textStyle: { color: '#8b98ad', fontSize: 11 },
        top: 0,
        right: 10,
      },
      grid: { left: '3%', right: '3%', bottom: '8%', top: '22%', containLabel: true },
      xAxis: {
        type: 'category',
        data: shifts,
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
        axisLabel: { color: '#e6edf7', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: 'kWh',
        nameTextStyle: { color: '#8b98ad' },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
        axisLabel: { color: '#8b98ad', formatter: (v: number) => `${(v / 1e3).toFixed(0)}k` },
      },
      series: [
        {
          name: 'Sin Optimizar (Línea Base)',
          type: 'bar',
          data: baselineKwh,
          itemStyle: { color: 'rgba(148, 163, 184, 0.3)', borderRadius: 0 },
        },
        {
          name: 'Despacho HiGHS MILP',
          type: 'bar',
          data: allocatedKwh,
          itemStyle: {
            color: (params: any) => {
              // Verde en turno 1 (ahorro en valle), ámbar en turno 2, rojo/reducido en pico
              if (params.dataIndex === 0) return '#34d399';
              if (params.dataIndex === 1) return '#22d3ee';
              return '#fbbf24';
            },
            borderRadius: 0,
          },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [schedule]);

  return <div ref={chartRef} className="chart" style={{ height: '230px', marginTop: '12px' }} />;
};

/* -------------------------------------------------------------
 * NUEVO: Gráfico ECharts de Trayectoria Térmica SLSQP MPC
 * ------------------------------------------------------------- */
interface MpcTrajectoryProps {
  trajectory: Array<{
    time_minutes: number;
    predicted_temperature_c: number;
    target_temperature_c: number;
    optimal_control_power_kw: number;
  }>;
}

export const MpcTrajectoryChart: React.FC<MpcTrajectoryProps> = ({ trajectory }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !trajectory.length) return;
    const chart = echarts.init(chartRef.current);

    const times = trajectory.map((t) => `${t.time_minutes}m`);
    const temps = trajectory.map((t) => t.predicted_temperature_c);
    const limits = trajectory.map(() => 55.0); // Límite NFPA 86

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const item = params[0];
          return `<b>Tiempo: ${item.axisValue}</b><br/>Temp. Proyectada: <b style="font-family:JetBrains Mono;color:#34d399;">${item.value} °C</b><br/><span style="color:#f43f5e;">Límite Crítico: 55.0 °C</span>`;
        },
      },
      legend: {
        data: ['Temperatura Tinas (°C)', 'Límite Crítico (55°C NFPA 86)'],
        textStyle: { color: '#8b98ad', fontSize: 11 },
        top: 0,
        right: 10,
      },
      grid: { left: '3%', right: '3%', bottom: '8%', top: '22%', containLabel: true },
      xAxis: {
        type: 'category',
        data: times,
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
        axisLabel: { color: '#8b98ad', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: '°C',
        min: 40,
        max: 58,
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
        axisLabel: { color: '#8b98ad' },
      },
      series: [
        {
          name: 'Temperatura Tinas (°C)',
          type: 'line',
          step: 'end',
          smooth: false,
          data: temps,
          lineStyle: { width: 3, color: '#34d399' },
          itemStyle: { color: '#34d399' },
        },
        {
          name: 'Límite Crítico (55°C NFPA 86)',
          type: 'line',
          data: limits,
          symbol: 'none',
          lineStyle: { width: 2, color: '#f43f5e', type: 'dashed' },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [trajectory]);

  return <div ref={chartRef} className="chart" style={{ height: '230px', marginTop: '12px' }} />;
};
