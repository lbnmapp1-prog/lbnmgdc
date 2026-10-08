import { AREAS_RUEDA } from './constants.js';

// Gráfico de radar (rueda de vida) en SVG puro.
// series: [{ valores: { Dios: 7, ... }, color: '#1e5aa8', dashed?: bool }]
export function ruedaSvg(series, size = 380) {
  const n = AREAS_RUEDA.length;
  const c = size / 2;
  const R = size / 2 - 78;
  const pt = (i, v) => {
    const ang = (-90 + i * 360 / n) * Math.PI / 180;
    return [c + R * (v / 10) * Math.cos(ang), c + R * (v / 10) * Math.sin(ang)];
  };
  const poly = v => AREAS_RUEDA.map((_, i) => pt(i, v).map(x => x.toFixed(1)).join(',')).join(' ');

  const rings = [2, 4, 6, 8, 10].map(v =>
    `<polygon points="${poly(v)}" fill="none" stroke="#dfe5ee" stroke-width="${v === 10 ? 1.6 : 1}"/>`).join('');
  const axes = AREAS_RUEDA.map((_, i) => {
    const [x, y] = pt(i, 10);
    return `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#dfe5ee"/>`;
  }).join('');
  const ticks = [2, 4, 6, 8, 10].map(v =>
    `<text x="${c + 4}" y="${(c - R * v / 10 + 3).toFixed(1)}" font-size="9" fill="#a9b2c2">${v}</text>`).join('');
  const labels = AREAS_RUEDA.map((a, i) => {
    const [x, y] = pt(i, 11.6);
    const cos = Math.cos((-90 + i * 360 / n) * Math.PI / 180);
    const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="11.5" font-weight="600" fill="#3d4860" text-anchor="${anchor}">${a.label}</text>`;
  }).join('');
  const shapes = series.map(s => {
    const pts = AREAS_RUEDA.map((a, i) => pt(i, s.valores[a.key] ?? 0));
    const str = pts.map(p => p.map(x => x.toFixed(1)).join(',')).join(' ');
    const dots = s.dashed ? '' : pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="${s.color}"/>`).join('');
    return `<polygon points="${str}" fill="${s.color}" fill-opacity="${s.dashed ? 0 : 0.18}" stroke="${s.color}" stroke-width="2.2" ${s.dashed ? 'stroke-dasharray="5 4"' : ''}/>${dots}`;
  }).join('');

  return `<svg viewBox="0 0 ${size} ${size}" style="width:100%;max-width:${size}px;height:auto;font-family:inherit;" role="img" aria-label="Rueda de vida">${rings}${axes}${ticks}${shapes}${labels}</svg>`;
}

export function promedio(valores) {
  const v = AREAS_RUEDA.map(a => valores[a.key]).filter(x => typeof x === 'number');
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null;
}

// Estado de la rueda en un momento dado: para cada área, el último valor aprobado del líder.
// Permite evaluaciones parciales (una cita = un área) sin perder el resto de la rueda.
// `evals` debe venir ordenado de más reciente a más antigua; `offset` omite las N más recientes.
export function snapshot(evals, offset = 0) {
  const usar = evals.filter(e => e.estado === 'Aprobada' && e.fuente === 'Líder').slice(offset);
  if (!usar.length) return null;
  const valores = {};
  AREAS_RUEDA.forEach(a => { valores[a.key] = usar.find(e => e.valores[a.key] != null)?.valores[a.key] ?? null; });
  return { valores, fecha: usar[0].fecha };
}

// Primer y último valor registrado de un área (para ver el avance).
export function progresoArea(evals, key) {
  const con = evals.filter(e => e.estado === 'Aprobada' && e.fuente === 'Líder' && e.valores[key] != null);
  if (!con.length) return null;
  return { inicio: con[con.length - 1].valores[key], actual: con[0].valores[key], n: con.length };
}
