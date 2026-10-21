/** Formateadores es-CO para cifras industriales. */
const nf = (d: number) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });

export const fmtNum = (v: number, decimals = 0) => nf(decimals).format(v);

export const fmtCOP = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${nf(2).format(v / 1e9)} mil M`;
  if (abs >= 1e6) return `$${nf(1).format(v / 1e6)} M`;
  return `$${nf(0).format(v)}`;
};

export const fmtCompact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${nf(2).format(v / 1e6)} M`;
  if (abs >= 1e3) return `${nf(1).format(v / 1e3)} k`;
  return nf(0).format(v);
};

export const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
};
