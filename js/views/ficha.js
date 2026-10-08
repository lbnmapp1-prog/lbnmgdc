import { getMiembro, deleteMiembro, getEvaluaciones, createEvaluacion, deleteEvaluacion } from '../db.js';
import { isAdmin, getCurrentGrupoId, getCurrentProfile } from '../main.js';
import { MILESTONES, CURSOS, APOYO, AREAS_RUEDA } from '../constants.js';
import { ruedaSvg, promedio, snapshot, progresoArea } from '../rueda.js';

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
        <button class="btn-secondary" id="btn-editar-miembro">
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

    <div class="card lg mb-18" id="rueda-card"></div>

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

  renderRueda(container.querySelector('#rueda-card'), m);

  container.querySelector('#btn-back')?.addEventListener('click', () => navigate('miembros'));
  container.querySelector('#btn-editar-miembro')?.addEventListener('click', () => navigate('nuevo', { editId: m.id }));
  container.querySelector('#btn-delete')?.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar a ${m.nombre}? Esta acción no se puede deshacer.`)) return;
    await deleteMiembro(m.id);
    navigate('miembros');
  });
}

// ===== RUEDA DE VIDA =====
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function renderRueda(card, m) {
  card.innerHTML = `<div class="spinner">Cargando rueda de vida...</div>`;
  let evals = [];
  let loadError = '';
  try { evals = await getEvaluaciones(null, m.id); } catch (e) { loadError = e.message; }

  let showForm = false;

  function draw() {
    const auto = evals.filter(e => e.estado === 'Aprobada' && e.fuente === 'Autoevaluación');
    const actual = snapshot(evals, 0);
    const previa = snapshot(evals, 1);
    const autoActual = auto[0];
    const pendientes = evals.filter(e => e.estado === 'Pendiente').length;

    const series = [];
    if (previa) series.push({ valores: previa.valores, color: '#9aa5b5', dashed: true });
    if (autoActual) series.push({ valores: autoActual.valores, color: '#9a5b2b' });
    if (actual) series.push({ valores: actual.valores, color: '#1e5aa8' });

    const legend = [
      actual && `<span><i style="background:#1e5aa8"></i>Líder · ${esc(actual.fecha)}</span>`,
      autoActual && `<span><i style="background:#9a5b2b"></i>Autoevaluación · ${esc(autoActual.fecha)}</span>`,
      previa && `<span><i style="background:#9aa5b5"></i>Evaluación anterior · ${esc(previa.fecha)}</span>`,
    ].filter(Boolean).join('');

    const cambios = actual && previa ? AREAS_RUEDA.map(a => {
      if (actual.valores[a.key] == null || previa.valores[a.key] == null) return '';
      const d = actual.valores[a.key] - previa.valores[a.key];
      if (!d) return '';
      return `<span style="font-size:12px;font-weight:600;padding:3px 9px;border-radius:20px;background:${d > 0 ? '#eef6f3' : '#fbeef1'};color:${d > 0 ? '#2f7d6b' : '#9a3b52'};">${a.label} ${d > 0 ? '+' : ''}${d}</span>`;
    }).join('') : '';

    const progreso = actual ? AREAS_RUEDA.map(a => {
      const p = progresoArea(evals, a.key);
      if (!p) return '';
      const d = p.actual - p.inicio;
      return `<div style="background:#f7f9fb;border:1px solid #eef1f6;border-radius:10px;padding:8px 12px;">
        <div style="font-size:11.5px;color:#8a94a8;font-weight:600;">${a.label}</div>
        <div style="font-size:14px;font-weight:700;color:#14223a;">${p.inicio} → ${p.actual} <span style="font-size:12px;color:${d > 0 ? '#2f7d6b' : d < 0 ? '#9a3b52' : '#8a94a8'};">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${d > 0 ? '+' : ''}${d}</span></div>
        <div style="font-size:11px;color:#a9b2c2;">${p.n} registro(s)</div>
      </div>`;
    }).join('') : '';

    const historial = evals.map(e => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #eef1f6;font-size:13px;flex-wrap:wrap;">
        <span style="font-family:'IBM Plex Mono',monospace;color:#56607a;">${esc(e.fecha)}</span>
        <span>${esc(e.fuente)}${AREAS_RUEDA.filter(a => e.valores[a.key] != null).length === 1 ? ` · ${esc(AREAS_RUEDA.find(a => e.valores[a.key] != null).label)}` : ''}</span>
        <span style="font-size:11px;font-weight:700;color:#fff;background:${e.estado === 'Aprobada' ? '#2f7d6b' : e.estado === 'Pendiente' ? '#b9892b' : '#9a3b52'};padding:2px 8px;border-radius:20px;">${esc(e.estado)}</span>
        <span style="color:#8a94a8;">Prom. ${promedio(e.valores) ?? '—'}</span>
        ${e.comentario ? `<span style="color:#56607a;font-style:italic;flex-basis:100%;white-space:pre-wrap;">${esc(e.comentario)}</span>` : ''}
        <button class="btn-icon btn-del-eval" data-id="${esc(e.id)}" title="Eliminar evaluación" style="margin-left:auto;color:#9a3b52;">✕</button>
      </div>`).join('');

    card.innerHTML = `
      <div class="flex" style="align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:16px;font-weight:700;">Rueda de vida</div>
          <div style="font-size:13px;color:#8a94a8;margin-top:2px;">Evaluación de 9 áreas del 1 al 10${pendientes ? ` · <b style="color:#b9892b;">${pendientes} pendiente(s) de aprobar en Seguimiento</b>` : ''}</div>
        </div>
        <div class="flex gap-8" style="flex-wrap:wrap;">
          <button class="btn-secondary" id="btn-copy-link">Copiar enlace para el miembro</button>
          ${showForm ? '' : '<button class="btn-primary sm" id="btn-nueva-eval">+ Nueva evaluación</button>'}
        </div>
      </div>
      ${loadError ? `<div class="login-error" style="margin-bottom:12px;">No se pudo cargar: ${esc(loadError)}</div>` : ''}
      ${showForm ? formHtml() : ''}
      ${series.length ? `
        <div style="display:flex;justify-content:center;">${ruedaSvg(series)}</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;font-size:12.5px;color:#56607a;margin-top:6px;">${legend}</div>
        ${cambios ? `<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:12px;">${cambios}</div>` : ''}
        ${progreso ? `<div class="section-label" style="margin-top:20px;">Avance por área (primer registro → actual)</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;">${progreso}</div>` : ''}`
        : `<div class="empty-state">Aún no hay evaluaciones aprobadas. Crea una o envía el enlace al miembro.</div>`}
      ${evals.length ? `<div style="margin-top:16px;">${historial}</div>` : ''}
      <style>#rueda-card i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;}</style>`;

    card.querySelector('#btn-nueva-eval')?.addEventListener('click', () => { showForm = true; draw(); });
    card.querySelector('#btn-cancel-eval')?.addEventListener('click', () => { showForm = false; draw(); });
    card.querySelectorAll('.btn-del-eval').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta evaluación?')) return;
      await deleteEvaluacion(b.dataset.id);
      evals = evals.filter(e => e.id !== b.dataset.id);
      draw();
    }));
    card.querySelector('#btn-copy-link')?.addEventListener('click', async (ev) => {
      const link = `${location.origin}/evaluar.html?m=${m.id}`;
      try { await navigator.clipboard.writeText(link); ev.target.textContent = '¡Enlace copiado!'; }
      catch { prompt('Copia este enlace y envíaselo al miembro:', link); }
    });
    card.querySelectorAll('input[type=range]').forEach(inp => {
      inp.addEventListener('input', () => { card.querySelector(`#rv-${inp.dataset.k}`).textContent = inp.value; });
    });
    card.querySelector('#btn-save-eval')?.addEventListener('click', async (ev) => {
      const errEl = card.querySelector('#eval-error');
      const valores = {};
      card.querySelectorAll('input[type=range]').forEach(i => { valores[i.dataset.k] = Number(i.value); });
      const fecha = card.querySelector('#eval-fecha').value;
      if (!fecha) { errEl.textContent = 'La fecha es requerida.'; errEl.classList.remove('hidden'); return; }
      ev.target.disabled = true; ev.target.textContent = 'Guardando...';
      try {
        const nueva = await createEvaluacion({
          miembro_id: m.id, miembro_nombre: m.nombre, grupo_id: m.grupo_id,
          fecha, fuente: 'Líder', estado: 'Aprobada', valores,
          comentario: card.querySelector('#eval-comentario').value,
          lider_nombre: getCurrentProfile()?.nombre || '',
        });
        evals = [nueva, ...evals].sort((a, b) => b.fecha.localeCompare(a.fecha));
        showForm = false; draw();
      } catch (e) {
        errEl.textContent = e.message; errEl.classList.remove('hidden');
        ev.target.disabled = false; ev.target.textContent = 'Guardar evaluación';
      }
    });
  }

  function formHtml() {
    const base = snapshot(evals, 0);
    const hoy = new Date().toISOString().slice(0, 10);
    return `
    <div class="form-section" style="margin-bottom:18px;">
      <div class="section-label">Nueva evaluación (líder)</div>
      <div class="form-row">
        <div class="form-group"><label>Fecha *</label><input id="eval-fecha" type="date" value="${hoy}" /></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px 22px;margin-top:8px;">
        ${AREAS_RUEDA.map(a => {
          const v = base?.valores[a.key] ?? 5;
          return `<div>
            <div class="flex" style="justify-content:space-between;font-size:13px;font-weight:600;color:#3d4860;"><span>${a.label}</span><span id="rv-${a.key}" style="color:#1e5aa8;">${v}</span></div>
            <input type="range" min="1" max="10" step="1" value="${v}" data-k="${a.key}" style="width:100%;accent-color:#1e5aa8;" />
          </div>`;
        }).join('')}
      </div>
      <div class="form-group" style="margin-top:12px;"><label>Comentario / observaciones</label><textarea id="eval-comentario" rows="2" placeholder="Qué se habló, qué área trabajar primero..."></textarea></div>
      <div id="eval-error" class="login-error hidden" style="margin-top:10px;"></div>
      <div class="form-actions" style="margin-top:14px;">
        <button class="btn-secondary" id="btn-cancel-eval">Cancelar</button>
        <button class="btn-primary" id="btn-save-eval">Guardar evaluación</button>
      </div>
    </div>`;
  }

  draw();
}
