"""Genera frontend/src/data/historical.json desde datasets/processed/historical_energy.csv.

Uso (desde la raíz del repo):  python frontend/scripts/build_demo_data.py
Solo requiere la librería estándar de Python.
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "datasets" / "processed" / "historical_energy.csv"
OUT = ROOT / "frontend" / "src" / "data" / "historical.json"


def num(v: str) -> float:
    try:
        return round(float(v), 3)
    except (TypeError, ValueError):
        return 0.0


def main() -> None:
    series: dict[str, list[dict]] = {}
    with SRC.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if not row["process_code"].endswith("_TOTAL"):
                continue
            series.setdefault(row["plant_id"], []).append(
                {
                    "date": row["period_date"][:7],
                    "kwh": num(row["kwh_consumed"]),
                    "gas_m3": num(row["gas_m3_consumed"]),
                    "equiv": num(row["equivalent_units"]),
                    "cost_cop": num(row["total_cost_cop"]),
                }
            )
    for rows in series.values():
        rows.sort(key=lambda r: r["date"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(series, separators=(",", ":")), encoding="utf-8")
    print(f"OK -> {OUT} ({ {k: len(v) for k, v in series.items()} })")


if __name__ == "__main__":
    main()
