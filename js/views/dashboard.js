import { getStats, getMiembrosPorGrupo, getEventos, getCumpleaniosMes } from '../db.js';
import { isAdmin, getCurrentGrupoId } from '../main.js';

const AVATAR_COLORS = ['#1e5aa8','#2f7d6b','#9a5b2b','#6b4e9a','#9a3b52','#2b6f8a','#3a6ea5','#7a7a3a'];
const EV_COLORS = { reunion:'#1e5aa8', evento:'#9a3b52', servicio:'#2f7d6b', capacitacion:'#9a5b2b', retiro:'#6b4e9a' };

// Los cumpleaños mostrados ya están filtrados al mes actual, así que la edad
// que cumplen este año es simplemente la diferencia de años de nacimiento.
function edadQueCumple(fechaNacimiento, fechaRef) {
  const nac = new Date(fechaNacimiento);
  return fechaRef.getUTCFullYear() - nac.getUTCFullYear();
}

export async function renderDashboard(container, navigate) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;

  const now = new Date();
  // Un Líder de Grupo solo ve estadísticas y cumpleaños de su propio grupo.
  const grupoId = isAdmin() ? null : getCurrentGrupoId();
  let stats, porGrupo, eventos, cumple;
  try {
    [stats, porGrupo, eventos, cumple] = await Promise.all([
      getStats(grupoId),
      getMiembrosPorGrupo(grupoId),
      getEventos(now.getFullYear(), now.getMonth()),
      getCumpleaniosMes(now.getMonth(), grupoId),
    ]);
  } catch (e) {
    container.innerHTML = `<div class="card" style="color:#9a3b52;padding:24px;"><b>Error al cargar datos:</b><br><code style="font-size:12px;">${e.message}</code></div>`;
    return;
  }

  const maxCount = Math.max(1, ...porGrupo.map(g => g.count));
  const gruposBars = porGrupo.map((g, i) => `
    <div class="flex gap-12 btn-ver-reportes" style="align-items:center;cursor:pointer;">
      <div style="width:148px;flex-shrink:0;font-size:13.5px;font-weight:600;color:#2d3650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${g.nombre}</div>
      <div style="flex:1;height:10px;background:#eef1f6;border-radius:6px;overflow:hidden;">
        <div style="height:100%;width:${Math.round(g.count/maxCount*100)}%;background:${AVATAR_COLORS[i%AVATAR_COLORS.length]};border-radius:6px;"></div>
      </div>
      <div style="width:34px;text-align:right;font-size:13.5px;font-weight:700;font-family:'IBM Plex Mono',monospace;">${g.count}</div>
    </div>
  `).join('');

  const upcomingEvs = eventos.slice(0, 4).map(e => {
    const d = new Date(e.fecha);
    const color = EV_COLORS[e.tipo] || '#8a94a8';
    return `
      <div class="flex gap-12" style="align-items:center;padding:9px 0;border-bottom:1px solid #f0f2f6;">
        <div class="cal-ev-day" style="flex-shrink:0;">
          <div class="day-num">${d.getUTCDate()}</div>
          <div class="day-mon">${d.toLocaleString('es',{month:'short'})}</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px;font-weight:600;color:#2d3650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.titulo}</div>
          <div style="font-size:12px;color:#8a94a8;">${e.hora || ''}</div>
        </div>
        <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></span>
      </div>
    `;
  }).join('');

  const cumpleCards = cumple.map((m, i) => {
    const d = new Date(m.fecha_nacimiento);
    const esHoy = d.getUTCDate() === now.getDate() && d.getUTCMonth() === now.getMonth();
    const edadCumple = edadQueCumple(m.fecha_nacimiento, now);
    const ini = m.nombre.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
    return `
      <div class="flex gap-12" data-miembro-id="${m.id}" style="align-items:center;padding:8px 10px;border-radius:10px;cursor:pointer;${esHoy ? 'background:#fff6e9;border:1px solid #f3d9a8;' : ''}">
        <div class="avatar sm" style="background:${AVATAR_COLORS[i%AVATAR_COLORS.length]};">${ini}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px;font-weight:600;color:#2d3650;">${m.nombre}</div>
          <div style="font-size:12px;color:#8a94a8;">${m.grupos?.nombre || '—'} · cumple ${edadCumple} años</div>
        </div>
        ${esHoy
          ? `<span style="font-size:12px;font-weight:700;color:#fff;background:#c9781f;padding:4px 10px;border-radius:20px;">¡Hoy! 🎉</span>`
          : `<span style="font-size:12px;font-weight:600;color:#9a5b2b;background:#fbf2e9;padding:4px 10px;border-radius:20px;">${d.getUTCDate()} ${d.toLocaleString('es',{month:'short'})}</span>`}
      </div>
    `;
  }).join('') || '<div class="text-muted text-sm">Sin cumpleaños este mes</div>';

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  container.innerHTML = `
  <div class="page-wrap fade-up">
    <div style="margin-bottom:22px;">
      <h3 style="font-size:21px;font-weight:700;margin-bottom:4px;letter-spacing:-.4px;">${greeting} 👋</h3>
      <p style="font-size:14px;color:#6b7689;">${now.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · Resumen del área de Jóvenes Adultos</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#e8f0fb;color:#1e5aa8;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.4"/><path d="M22 21v-2a4 4 0 0 0-3-3.85"/></svg>
        </div>
        <div class="kpi-num">${stats.total ?? 0}</div>
        <div class="kpi-label">Miembros registrados</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#eef6f3;color:#2f7d6b;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></svg>
        </div>
        <div class="kpi-num">${stats.grupos ?? 0}</div>
        <div class="kpi-label">Grupos de Cuidado</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fbf2e9;color:#9a5b2b;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8a3 3 0 1 0-3-3c0 1 .5 1.8 1 2.5M12 8a3 3 0 1 1 3-3c0 1-.5 1.8-1 2.5M5 21V11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10M3 21h18M3 13h18"/></svg>
        </div>
        <div class="kpi-num">${cumple.length}</div>
        <div class="kpi-label">🎂 Cumpleaños este mes</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#eaf4fb;color:#2b6f8a;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5c-3 4-6 6.5-6 10.5a6 6 0 0 0 12 0c0-4-3-6.5-6-10.5Z"/></svg>
        </div>
        <div class="kpi-num">${stats.bautizados ?? 0}</div>
        <div class="kpi-label">Miembros bautizados</div>
      </div>
      <div class="kpi-card accent">
        <div class="kpi-icon" style="background:rgba(255,255,255,.16);color:#fff;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>
        </div>
        <div class="kpi-num">${eventos.length}</div>
        <div class="kpi-label" style="color:#cfe0f4;">Eventos este mes</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:18px;">
      <div class="flex-col gap-18">
        <div class="card">
          <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div class="card-title">Miembros por Grupo de Cuidado</div>
            <span style="font-size:12px;color:#8a94a8;">Total ${stats.total ?? 0}</span>
          </div>
          <div class="flex-col gap-14">${gruposBars || '<div class="empty-state">Sin datos</div>'}</div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:6px;">Estructura del área</div>
          <p class="card-sub">Cadena de liderazgo en Jóvenes Adultos</p>
          <div class="flex gap-8" style="align-items:center;flex-wrap:wrap;font-size:13px;">
            <span style="padding:7px 13px;border-radius:9px;background:#0d2440;color:#fff;font-weight:600;">Pastor de Área</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c2cad8" stroke-width="2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>
            <span style="padding:7px 13px;border-radius:9px;background:#eef6f3;color:#2f7d6b;font-weight:600;">Líder Asesor</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c2cad8" stroke-width="2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>
            <span style="padding:7px 13px;border-radius:9px;background:#f5f0fa;color:#6b4e9a;font-weight:600;">Líder de Grupo</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c2cad8" stroke-width="2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>
            <span style="padding:7px 13px;border-radius:9px;background:#f3f5f9;color:#56607a;font-weight:600;">Equipo base · Miembros</span>
          </div>
          <button id="btn-ver-organigrama" class="back-link" style="margin-top:16px;margin-bottom:0;">
            Ver organigrama completo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      <div class="flex-col gap-18">
        <div class="card" style="border:1.5px solid #f3d9a8;">
          <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div class="card-title">🎂 Cumpleaños de ${now.toLocaleString('es',{month:'long'})}</div>
            <span style="font-size:12px;font-weight:700;color:#9a5b2b;background:#fbf2e9;padding:3px 10px;border-radius:20px;">${cumple.length}</span>
          </div>
          <div class="flex-col gap-6" style="max-height:340px;overflow-y:auto;">${cumpleCards}</div>
        </div>
        <div class="card">
          <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div class="card-title">Próximos eventos</div>
            <button id="btn-ver-calendario" class="back-link" style="margin:0;font-size:12.5px;color:#1e5aa8;font-weight:600;">Ver todo</button>
          </div>
          ${upcomingEvs || '<div class="text-muted text-sm">Sin eventos próximos</div>'}
        </div>
      </div>
    </div>
  </div>`;

  container.querySelector('.btn-ver-reportes')?.addEventListener('click', () => navigate('reportes'));
  container.querySelector('#btn-ver-organigrama')?.addEventListener('click', () => navigate('organigrama'));
  container.querySelector('#btn-ver-calendario')?.addEventListener('click', () => navigate('calendario'));
  container.querySelectorAll('[data-miembro-id]').forEach(el => {
    el.addEventListener('click', () => navigate('ficha', { id: el.dataset.miembroId }));
  });
}
