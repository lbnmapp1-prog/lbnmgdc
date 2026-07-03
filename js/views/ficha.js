import { getMiembro, deleteMiembro } from '../db.js';
import { isAdmin, getCurrentGrupoId } from '../main.js';
import { MILESTONES, CURSOS, APOYO } from '../constants.js';

const COLORS = ['#1e5aa8','#2f7d6b','#9a5b2b','#6b4e9a','#9a3b52','#2b6f8a','#3a6ea5','#7a7a3a'];

function rolClass(rol) {
  if (rol === 'Líder de Grupo') return 'role-lider-grupo';
  if (rol === 'Líder Asistente') return 'role-lider-asistente';
  if (rol === 'Padre Espiritual') return 'role-padre-espiritual';
  return 'role-miembro';
}

function iniciales(nombre) {
  return (nombre||'').split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
}

export async function renderFicha(container, navigate, params = {}) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;
  const m = await getMiembro(params.id);
  if (!m) { container.innerHTML = `<div class="empty-state">Miembro no encontrado</div>`; return; }
  if (!isAdmin() && m.grupo_id !== getCurrentGrupoId()) {
    container.innerHTML = `<div class="empty-state">No tienes acceso a este miembro — pertenece a otro Grupo de Cuidado.</div>`;
    return;
  }

  const color = COLORS[0];
  const nivelIdx = m.nivel_idx ?? 0;
  const pct = Math.round((nivelIdx + 1) / MILESTONES.length * 100);
  const cursosDone = m.cursos_completados || [];
  const apoyoDone = m.apoyo_completados || [];
  const dones = (m.dones || '').split(',').map(s=>s.trim()).filter(Boolean);
  const temps = (m.temperamentos || []);

  const msHtml = MILESTONES.map((ml, i) => {
    const done = i <= nivelIdx;
    return `
      <div class="milestone ${done?'done':'pending'}">
        <div class="milestone-icon">
          ${done
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`
            : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a9b2c2" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`
          }
        </div>
        <div class="milestone-t">${ml.t}</div>
        <div class="milestone-s">${ml.s}</div>
      </div>`;
  }).join('');

  const cursosHtml = CURSOS.map(c => {
    const done = cursosDone.includes(c);
    return `<div class="flex gap-8" style="align-items:center;">
      ${done
        ? `<span style="width:18px;height:18px;border-radius:50%;background:#1e5aa8;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg></span>`
        : `<span style="width:18px;height:18px;border-radius:50%;border:1.6px solid #d7dde6;flex-shrink:0;"></span>`
      }
      <span style="font-size:12.5px;color:#3d4860;">${c}</span>
    </div>`;
  }).join('');

  const apoyoHtml = APOYO.map(a => {
    const done = apoyoDone.includes(a);
    return `<div class="flex gap-8" style="align-items:center;">
      ${done
        ? `<span style="width:18px;height:18px;border-radius:50%;background:#9a5b2b;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg></span>`
        : `<span style="width:18px;height:18px;border-radius:50%;border:1.6px solid #d7dde6;flex-shrink:0;"></span>`
      }
      <span style="font-size:12.5px;color:#3d4860;">${a}</span>
    </div>`;
  }).join('');

  const donesHtml = dones.map(d => `<span class="tag" style="color:#6b4e9a;background:#f5f0fa;">${d}</span>`).join('');
  const TEMP_MAP = { M:'Melancólico', F:'Flemático', C:'Colérico', S:'Sanguíneo' };
  const tempsHtml = Object.entries(TEMP_MAP).map(([c,l]) => {
    const on = temps.includes(c);
    return `<span style="font-size:12.5px;font-weight:${on?'600':'500'};color:${on?'#fff':'#9aa5b5'};background:${on?'#1e5aa8':'#f3f5f9'};padding:5px 12px;border-radius:8px;">${l}</span>`;
  }).join('');

  container.innerHTML = `
  <div class="page-wrap fade-up">
    <button class="back-link" id="btn-back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
      Volver a Miembros
    </button>

    <div class="ficha-header">
      <div class="avatar lg" style="background:${color};">${iniciales(m.nombre)}</div>
      <div style="flex:1;min-width:0;">
        <div class="ficha-meta">
          <h3 style="font-size:23px;font-weight:700;letter-spacing:-.4px;">${m.nombre}</h3>
          <span class="role-badge ${rolClass(m.rol)}">${m.rol}</span>
        </div>
        <div class="ficha-info-row">
          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa5b5" stroke-width="1.8" stroke-linecap="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/></svg>${m.grupos?.nombre||'—'}</span>
          <span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa5b5" stroke-width="1.8" stroke-linecap="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${m.grupos?.sede||'—'}</span>
          <span style="font-family:'IBM Plex Mono',monospace;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa5b5" stroke-width="1.8" stroke-linecap="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg>${m.telefono||'—'}</span>
        </div>
      </div>
      <div class="ficha-actions">
        <button class="btn-secondary" onclick="window.navigate('nuevo',{editId:'${m.id}'})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>Editar
        </button>
        <button class="btn-danger" id="btn-delete">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>Eliminar
        </button>
      </div>
    </div>

    <div class="card lg mb-18">
      <div class="flex" style="align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <div><div style="font-size:16px;font-weight:700;">Ruta de crecimiento</div><div style="font-size:13px;color:#8a94a8;margin-top:2px;">Insignias desbloqueadas según su formación</div></div>
        <div class="flex gap-12" style="align-items:center;">
          <div style="width:170px;height:9px;background:#eef1f6;border-radius:6px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#1e5aa8,#4685d6);border-radius:6px;"></div></div>
          <span style="font-size:15px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:#1e5aa8;">${pct}%</span>
        </div>
      </div>
      <div class="milestone-grid">${msHtml}</div>
    </div>

    <div class="ficha-grid">
      <div class="flex-col gap-18">
        <div class="card lg">
          <div class="section-label">Datos personales</div>
          <div class="data-grid">
            <div><div class="data-label">Fecha de nacimiento</div><div class="data-value">${m.fecha_nacimiento || '—'} · ${m.edad || '—'} años</div></div>
            <div><div class="data-label">Estado civil</div><div class="data-value">${m.estado_civil || '—'}</div></div>
            <div><div class="data-label">N.º de hijos</div><div class="data-value">${m.nro_hijos ?? 0}</div></div>
            <div><div class="data-label">Edades de los hijos</div><div class="data-value">${m.edades_hijos || '—'}</div></div>
            <div><div class="data-label">Aniversario de bodas</div><div class="data-value">${m.aniversario || '—'}</div></div>
            <div><div class="data-label">Profesión</div><div class="data-value">${m.profesion || '—'}</div></div>
            <div><div class="data-label">Ocupación</div><div class="data-value">${m.ocupacion || '—'}</div></div>
            <div><div class="data-label">Tiempo en la iglesia</div><div class="data-value">${m.tiempo_iglesia || '—'}</div></div>
            <div class="span2"><div class="data-label">Correo electrónico</div><div class="data-value mono">${m.correo || '—'}</div></div>
            <div class="span2"><div class="data-label">Dirección</div><div class="data-value">${m.direccion || '—'}</div></div>
            <div><div class="data-label">Bautizado</div><div class="data-value" style="color:${m.bautizado?'#2f7d6b':'inherit'}">${m.bautizado ? 'Sí' : 'No'}</div></div>
          </div>
        </div>
        <div class="card lg">
          <div class="section-label">Discipulado</div>
          <div class="data-grid">
            <div><div class="data-label">Fecha de inicio</div><div class="data-value">${m.disc_inicio || '—'}</div></div>
            <div><div class="data-label">Fecha de culminación</div><div class="data-value">${m.disc_fin || 'En curso'}</div></div>
            <div class="span2"><div class="data-label">Padre / Madre espiritual</div><div class="data-value">${m.padre_esp || '—'}</div></div>
          </div>
        </div>
        <div class="card lg">
          <div class="section-label">Dones, habilidades y temperamento</div>
          <div style="margin-bottom:14px;"><div class="data-label" style="margin-bottom:6px;">Dones espirituales</div><div class="flex gap-8" style="flex-wrap:wrap;">${donesHtml || '—'}</div></div>
          <div style="margin-bottom:14px;"><div class="data-label" style="margin-bottom:4px;">Habilidades</div><div class="data-value">${m.habilidades || '—'}</div></div>
          <div><div class="data-label" style="margin-bottom:7px;">Temperamentos</div><div class="flex gap-8" style="flex-wrap:wrap;">${tempsHtml}</div></div>
        </div>
        <div class="card lg">
          <div class="section-label" style="color:#9a5b2b;">Mentor(es) y motivos de oración</div>
          <div style="margin-bottom:14px;"><div class="data-label">Mentor</div><div class="data-value">${m.mentor || '—'}</div></div>
          <div style="background:#f7f9fb;border:1px solid #eef1f6;border-radius:11px;padding:14px 16px;"><div class="data-label" style="margin-bottom:4px;">Motivos de oración</div><div style="font-size:13.5px;color:#3d4860;line-height:1.55;font-style:italic;">"${m.oracion || '—'}"</div></div>
        </div>
      </div>
      <div class="flex-col gap-18">
        <div class="card lg">
          <div class="flex" style="align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div class="section-label" style="margin-bottom:0;">Datos ministeriales</div>
            <span style="font-size:12px;font-weight:600;color:#56607a;background:#f3f5f9;padding:4px 10px;border-radius:20px;font-family:'IBM Plex Mono',monospace;">${cursosDone.length}/${CURSOS.length}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;">${cursosHtml}</div>
        </div>
        <div class="card lg">
          <div class="flex" style="align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div class="section-label" style="margin-bottom:0;color:#9a5b2b;">Grupos de apoyo</div>
            <span style="font-size:12px;font-weight:600;color:#56607a;background:#f3f5f9;padding:4px 10px;border-radius:20px;font-family:'IBM Plex Mono',monospace;">${apoyoDone.length}/${APOYO.length}</span>
          </div>
          <div class="flex-col gap-8">${apoyoHtml}</div>
        </div>
      </div>
    </div>
  </div>`;

  container.querySelector('#btn-back')?.addEventListener('click', () => navigate('miembros'));
  container.querySelector('#btn-delete')?.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar a ${m.nombre}? Esta acción no se puede deshacer.`)) return;
    await deleteMiembro(m.id);
    navigate('miembros');
  });
}
