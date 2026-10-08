import { getSeguimientos, createSeguimiento, updateSeguimiento, deleteSeguimiento, getMiembros, getEvaluaciones, updateEvaluacion } from '../db.js';
import { AREAS_RUEDA } from '../constants.js';
import { promedio } from '../rueda.js';
import { isAdmin, getCurrentGrupoId, getCurrentProfile } from '../main.js';
import { ESTADOS_SEGUIMIENTO } from '../constants.js';

const ESTADO_COLOR = { Programada: '#1e5aa8', Realizada: '#2f7d6b', Cancelada: '#9a3b52' };
const FILTROS = ['Programada', 'Realizada', 'Cancelada', 'Todas'];

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function iniciales(n) { return (n || '').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase(); }

const ICON_EDIT = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`;
const ICON_DEL = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a3b52" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;
const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2f7d6b" stroke-width="2.4" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`;

export async function renderSeguimiento(container, navigate) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;
  const grupoId = isAdmin() ? null : getCurrentGrupoId();
  let seguimientos, miembros;
  try {
    [seguimientos, miembros] = await Promise.all([getSeguimientos(grupoId), getMiembros(grupoId)]);
  } catch (e) {
    container.innerHTML = `<div class="card" style="color:#9a3b52;padding:24px;"><b>Error al cargar Seguimiento:</b><br><code style="font-size:12px;">${esc(e.message)}</code><br><br>Si acabas de crear la tabla "seguimientos" en Airtable, revisa que el nombre y los campos coincidan exactamente.</div>`;
    return;
  }
  let pendientes = [];
  async function cargarPendientes() {
    try { pendientes = (await getEvaluaciones(grupoId)).filter(e => e.estado === 'Pendiente' && e.fuente === 'Autoevaluación'); }
    catch { pendientes = []; }
  }
  await cargarPendientes();
  let editing = null; // null | 'new' | id
  let filtro = 'Programada';

  function miembroOptions(sel) {
    if (!miembros.length) return '<option value="">— No hay miembros en tu grupo —</option>';
    return miembros.map(m => `<option value="${esc(m.id)}" ${sel === m.id ? 'selected' : ''}>${esc(m.nombre)}</option>`).join('');
  }

  function formHtml(seg) {
    const f = seg || {};
    return `
    <div class="form-section" id="sg-form" style="margin-bottom:18px;">
      <div class="section-label">${f.id ? 'Editar cita de seguimiento' : 'Nueva cita de seguimiento'}</div>
      <div class="form-row">
        <div class="form-group span2"><label>Miembro *</label><select id="sg-miembro" ${f.id ? 'disabled' : ''}>${miembroOptions(f.miembro_id)}</select></div>
        <div class="form-group"><label>Fecha *</label><input id="sg-fecha" type="date" value="${esc(f.fecha)}" /></div>
        <div class="form-group"><label>Hora</label><input id="sg-hora" placeholder="Ej: 5:00 PM" value="${esc(f.hora)}" /></div>
        <div class="form-group"><label>Estado</label>
          <select id="sg-estado">${ESTADOS_SEGUIMIENTO.map(e => `<option value="${e}" ${(f.estado || 'Programada') === e ? 'selected' : ''}>${e}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Versículo(s)</label><input id="sg-versiculos" placeholder="Ej: Filipenses 4:13" value="${esc(f.versiculos)}" /></div>
        <div class="form-group span2"><label>Temas a tratar</label><textarea id="sg-temas" rows="2" placeholder="¿De qué van a hablar en esta cita?">${esc(f.temas)}</textarea></div>
        <div class="form-group span2"><label>Próximos pasos</label><textarea id="sg-pasos" rows="2" placeholder="Compromisos o tareas para la próxima cita">${esc(f.proximos_pasos)}</textarea></div>
        <div class="form-group span2"><label>Notas</label><textarea id="sg-notas" rows="2" placeholder="Notas después de la conversación...">${esc(f.notas)}</textarea></div>
      </div>
      <div id="sg-error" class="login-error hidden" style="margin-top:10px;"></div>
      <div class="form-actions" style="margin-top:14px;">
        <button class="btn-secondary" id="btn-cancel-sg">Cancelar</button>
        <button class="btn-primary" id="btn-save-sg">${f.id ? 'Guardar cambios' : 'Programar cita'}</button>
      </div>
    </div>`;
  }

  function render() {
    const list = filtro === 'Todas' ? seguimientos : seguimientos.filter(s => s.estado === filtro);

    const tabs = FILTROS.map(f => `
      <div class="report-tab${filtro === f ? ' active' : ''}" data-filtro="${f}">
        <div class="report-tab-dot" style="background:${ESTADO_COLOR[f] || '#8a94a8'};"></div>${f}
      </div>`).join('');

    const rows = list.map(s => {
      const d = s.fecha ? new Date(`${s.fecha}T00:00:00`) : null;
      const color = ESTADO_COLOR[s.estado] || '#8a94a8';
      return `
      <div style="display:flex;gap:14px;align-items:flex-start;padding:14px;background:#f5f7fb;border-radius:12px;margin-bottom:10px;">
        <div class="cal-ev-day" style="flex-shrink:0;">
          <div class="day-num">${d ? d.getDate() : '—'}</div>
          <div class="day-mon">${d ? d.toLocaleString('es', { month: 'short' }) : ''}</div>
        </div>
        <div class="avatar sm" style="background:#1e5aa8;flex-shrink:0;">${esc(iniciales(s.miembro_nombre))}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:700;color:#14223a;">${esc(s.miembro_nombre) || '—'}</span>
            <span style="font-size:10.5px;font-weight:700;color:#fff;background:${color};padding:2px 9px;border-radius:20px;">${esc(s.estado)}</span>
            ${s.hora ? `<span style="font-size:12px;color:#8a94a8;">${esc(s.hora)}</span>` : ''}
          </div>
          ${s.temas ? `<div style="font-size:13px;color:#3d4860;margin-top:5px;white-space:pre-wrap;">${esc(s.temas)}</div>` : ''}
          ${s.versiculos ? `<div style="font-size:12px;color:#6b4e9a;margin-top:4px;font-style:italic;">📖 ${esc(s.versiculos)}</div>` : ''}
          ${s.proximos_pasos ? `<div style="font-size:12.5px;color:#3d4860;margin-top:6px;white-space:pre-wrap;"><b style="color:#1e5aa8;">Próximos pasos:</b> ${esc(s.proximos_pasos)}</div>` : ''}
          ${s.notas ? `<div style="font-size:12.5px;color:#56607a;margin-top:4px;white-space:pre-wrap;"><b style="color:#2f7d6b;">Notas:</b> ${esc(s.notas)}</div>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          ${s.estado === 'Programada' ? `<button class="btn-icon btn-check-sg" data-id="${esc(s.id)}" title="Marcar como realizada">${ICON_CHECK}</button>` : ''}
          <button class="btn-icon btn-edit-sg" data-id="${esc(s.id)}" title="Editar" style="color:#56607a;">${ICON_EDIT}</button>
          <button class="btn-icon btn-del-sg" data-id="${esc(s.id)}" title="Eliminar">${ICON_DEL}</button>
        </div>
      </div>`;
    }).join('') || '<div class="empty-state">Sin citas de seguimiento en este filtro</div>';

    const segEditando = editing && editing !== 'new' ? seguimientos.find(s => s.id === editing) : null;

    container.innerHTML = `
    <div class="page-wrap fade-up">
      <div class="flex mb-18" style="align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
        <div class="flex gap-8" style="flex-wrap:wrap;">${tabs}</div>
        ${!editing ? `<button class="btn-primary sm" id="btn-nueva-cita">+ Nueva cita de seguimiento</button>` : ''}
      </div>
      ${pendientes.length ? `
      <div class="form-section" style="margin-bottom:18px;border-color:#e6c98a;">
        <div class="section-label" style="color:#b9892b;">Autoevaluaciones por aprobar (${pendientes.length})</div>
        ${pendientes.map(p => `
          <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid #eef1f6;flex-wrap:wrap;">
            <div style="flex:1;min-width:220px;">
              <div style="font-weight:700;color:#14223a;">${esc(p.miembro_nombre)} <span style="font-weight:500;color:#8a94a8;font-size:12px;">· ${esc(p.fecha)} · Prom. ${promedio(p.valores) ?? '—'}</span></div>
              <div style="font-size:12px;color:#56607a;margin-top:4px;">${AREAS_RUEDA.map(a => `${a.label}: <b>${p.valores[a.key] ?? '—'}</b>`).join(' · ')}</div>
              ${p.comentario ? `<div style="font-size:12.5px;color:#56607a;margin-top:4px;font-style:italic;white-space:pre-wrap;">${esc(p.comentario)}</div>` : ''}
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn-primary sm btn-aprobar-eval" data-id="${esc(p.id)}">Aprobar</button>
              <button class="btn-secondary btn-rechazar-eval" data-id="${esc(p.id)}">Rechazar</button>
              <button class="btn-secondary btn-ver-ficha" data-id="${esc(p.miembro_id)}">Ver ficha</button>
            </div>
          </div>`).join('')}
      </div>` : ''}
      ${editing === 'new' ? formHtml(null) : ''}
      ${segEditando ? formHtml(segEditando) : ''}
      ${rows}
    </div>`;

    container.querySelectorAll('.report-tab').forEach(tab => {
      tab.addEventListener('click', () => { filtro = tab.dataset.filtro; render(); });
    });

    container.querySelectorAll('.btn-aprobar-eval, .btn-rechazar-eval').forEach(btn => {
      btn.addEventListener('click', async () => {
        const aprobar = btn.classList.contains('btn-aprobar-eval');
        if (!aprobar && !confirm('¿Rechazar esta autoevaluación?')) return;
        btn.disabled = true;
        await updateEvaluacion(btn.dataset.id, { estado: aprobar ? 'Aprobada' : 'Rechazada' });
        await cargarPendientes();
        render();
      });
    });
    container.querySelectorAll('.btn-ver-ficha').forEach(btn => {
      btn.addEventListener('click', () => navigate('ficha', { id: btn.dataset.id }));
    });

    container.querySelector('#btn-nueva-cita')?.addEventListener('click', () => { editing = 'new'; render(); });
    container.querySelector('#btn-cancel-sg')?.addEventListener('click', () => { editing = null; render(); });

    container.querySelectorAll('.btn-edit-sg').forEach(btn => {
      btn.addEventListener('click', () => { editing = btn.dataset.id; render(); });
    });

    container.querySelectorAll('.btn-del-sg').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta cita de seguimiento?')) return;
        await deleteSeguimiento(btn.dataset.id);
        seguimientos = await getSeguimientos(grupoId);
        render();
      });
    });

    container.querySelectorAll('.btn-check-sg').forEach(btn => {
      btn.addEventListener('click', async () => {
        await updateSeguimiento(btn.dataset.id, { estado: 'Realizada' });
        seguimientos = await getSeguimientos(grupoId);
        render();
      });
    });

    container.querySelector('#btn-save-sg')?.addEventListener('click', async () => {
      const errEl = container.querySelector('#sg-error');
      const fecha = container.querySelector('#sg-fecha').value;
      const btn = container.querySelector('#btn-save-sg');
      const fields = {
        fecha,
        hora: container.querySelector('#sg-hora').value,
        estado: container.querySelector('#sg-estado').value,
        versiculos: container.querySelector('#sg-versiculos').value,
        temas: container.querySelector('#sg-temas').value,
        proximos_pasos: container.querySelector('#sg-pasos').value,
        notas: container.querySelector('#sg-notas').value,
      };
      if (!fecha) { errEl.textContent = 'La fecha es requerida.'; errEl.classList.remove('hidden'); return; }
      btn.textContent = 'Guardando...'; btn.disabled = true;
      try {
        if (editing === 'new') {
          const miembroId = container.querySelector('#sg-miembro').value;
          const miembro = miembros.find(m => m.id === miembroId);
          if (!miembro) { errEl.textContent = 'Selecciona un miembro.'; errEl.classList.remove('hidden'); btn.textContent = 'Programar cita'; btn.disabled = false; return; }
          const perfil = getCurrentProfile();
          await createSeguimiento({
            ...fields,
            miembro_id: miembro.id,
            miembro_nombre: miembro.nombre,
            grupo_id: miembro.grupo_id,
            lider_nombre: perfil?.nombre || '',
          });
        } else {
          await updateSeguimiento(editing, fields);
        }
        editing = null;
        seguimientos = await getSeguimientos(grupoId);
        render();
      } catch (e) {
        errEl.textContent = e.message;
        errEl.classList.remove('hidden');
        btn.textContent = editing === 'new' ? 'Programar cita' : 'Guardar cambios';
        btn.disabled = false;
      }
    });
  }

  render();
}
