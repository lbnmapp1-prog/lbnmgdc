import { supabase } from '../supabase.js';
import { getGrupos } from '../db.js';
import { isAdmin, getCurrentGrupoId, getCurrentProfile } from '../main.js';

function fmt(n) { return Number(n||0).toLocaleString('es-CO', { minimumFractionDigits:0 }); }
function fmtDate(d) { if (!d) return '—'; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; }

async function getOfrendas() {
  const q = supabase.from('ofrendas').select('*').order('fecha', { ascending: false });
  if (!isAdmin()) q.eq('grupo_id', getCurrentGrupoId());
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

async function getItems(ofrendaId) {
  const { data, error } = await supabase.from('ofrenda_items').select('*').eq('ofrenda_id', ofrendaId).order('id');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function renderOfrendas(container, navigate) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;
  const [ofrendas, grupos] = await Promise.all([getOfrendas(), getGrupos()]);

  container.innerHTML = `
    <div class="view-header">
      <div></div>
      <button class="btn-primary" id="btn-nueva-ofrenda">+ Nueva ofrenda</button>
    </div>
    <div id="ofrendas-list">
      ${ofrendas.length === 0 ? `<div class="empty-state">No hay registros de ofrendas aún.</div>` :
        ofrendas.map(o => `
          <div class="card-row" style="cursor:pointer;" data-id="${o.id}">
            <div class="card-row-main">
              <div class="card-row-title">${o.grupo_nombre || '—'} · ${fmtDate(o.fecha)}</div>
              <div class="card-row-sub">Encargado: ${o.encargado||'—'} · Miembros: ${o.nro_miembros||0} · Total: $${fmt(o.total_ofrenda)}</div>
            </div>
            <div class="card-row-meta">
              <span class="tag">${o.pastor||'—'}</span>
            </div>
          </div>`).join('')
      }
    </div>
    <div id="ofrenda-form-wrap" class="hidden"></div>`;

  container.querySelectorAll('.card-row[data-id]').forEach(row => {
    row.addEventListener('click', () => openOfrenda(container, row.dataset.id, grupos, navigate));
  });

  container.querySelector('#btn-nueva-ofrenda').addEventListener('click', () => {
    openOfrenda(container, null, grupos, navigate);
  });
}

async function openOfrenda(container, id, grupos, navigate) {
  const wrap = container.querySelector('#ofrenda-form-wrap');
  const list = container.querySelector('#ofrendas-list');
  const header = container.querySelector('.view-header');
  list.classList.add('hidden');
  header.classList.add('hidden');
  wrap.classList.remove('hidden');

  let ofrenda = null;
  let items = [];
  if (id) {
    const { data } = await supabase.from('ofrendas').select('*').eq('id', id).single();
    ofrenda = data;
    items = await getItems(id);
  }

  const o = ofrenda || {};
  const grupoActual = isAdmin() ? (o.grupo_id||'') : getCurrentGrupoId();
  const grupoOpts = grupos.map(g => `<option value="${g.id}" ${g.id===grupoActual?'selected':''}>${g.nombre}</option>`).join('');

  const renderItems = (its) => its.map((it,i) => `
    <div class="ofrenda-item-row flex gap-8" data-i="${i}" style="align-items:flex-start;margin-bottom:8px;">
      <input class="field-input" style="flex:2;" placeholder="Nombre del miembro" value="${it.miembro_nombre||''}" data-f="miembro_nombre" />
      <input class="field-input" style="flex:1;" placeholder="Monto" type="number" value="${it.monto||''}" data-f="monto" />
      <input class="field-input" style="flex:1;" placeholder="Nro. transferencia" value="${it.nro_transferencia||''}" data-f="nro_transferencia" />
      <input class="field-input" style="flex:1;" type="date" value="${it.fecha||''}" data-f="fecha" />
      <button class="btn-icon btn-remove-item" data-i="${i}" title="Eliminar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a3b52" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
      </button>
    </div>`).join('');

  wrap.innerHTML = `
    <div class="form-section">
      <div class="form-section-title">${id ? 'Editar ofrenda' : 'Nueva ofrenda'}</div>

      <div class="form-grid-2">
        <div class="field-group">
          <label class="field-label">Grupo de Cuidado</label>
          <select class="field-input" id="of-grupo">${grupoOpts}</select>
        </div>
        <div class="field-group">
          <label class="field-label">Fecha</label>
          <input class="field-input" id="of-fecha" type="date" value="${o.fecha||new Date().toISOString().slice(0,10)}" />
        </div>
        <div class="field-group">
          <label class="field-label">Líder GDC</label>
          <input class="field-input" id="of-lider" value="${o.lider_nombre||''}" placeholder="Nombre del líder" />
        </div>
        <div class="field-group">
          <label class="field-label">Encargado</label>
          <input class="field-input" id="of-encargado" value="${o.encargado||''}" placeholder="Encargado del área" />
        </div>
        <div class="field-group">
          <label class="field-label">Pastor</label>
          <input class="field-input" id="of-pastor" value="${o.pastor||''}" placeholder="Pastor de área" />
        </div>
        <div class="field-group">
          <label class="field-label">Nro. de miembros</label>
          <input class="field-input" id="of-nro" type="number" value="${o.nro_miembros||0}" min="0" />
        </div>
        <div class="field-group">
          <label class="field-label">Aporte líder GDC ($)</label>
          <input class="field-input" id="of-aporte-lider" type="number" value="${o.aporte_lider||0}" min="0" step="100" />
        </div>
        <div class="field-group">
          <label class="field-label">Fecha entrega al líder</label>
          <input class="field-input" id="of-fecha-lider" type="date" value="${o.fecha_entrega_lider||''}" />
        </div>
        <div class="field-group">
          <label class="field-label">Fecha envío al encargado del área</label>
          <input class="field-input" id="of-fecha-area" type="date" value="${o.fecha_envio_area||''}" />
        </div>
      </div>

      <div class="form-section-title" style="margin-top:24px;">Detalle por miembro</div>
      <div id="items-wrap">${renderItems(items)}</div>
      <button class="btn-secondary" id="btn-add-item" style="margin-top:8px;">+ Agregar miembro</button>

      <div class="form-section-title" style="margin-top:16px;">
        Total ofrenda: <span id="total-display" style="color:#1e5aa8;">$${fmt(o.total_ofrenda||0)}</span>
      </div>

      <div id="of-error" class="login-error hidden" style="margin-top:12px;"></div>
      <div class="form-actions">
        <button class="btn-secondary" id="btn-cancel-of">Cancelar</button>
        ${id ? `<button class="btn-danger" id="btn-delete-of">Eliminar</button>` : ''}
        <button class="btn-primary" id="btn-save-of">Guardar</button>
      </div>
    </div>`;

  const itemsWrap = wrap.querySelector('#items-wrap');
  const totalDisplay = wrap.querySelector('#total-display');

  function calcTotal() {
    const rows = itemsWrap.querySelectorAll('.ofrenda-item-row');
    let sum = 0;
    rows.forEach(r => { sum += Number(r.querySelector('[data-f="monto"]').value)||0; });
    const aporte = Number(wrap.querySelector('#of-aporte-lider').value)||0;
    sum += aporte;
    totalDisplay.textContent = `$${fmt(sum)}`;
    return sum;
  }

  wrap.querySelector('#of-aporte-lider').addEventListener('input', calcTotal);
  itemsWrap.addEventListener('input', calcTotal);

  wrap.querySelector('#btn-add-item').addEventListener('click', () => {
    const div = document.createElement('div');
    div.innerHTML = renderItems([{}]);
    itemsWrap.appendChild(div.firstElementChild);
    itemsWrap.addEventListener('input', calcTotal);
    bindRemove();
  });

  function bindRemove() {
    itemsWrap.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.onclick = () => { btn.closest('.ofrenda-item-row').remove(); calcTotal(); };
    });
  }
  bindRemove();

  wrap.querySelector('#btn-cancel-of').addEventListener('click', () => {
    wrap.classList.add('hidden');
    list.classList.remove('hidden');
    header.classList.remove('hidden');
  });

  if (id) {
    wrap.querySelector('#btn-delete-of').addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta ofrenda?')) return;
      await supabase.from('ofrendas').delete().eq('id', id);
      await renderOfrendas(container, navigate);
    });
  }

  wrap.querySelector('#btn-save-of').addEventListener('click', async () => {
    const errEl = wrap.querySelector('#of-error');
    errEl.classList.add('hidden');
    const grupoId = wrap.querySelector('#of-grupo').value;
    const grupoNombre = grupos.find(g=>g.id===grupoId)?.nombre||'';
    const rows = itemsWrap.querySelectorAll('.ofrenda-item-row');
    const newItems = Array.from(rows).map(r => ({
      miembro_nombre: r.querySelector('[data-f="miembro_nombre"]').value.trim(),
      monto: Number(r.querySelector('[data-f="monto"]').value)||0,
      nro_transferencia: r.querySelector('[data-f="nro_transferencia"]').value.trim()||null,
      fecha: r.querySelector('[data-f="fecha"]').value||null,
    })).filter(it => it.miembro_nombre);
    const total = calcTotal();
    const payload = {
      grupo_id: grupoId||null,
      grupo_nombre: grupoNombre,
      lider_nombre: wrap.querySelector('#of-lider').value.trim(),
      encargado: wrap.querySelector('#of-encargado').value.trim(),
      pastor: wrap.querySelector('#of-pastor').value.trim(),
      fecha: wrap.querySelector('#of-fecha').value,
      nro_miembros: Number(wrap.querySelector('#of-nro').value)||0,
      aporte_lider: Number(wrap.querySelector('#of-aporte-lider').value)||0,
      total_ofrenda: total,
      fecha_entrega_lider: wrap.querySelector('#of-fecha-lider').value||null,
      fecha_envio_area: wrap.querySelector('#of-fecha-area').value||null,
    };
    try {
      let ofId = id;
      if (id) {
        const { error } = await supabase.from('ofrendas').update(payload).eq('id', id);
        if (error) throw new Error(error.message);
        await supabase.from('ofrenda_items').delete().eq('ofrenda_id', id);
      } else {
        const { data, error } = await supabase.from('ofrendas').insert(payload).select().single();
        if (error) throw new Error(error.message);
        ofId = data.id;
      }
      if (newItems.length > 0) {
        const { error } = await supabase.from('ofrenda_items').insert(newItems.map(it=>({...it, ofrenda_id: ofId})));
        if (error) throw new Error(error.message);
      }
      await renderOfrendas(container, navigate);
    } catch(e) {
      errEl.textContent = e.message;
      errEl.classList.remove('hidden');
    }
  });
}
