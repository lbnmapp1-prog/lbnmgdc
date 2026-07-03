import { getGrupos, getMiembros, getStats, getMiembrosPorGrupo, getCumpleaniosMes } from './db.js';
import { getCurrentProfile, isAdmin, getCurrentGrupoId } from './main.js';
import { MILESTONES, CURSOS } from './constants.js';

const CHART_COLORS = ['#1e5aa8','#2f7d6b','#9a5b2b','#6b4e9a','#9a3b52','#2b6f8a','#3a6ea5','#7a7a3a'];

const PRINT_CSS = `
  :root { color-scheme: light only; }
  * { box-sizing: border-box; }
  html, body { background:#ffffff; }
  body { font-family: Arial, Helvetica, sans-serif; color:#1c2333; margin:0; padding:26mm 16mm; font-size:13px; }
  .doc-header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #1e5aa8; padding-bottom:14px; margin-bottom:22px; }
  .doc-header .brand { font-size:11px; color:#8a94a8; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
  .doc-header h1 { font-size:20px; margin:4px 0; color:#0d2440; }
  .doc-header .sub { font-size:12px; color:#6b7689; }
  .doc-meta { text-align:right; font-size:11px; color:#6b7689; line-height:1.6; white-space:nowrap; }
  table { width:100%; border-collapse:collapse; margin-bottom:22px; }
  th, td { text-align:left; padding:7px 10px; font-size:12px; border-bottom:1px solid #e6eaf0; }
  th { background:#f5f7fb; color:#3d4860; font-weight:700; text-transform:uppercase; font-size:10px; letter-spacing:.3px; }
  .section-title { font-size:14px; font-weight:700; color:#0d2440; margin:24px 0 10px; padding-bottom:6px; border-bottom:1px solid #e6eaf0; }
  .kpi-row { display:flex; gap:14px; margin-bottom:8px; }
  .kpi-box { flex:1; border:1px solid #e6eaf0; border-radius:8px; padding:12px 14px; }
  .kpi-box .num { font-size:22px; font-weight:700; color:#1e5aa8; }
  .kpi-box .label { font-size:10.5px; color:#6b7689; margin-top:2px; }
  .doc-footer { margin-top:26px; padding-top:10px; border-top:1px solid #e6eaf0; font-size:10px; color:#9aa5b5; text-align:center; }
  .chart-row { display:flex; gap:24px; align-items:flex-start; margin-bottom:8px; flex-wrap:wrap; }
  .chart-card { flex:1; min-width:220px; }
  .chart-card-title { font-size:10.5px; font-weight:700; color:#6b7689; text-transform:uppercase; letter-spacing:.3px; margin-bottom:10px; }
  .bar-chart { display:flex; flex-direction:column; gap:9px; }
  .bar-item { display:flex; align-items:center; gap:10px; }
  .bar-label { width:150px; flex-shrink:0; font-size:11.5px; font-weight:600; color:#3d4860; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .bar-track { flex:1; height:13px; background:#f0f2f6; border-radius:7px; overflow:hidden; }
  .bar-fill { height:100%; border-radius:7px; }
  .bar-value { width:48px; text-align:right; font-size:11.5px; font-weight:700; color:#3d4860; flex-shrink:0; }
  .donut-wrap { display:flex; align-items:center; gap:18px; }
  .donut-legend { display:flex; flex-direction:column; gap:8px; }
  .legend-row { display:flex; align-items:center; gap:8px; font-size:11.5px; color:#3d4860; white-space:nowrap; }
  .legend-dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
  .legend-num { font-weight:700; margin-left:14px; }
  @page { margin: 14mm; }
`;

// ---- helpers de gráficas: SVG/CSS puro, sin librerías — renderizan al instante y se imprimen siempre igual ----
function barChart(items) {
  const max = Math.max(1, ...items.map(i => i.value));
  const rows = items.map((it, i) => `
    <div class="bar-item">
      <div class="bar-label">${it.label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, Math.round(it.value / max * 100))}%;background:${it.color || CHART_COLORS[i % CHART_COLORS.length]};"></div></div>
      <div class="bar-value">${it.value}${it.suffix || ''}</div>
    </div>`).join('');
  return `<div class="bar-chart">${rows}</div>`;
}

function donutChart(segments, { size = 128, thickness = 20 } = {}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let acc = 0;
  const circles = segments.filter(s => s.value > 0).map(seg => {
    const frac = seg.value / total;
    const dash = frac * circumference;
    const circle = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${thickness}" stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" />`;
    acc += dash;
    return circle;
  }).join('');
  const pctPrincipal = Math.round((segments[0]?.value || 0) / total * 100);
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f0f2f6" stroke-width="${thickness}" />
      ${circles}
      <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="20" font-weight="700" fill="#0d2440" font-family="Arial">${pctPrincipal}%</text>
    </svg>`;
  const legend = segments.map(s => `<div class="legend-row"><span class="legend-dot" style="background:${s.color};"></span>${s.label}<span class="legend-num">${s.value}</span></div>`).join('');
  return `<div class="donut-wrap">${svg}<div class="donut-legend">${legend}</div></div>`;
}

function docHeader(titulo, subtitulo) {
  const perfil = getCurrentProfile();
  const fecha = new Date().toLocaleDateString('es', { day:'numeric', month:'long', year:'numeric' });
  return `
  <div class="doc-header">
    <div>
      <div class="brand">Pastoreo GDC · Iglesia LBN</div>
      <h1>${titulo}</h1>
      ${subtitulo ? `<div class="sub">${subtitulo}</div>` : ''}
    </div>
    <div class="doc-meta">Generado: ${fecha}<br/>Por: ${perfil?.nombre || '—'} (${perfil?.rol || '—'})</div>
  </div>`;
}

// Imprime dentro de un iframe oculto en la misma página, en vez de abrir una
// ventana nueva: window.open() puede ser bloqueado por el navegador (varía
// según configuración) mientras que un iframe propio nunca dispara el
// bloqueador de pop-ups y funciona igual en desktop y en móvil.
function imprimirHtml(titulo, bodyHtml) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${titulo}</title><style>${PRINT_CSS}</style></head><body>${bodyHtml}<div class="doc-footer">Pastoreo GDC — documento generado desde el sistema, uso interno.</div></body></html>`);
  doc.close();

  const limpiar = () => { if (iframe.parentNode) iframe.remove(); };
  iframe.contentWindow.onafterprint = limpiar;
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(limpiar, 2000); // respaldo por si 'afterprint' no dispara (ej. Safari iOS)
  }, 150);
}

// ===== 1. RESUMEN GENERAL =====
export async function imprimirResumenGeneral() {
  const grupoId = isAdmin() ? null : getCurrentGrupoId();
  const [stats, porGrupo] = await Promise.all([getStats(grupoId), getMiembrosPorGrupo(grupoId)]);
  const filas = porGrupo.map(g => `<tr><td>${g.nombre}</td><td>${g.sede || '—'}</td><td>${g.count}</td></tr>`).join('')
    || '<tr><td colspan="3">Sin datos</td></tr>';

  const bars = barChart(porGrupo.map(g => ({ label: g.nombre, value: g.count })));
  const donut = donutChart([
    { label: 'Bautizados', value: stats.bautizados, color: '#2f7d6b' },
    { label: 'Sin bautizar', value: stats.total - stats.bautizados, color: '#e8c589' },
  ]);

  const body = `
    ${docHeader('Resumen general del área', isAdmin() ? 'Todos los Grupos de Cuidado' : 'Tu Grupo de Cuidado')}
    <div class="kpi-row">
      <div class="kpi-box"><div class="num">${stats.total}</div><div class="label">Miembros registrados</div></div>
      <div class="kpi-box"><div class="num">${stats.grupos}</div><div class="label">Grupos de Cuidado</div></div>
      <div class="kpi-box"><div class="num">${stats.bautizados}</div><div class="label">Bautizados</div></div>
      <div class="kpi-box"><div class="num">${stats.total - stats.bautizados}</div><div class="label">Sin bautizar</div></div>
    </div>
    <div class="section-title">Miembros por Grupo de Cuidado</div>
    <div class="chart-row">
      <div class="chart-card">${bars}</div>
      <div class="chart-card" style="max-width:260px;">
        <div class="chart-card-title">Estado de bautismo</div>
        ${donut}
      </div>
    </div>
    <table><thead><tr><th>Grupo</th><th>Sede</th><th>Integrantes</th></tr></thead><tbody>${filas}</tbody></table>
  `;
  imprimirHtml('Resumen general', body);
}

// ===== 2. DIRECTORIO POR GRUPO =====
const ROL_COLORS = { 'Líder de Grupo': '#1e5aa8', 'Líder Asistente': '#2f7d6b', 'Padre Espiritual': '#6b4e9a', 'Miembro': '#8a94a8' };

export async function imprimirDirectorioGrupo(grupoId) {
  const [grupos, miembros] = await Promise.all([getGrupos(), getMiembros(grupoId)]);
  const g = grupos.find(x => x.id === grupoId);
  const filas = miembros.map(m => `
    <tr>
      <td>${m.nombre}</td>
      <td>${m.rol}</td>
      <td>${m.telefono || '—'}</td>
      <td>${m.correo || '—'}</td>
      <td>${Math.round(((m.nivel_idx ?? 0) + 1) / MILESTONES.length * 100)}%</td>
    </tr>`).join('') || '<tr><td colspan="5">Sin miembros registrados</td></tr>';

  const porRol = {};
  miembros.forEach(m => { porRol[m.rol] = (porRol[m.rol] || 0) + 1; });
  const donut = donutChart(Object.entries(porRol).map(([rol, count]) => ({ label: rol, value: count, color: ROL_COLORS[rol] || '#8a94a8' })));

  const body = `
    ${docHeader(`Directorio · ${g?.nombre || 'Grupo de Cuidado'}`, `${g?.sede ? g.sede + ' · ' : ''}${miembros.length} integrante${miembros.length !== 1 ? 's' : ''}`)}
    ${miembros.length ? `
    <div class="chart-row">
      <div class="chart-card" style="max-width:280px;">
        <div class="chart-card-title">Composición del grupo</div>
        ${donut}
      </div>
    </div>` : ''}
    <table>
      <thead><tr><th>Nombre</th><th>Rol</th><th>Teléfono</th><th>Correo</th><th>Ruta</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `;
  imprimirHtml(`Directorio ${g?.nombre || ''}`, body);
}

// ===== 3. RUTA DE CRECIMIENTO Y DISCIPULADO =====
export async function imprimirRutaCrecimiento() {
  const grupoId = isAdmin() ? null : getCurrentGrupoId();
  const miembros = await getMiembros(grupoId);
  const total = miembros.length || 1;

  const porHito = MILESTONES.map((ml, i) => ({
    hito: ml.t,
    count: miembros.filter(m => (m.nivel_idx ?? 0) === i).length,
  }));
  const barHitos = barChart(porHito.map(h => ({ label: h.hito, value: h.count })));

  const sinBautizar = miembros.filter(m => !m.bautizado);
  const filasSinBautizar = sinBautizar.map(m => `<tr><td>${m.nombre}</td><td>${m.grupos?.nombre || '—'}</td><td>${m.telefono || '—'}</td></tr>`).join('')
    || '<tr><td colspan="3">Todos los miembros están bautizados 🎉</td></tr>';
  const donutBautizo = donutChart([
    { label: 'Bautizados', value: miembros.length - sinBautizar.length, color: '#2f7d6b' },
    { label: 'Sin bautizar', value: sinBautizar.length, color: '#e8c589' },
  ]);

  const cursoStats = CURSOS.map(c => ({
    curso: c,
    count: miembros.filter(m => (m.cursos_completados || []).includes(c)).length,
  })).sort((a, b) => a.count - b.count).slice(0, 8);
  const barCursos = barChart(cursoStats.map(c => ({ label: c.curso, value: c.count, suffix: ` / ${total}` })));

  const body = `
    ${docHeader('Ruta de crecimiento y discipulado', isAdmin() ? 'Todos los Grupos de Cuidado' : 'Tu Grupo de Cuidado')}
    <div class="section-title">Distribución por hito de la ruta de crecimiento</div>
    ${barHitos}
    <div class="section-title">Estado de bautismo · Pendientes: ${sinBautizar.length}</div>
    <div class="chart-row">
      <div class="chart-card" style="max-width:260px;">${donutBautizo}</div>
      <div class="chart-card">
        <table><thead><tr><th>Nombre</th><th>Grupo</th><th>Teléfono</th></tr></thead><tbody>${filasSinBautizar}</tbody></table>
      </div>
    </div>
    <div class="section-title">Cursos con menor finalización (oportunidades de capacitación)</div>
    ${barCursos}
  `;
  imprimirHtml('Ruta de crecimiento', body);
}

// ===== 4. CUMPLEAÑOS DEL MES =====
export async function imprimirCumpleanosMes() {
  const now = new Date();
  const grupoId = isAdmin() ? null : getCurrentGrupoId();
  const cumple = await getCumpleaniosMes(now.getMonth(), grupoId);
  const filas = cumple.map(m => {
    const d = new Date(m.fecha_nacimiento);
    const edad = now.getFullYear() - d.getUTCFullYear();
    return `<tr><td>${d.getUTCDate()}</td><td>${m.nombre}</td><td>${m.grupos?.nombre || '—'}</td><td>${edad} años</td><td>${m.telefono || '—'}</td></tr>`;
  }).join('') || '<tr><td colspan="5">Sin cumpleaños este mes</td></tr>';

  const SEMANAS = [
    { label: 'Semana 1 (1–7)', min: 1, max: 7 },
    { label: 'Semana 2 (8–14)', min: 8, max: 14 },
    { label: 'Semana 3 (15–21)', min: 15, max: 21 },
    { label: 'Semana 4 (22–28)', min: 22, max: 28 },
    { label: 'Semana 5 (29–31)', min: 29, max: 31 },
  ];
  const barSemanas = barChart(SEMANAS.map(s => ({
    label: s.label,
    value: cumple.filter(m => { const d = new Date(m.fecha_nacimiento).getUTCDate(); return d >= s.min && d <= s.max; }).length,
    color: '#9a5b2b',
  })));

  const body = `
    ${docHeader(`Cumpleaños de ${now.toLocaleString('es', { month: 'long' })}`, isAdmin() ? 'Todos los Grupos de Cuidado' : 'Tu Grupo de Cuidado')}
    ${cumple.length ? `<div class="section-title">Distribución por semana</div>${barSemanas}` : ''}
    <div class="section-title">Detalle (${cumple.length})</div>
    <table>
      <thead><tr><th>Día</th><th>Nombre</th><th>Grupo</th><th>Cumple</th><th>Teléfono</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `;
  imprimirHtml('Cumpleaños del mes', body);
}
