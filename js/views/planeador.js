import { supabase } from '../supabase.js';
import { getGrupos } from '../db.js';
import { isAdmin, getCurrentGrupoId } from '../main.js';

function fmtDate(d) { if (!d) return '—'; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; }

const ACTIVIDADES = [
  { key: 'refrigerio',  label: 'Tiempo de refrigerio', tiempo: '15 min', fase: 'COMPARTIR' },
  { key: 'dinamicas',   label: 'Dinámicas',             tiempo: '15 min', fase: 'COMPARTIR' },
  { key: 'adoracion',   label: 'Adoración y oración',   tiempo: '20 min', fase: 'ORAR' },
  { key: 'tema',        label: 'Desarrollo del tema',   tiempo: '50 min', fase: 'CONVERSAR' },
  { key: 'reflexion',   label: 'Reflexión y oración de cierre', tiempo: '10 min', fase: 'CONVERSAR' },
  { key: 'anuncios',    label: 'Anuncios y ofrendas',   tiempo: '5 min',  fase: 'CONVERSAR' },
];

async function getPlaneadores() {
  const q = supabase.from('planeador').select('*').order('created_at', { ascending: false });
  if (!isAdmin()) q.eq('grupo_id', getCurrentGrupoId());
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

async function getReuniones(planeadorId) {
  const { data, error } = await supabase.from('planeador_reuniones').select('*').eq('planeador_id', planeadorId).order('id');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function renderPlaneador(container, navigate) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;
  const [planes, grupos] = await Promise.all([getPlaneadores(), getGrupos()]);

  container.innerHTML = `
    <div class="view-header">
      <div></div>
      <button class="btn-primary" id="btn-nuevo-plan">+ Nuevo planeador</button>
    </div>
    <div id="planes-list">
      ${planes.length === 0 ? `<div class="empty-state">No hay planeadores creados aún.</div>` :
        planes.map(p => `
          <div class="card-row" style="cursor:pointer;" data-id="${p.id}">
            <div class="card-row-main">
              <div class="card-row-title">${p.area||'—'} · ${p.mes||'—'}</div>
              <div class="card-row-sub">Líder: ${p.lider||'—'} · Pastor: ${p.pastor||'—'} · Material: ${p.material||'—'}</div>
            </div>
          </div>`).join('')
      }
    </div>
    <div id="plan-form-wrap" class="hidden"></div>`;

  container.querySelectorAll('.card-row[data-id]').forEach(row => {
    row.addEventListener('click', () => openPlan(container, row.dataset.id, grupos, navigate));
  });
  container.querySelector('#btn-nuevo-plan').addEventListener('click', () => {
    openPlan(container, null, grupos, navigate);
  });
}

async function openPlan(container, id, grupos, navigate) {
  const wrap = container.querySelector('#plan-form-wrap');
  const list = container.querySelector('#planes-list');
  const header = container.querySelector('.view-header');
  list.classList.add('hidden');
  header.classList.add('hidden');
  wrap.classList.remove('hidden');

  let plan = null;
  let reuniones = [{},{},{},{}];
  if (id) {
    const { data } = await supabase.from('planeador').select('*').eq('id', id).single();
    plan = data;
    const rs = await getReuniones(id);
    if (rs.length > 0) reuniones = [...rs, ...Array(Math.max(0,4-rs.length)).fill({})].slice(0,4);
  }

  const p = plan || {};
  const grupoActual = isAdmin() ? (p.grupo_id||'') : getCurrentGrupoId();
  const grupoOpts = grupos.map(g => `<option value="${g.id}" ${g.id===grupoActual?'selected':''}>${g.nombre}</option>`).join('');

  const reunionCard = (r, idx) => `
    <div class="plan-reunion-card" data-ri="${idx}" style="background:#f8f9fb;border:1px solid #e3e8f0;border-radius:12px;padding:16px;margin-bottom:12px;">
      <div class="form-section-title" style="margin-bottom:12px;">Reunión ${idx+1}</div>
      <div class="form-grid-2">
        <div class="field-group">
          <label class="field-label">Fase</label>
          <input class="field-input" data-f="fase" value="${r.fase||''}" placeholder="Ej: Madurez, Evangelismo..." />
        </div>
        <div class="field-group">
          <label class="field-label">Fecha</label>
          <input class="field-input" data-f="fecha" type="date" value="${r.fecha||''}" />
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;">
        <thead>
          <tr style="background:#eef1f6;">
            <th style="padding:6px 8px;text-align:left;border-radius:6px 0 0 6px;">Actividad</th>
            <th style="padding:6px 8px;text-align:left;">Responsable</th>
            <th style="padding:6px 8px;text-align:left;border-radius:0 6px 6px 0;">Observación</th>
          </tr>
        </thead>
        <tbody>
          ${ACTIVIDADES.map(a => `
            <tr>
              <td style="padding:5px 8px;color:#3d4860;font-weight:500;">${a.label} <span style="color:#9aa5b5;font-size:11px;">(${a.tiempo})</span></td>
              <td style="padding:4px 6px;"><input class="field-input" style="padding:5px 8px;font-size:12.5px;" data-f="${a.key}_resp" value="${r[a.key+'_resp']||''}" placeholder="Responsable" /></td>
              <td style="padding:4px 6px;"><input class="field-input" style="padding:5px 8px;font-size:12.5px;" data-f="${a.key}_obs" value="${r[a.key+'_obs']||''}" placeholder="Observación" /></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  wrap.innerHTML = `
    <div class="form-section">
      <div class="form-section-title">${id ? 'Editar planeador' : 'Nuevo planeador mensual'}</div>
      <div class="form-grid-2">
        <div class="field-group">
          <label class="field-label">Grupo de Cuidado</label>
          <select class="field-input" id="pl-grupo">${grupoOpts}</select>
        </div>
        <div class="field-group">
          <label class="field-label">Área</label>
          <input class="field-input" id="pl-area" value="${p.area||''}" placeholder="Área" />
        </div>
        <div class="field-group">
          <label class="field-label">Líder</label>
          <input class="field-input" id="pl-lider" value="${p.lider||''}" placeholder="Nombre del líder" />
        </div>
        <div class="field-group">
          <label class="field-label">Pastor</label>
          <input class="field-input" id="pl-pastor" value="${p.pastor||''}" placeholder="Pastor de área" />
        </div>
        <div class="field-group">
          <label class="field-label">Mes</label>
          <input class="field-input" id="pl-mes" value="${p.mes||''}" placeholder="Ej: Noviembre 2026" />
        </div>
        <div class="field-group">
          <label class="field-label">Material a desarrollar</label>
          <input class="field-input" id="pl-material" value="${p.material||''}" placeholder="Tema o material" />
        </div>
        <div class="field-group" style="grid-column:1/-1;">
          <label class="field-label">Equipo base</label>
          <input class="field-input" id="pl-equipo" value="${p.equipo_base||''}" placeholder="Integrantes del equipo base" />
        </div>
      </div>

      <div class="form-section-title" style="margin-top:24px;">Reuniones del mes</div>
      <div id="reuniones-wrap">
        ${reuniones.map((r,i) => reunionCard(r,i)).join('')}
      </div>

      <div id="pl-error" class="login-error hidden" style="margin-top:12px;"></div>
      <div class="form-actions">
        <button class="btn-secondary" id="btn-cancel-pl">Cancelar</button>
        ${id ? `<button class="btn-danger" id="btn-delete-pl">Eliminar</button>` : ''}
        <button class="btn-primary" id="btn-save-pl">Guardar</button>
      </div>
    </div>`;

  wrap.querySelector('#btn-cancel-pl').addEventListener('click', () => {
    wrap.classList.add('hidden');
    list.classList.remove('hidden');
    header.classList.remove('hidden');
  });

  if (id) {
    wrap.querySelector('#btn-delete-pl').addEventListener('click', async () => {
      if (!confirm('¿Eliminar este planeador?')) return;
      await supabase.from('planeador').delete().eq('id', id);
      await renderPlaneador(container, navigate);
    });
  }

  wrap.querySelector('#btn-save-pl').addEventListener('click', async () => {
    const errEl = wrap.querySelector('#pl-error');
    errEl.classList.add('hidden');
    const grupoId = wrap.querySelector('#pl-grupo').value;
    const payload = {
      grupo_id: grupoId||null,
      area: wrap.querySelector('#pl-area').value.trim(),
      lider: wrap.querySelector('#pl-lider').value.trim(),
      pastor: wrap.querySelector('#pl-pastor').value.trim(),
      mes: wrap.querySelector('#pl-mes').value.trim(),
      material: wrap.querySelector('#pl-material').value.trim(),
      equipo_base: wrap.querySelector('#pl-equipo').value.trim(),
    };
    const reunCards = wrap.querySelectorAll('.plan-reunion-card');
    const reunData = Array.from(reunCards).map(card => {
      const r = {};
      card.querySelectorAll('[data-f]').forEach(inp => { r[inp.dataset.f] = inp.value.trim()||null; });
      return r;
    });
    try {
      let planId = id;
      if (id) {
        const { error } = await supabase.from('planeador').update(payload).eq('id', id);
        if (error) throw new Error(error.message);
        await supabase.from('planeador_reuniones').delete().eq('planeador_id', id);
      } else {
        const { data, error } = await supabase.from('planeador').insert(payload).select().single();
        if (error) throw new Error(error.message);
        planId = data.id;
      }
      const { error: rErr } = await supabase.from('planeador_reuniones').insert(reunData.map(r=>({...r, planeador_id: planId})));
      if (rErr) throw new Error(rErr.message);
      await renderPlaneador(container, navigate);
    } catch(e) {
      errEl.textContent = e.message;
      errEl.classList.remove('hidden');
    }
  });
}
