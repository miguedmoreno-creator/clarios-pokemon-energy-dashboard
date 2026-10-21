# ⚡ Clarios Energy Control Tower · Frontend

Plataforma de Inteligencia Energética Industrial, Monitoreo SCADA y Optimización de Procesos para la **Planta Yumbo (Colombia)** de Clarios.

Diseñada con **Arquitectura Limpia DDD**, estética moderna de Sala de Control Industrial y **transparencia total** para que los operadores e ingenieros de planta comprendan visualmente cada indicador sin perderse en tablas densas.

---

## 🚀 Inicio Rápido (Reproducibilidad en 2 Comandos)

Cualquier compañero del equipo o evaluador de Clarios puede ejecutar y probar la aplicación sin requerir configuración previa de Python, Docker ni base de datos:

```bash
# 1. Ingresar al directorio del frontend
cd frontend

# 2. Instalar dependencias e iniciar el servidor de desarrollo
npm install
npm run dev
```

La aplicación quedará disponible de inmediato en: **`http://localhost:3000`**

> **💡 Modo Demo Automático:**  
> Si el backend FastAPI no está corriendo, la aplicación detecta la desconexión en menos de 2.5 segundos y activa automáticamente el **Modo Demo**. Este modo opera con datos matemáticamente exactos extraídos del histórico real consolidado de Yumbo (`src/data/historical.json`) y simulaciones deterministas bajo semilla 42. Un indicador visual en la barra superior muestra el estado:
> - `MODO DEMO (FALLBACK)`: Operando localmente con datos certificados.
> - `EN LÍNEA (SCADA OT)`: Conectado en caliente con la API de FastAPI.

---

## 🖥️ Módulos y Experiencia Visual

1. **Topología de Distribución Energética (SVG Interactivo):**
   - Muestra el flujo de potencia eléctrica (cian) y gas natural (ámbar) desde la Subestación Yumbo (13.2 kV) hacia las 4 plantas principales:
     - **FA:** Formación y Acabado (Rectificadores IGBT).
     - **Ensamble:** Líneas 1 a 4.
     - **OREC:** Óxido de Plomo y Molino Barton.
     - **RC:** Reciclaje y Hornos Rotatorios (Matriz bimodal con gas natural).
   - Permite hacer clic en cualquier planta para auditar su telemetría al instante.

2. **Resumen Ejecutivo & Curvas de Carga (Apache ECharts):**
   - 4 tarjetas de KPIs industriales: Consumo Acumulado (kWh), Intensidad Energética ($SEC = \text{kWh/equiv}$) comparada con la Meta ISO 50001, Factura Monetaria en COP y Toneladas de $\text{CO}_2$ evitadas.
   - Gráfica histórica bimodal (kWh + $\text{m}^3$ de gas) con áreas degradadas y tooltips enriquecidos.
   - **Simulador What-If de Cargas:** Slider interactivo de $\pm 25\%$ de producción con cálculo en tiempo real del impacto en costos e incremento de demanda.

3. **Supervisión SCADA en Vivo:**
   - Potencia activa instantánea refrescada a 1 Hz.
   - Indicadores de protección: detección en caliente de resets de contador Modbus ($\Delta < 0$) y estado de sincronización local SQLite WAL.
   - Feed de alarmas operacionales con filtros de severidad (`CRITICAL`, `WARNING`, `INFO`) y botón de confirmación de lectura por el operador.

4. **Consola de Optimización Matemática (HiGHS & SLSQP):**
   - **HiGHS MILP:** Despacho óptimo horario aprovechando tarifas CREG/XM (desplazamiento de carga a horas valle de $\$520\text{ COP/kWh}$ evitando horas pico de $\$780\text{ COP/kWh}$).
   - **SLSQP MPC:** Control predictivo térmico en tinas de formación con verificación visual del límite de seguridad inviolable de $55.0^\circ\text{C}$ (Norma NFPA 86).

5. **Copiloto IA Industrial (RAG & Multi-Agente):**
   - Terminal conversacional con streaming de respuesta.
   - Transparencia total: indica qué agente especialista respondió (`energy_agent`, `anomaly_agent`, `prediction_agent`, `gas_agent`), qué herramientas ejecutó y la citación técnica formal del manual o norma ISO/NFPA consultada.
   - **Cero Aritmética en Texto:** Todos los valores numéricos son calculados por algoritmos deterministas.

6. **Diagnóstico XAI (SHAP):**
   - Gráfica de cascada de valores Shapley para entender matemáticamente qué variables causaron las variaciones en el consumo.
   - Métricas de calidad del modelo (MAPE, $R^2$, N) y confirmación de hash SHA-256 en catálogo MLOps.

7. **Modo Junta Directiva (Tecla `F`):**
   - Presionando la tecla `F` en el teclado, la tipografía y los KPIs escalan de tamaño automáticamente para presentaciones en salas de juntas y proyectores de alta resolución.

---

## 📦 Compilación para Producción

Para compilar los artefactos optimizados y estáticos que se cargan en servidores de Clarios (Nginx / Kubernetes):

```bash
npm run build
```

Los archivos finales se generarán en la carpeta `dist/`.
