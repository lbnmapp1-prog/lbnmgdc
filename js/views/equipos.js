import { supabase } from '../supabase.js';
import { getGrupos } from '../db.js';
import { isAdmin, getCurrentGrupoId } from '../main.js';

async function getEquipos() {
  const q = supabase.from('nuevos_equipos').select('*').order('created_at', { ascending: false });
  if (!isAdmin()) q.eq('grupo_id', getCurrentGrupoId());
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function renderEquipos(container, navigate) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;
  const [equipos, grupos] = await Promise.all([getEquipos(), getGrupos()]);

  container.innerHTML = `
    <div class="view-header">
      <div></div>
      <button class="btn-primary" id="btn-nuevo-equipo">+ Nuevo equipo</button>
    </div>
    <div id="equipos-list">
      ${equipos.length === 0 ? `<div class="empty-state">No hay equipos de liderazgo registrados aún.</div>` :
        equipos.map(e => `
          <div class="card-row" style="cursor:pointer;" data-id="${e.id}">
            <div class="card-row-main">
              <div class="card-row-title">${e.area||'—'} · Líder: ${e.lider||'—'}</div>
              <div class="card-row-sub">Nuevo líder: ${e.nuevo_lider||'—'} · Pastor: ${e.pastor||'—'}</div>
            </div>
          </div>`).join('')
      }
    </div>
    <div id="equipo-form-wrap" class="hidden"></div>`;

  container.querySelectorAll('.card-row[data-id]').forEach(row => {
    row.addEventListener('click', () => openEquipo(container, row.dataset.id, grupos, navigate));
  });
  container.querySelector('#btn-nuevo-equipo').addEventListener('click', () => {
    openEquipo(container, null, grupos, navigate);
  });
}

async function openEquipo(container, id, grupos, navigate) {
  const wrap = container.querySelector('#equipo-form-wrap');
  const list = container.querySelector('#equipos-list');
  const header = container.querySelector('.view-header');
  list.classList.add('hidden');
  header.classList.add('hidden');
  wrap.classList.remove('hidden');

  let equipo = null;
  if (id) {
    const { data } = await supabase.from('nuevos_equipos').select('*').eq('id', id).single();
    equipo = data;
  }

  const e = equipo || {};
  const grupoActual = isAdmin() ? (e.grupo_id||'') : getCurrentGrupoId();
  const grupoOpts = grupos.map(g => `<option value="${g.id}" ${g.id===grupoActual?'selected':''}>${g.nombre}</option>`).join('');

  wrap.innerHTML = `
    <div class="form-section">
      <div class="form-section-title">${id ? 'Editar equipo de liderazgo' : 'Nuevo equipo de liderazgo'} · Anexo A</div>

      <div class="form-grid-2">
        <div class="field-group">
          <label class="field-label">Grupo de Cuidado</label>
          <select class="field-input" id="eq-grupo">${grupoOpts}</select>
        </div>
        <div class="field-group">
          <label class="field-label">Área</label>
          <input class="field-input" id="eq-area" value="${e.area||''}" placeholder="Área" />
        </div>
        <div class="field-group">
          <label class="field-label">Pastor</label>
          <input class="field-input" id="eq-pastor" value="${e.pastor||''}" placeholder="Pastor de área" />
        </div>
        <div class="field-group">
          <label class="field-label">Teléfonos</label>
          <input class="field-input" id="eq-tel" value="${e.telefonos||''}" placeholder="Teléfonos de contacto" />
        </div>
      </div>

      <div class="form-section-title" style="margin-top:20px;">Líder actual</div>
      <div class="form-grid-2">
        <div class="field-group" style="grid-column:1/-1;">
          <label class="field-label">Líder</label>
          <input class="field-input" id="eq-lider" value="${e.lider||''}" placeholder="Nombre del líder actual" />
        </div>
        <div class="field-group" style="grid-column:1/-1;">
          <label class="field-label">Nuevo líder</label>
          <input class="field-input" id="eq-nuevo-lider" value="${e.nuevo_lider||''}" placeholder="Nombre del nuevo líder" />
        </div>
      </div>

      <div class="form-section-title" style="margin-top:20px;">Equipos base</div>
      <div class="form-grid-2">
        <div class="field-group">
          <label class="field-label">Equipo base 1 · Líder</label>
          <input class="field-input" id="eq-eq1" value="${e.eq1_lider||''}" placeholder="Líder del equipo base 1" />
        </div>
        <div class="field-group">
          <label class="field-label">Equipo base 2 · Nuevo líder</label>
          <input class="field-input" id="eq-eq2" value="${e.eq2_nuevo_lider||''}" placeholder="Nuevo líder del equipo base 2" />
        </div>
      </div>

      <div class="form-section-title" style="margin-top:20px;">Oración y multiplicación</div>
      <div class="field-group">
        <label class="field-label">Motivos de oración por proceso de multiplicación</label>
        <textarea class="field-input" id="eq-oracion" rows="3" placeholder="Escribe los motivos de oración...">${e.motivos_oracion||''}</textarea>
      </div>

      <div class="form-section-title" style="margin-top:20px;">Posible anfitrión</div>
      <div class="form-grid-2">
        <div class="field-group">
          <label class="field-label">Nombre del anfitrión</label>
          <input class="field-input" id="eq-anfitrion" value="${e.anfitrion||''}" placeholder="Nombre" />
        </div>
        <div class="field-group">
          <label class="field-label">Dirección</label>
          <input class="field-input" id="eq-dir" value="${e.direccion_anfitrion||''}" placeholder="Dirección del lugar" />
        </div>
      </div>

      <div id="eq-error" class="login-error hidden" style="margin-top:12px;"></div>
      <div class="form-actions">
        <button class="btn-secondary" id="btn-cancel-eq">Cancelar</button>
        ${id ? `<button class="btn-danger" id="btn-delete-eq">Eliminar</button>` : ''}
        <button class="btn-primary" id="btn-save-eq">Guardar</button>
      </div>
    </div>`;

  wrap.querySelector('#btn-cancel-eq').addEventListener('click', () => {
    wrap.classList.add('hidden');
    list.classList.remove('hidden');
    header.classList.remove('hidden');
  });

  if (id) {
    wrap.querySelector('#btn-delete-eq').addEventListener('click', async () => {
      if (!confirm('¿Eliminar este equipo?')) return;
      await supabase.from('nuevos_equipos').delete().eq('id', id);
      await renderEquipos(container, navigate);
    });
  }

  wrap.querySelector('#btn-save-eq').addEventListener('click', async () => {
    const errEl = wrap.querySelector('#eq-error');
    errEl.classList.add('hidden');
    const payload = {
      grupo_id: wrap.querySelector('#eq-grupo').value||null,
      area: wrap.querySelector('#eq-area').value.trim(),
      pastor: wrap.querySelector('#eq-pastor').value.trim(),
      telefonos: wrap.querySelector('#eq-tel').value.trim(),
      lider: wrap.querySelector('#eq-lider').value.trim(),
      nuevo_lider: wrap.querySelector('#eq-nuevo-lider').value.trim(),
      eq1_lider: wrap.querySelector('#eq-eq1').value.trim(),
      eq2_nuevo_lider: wrap.querySelector('#eq-eq2').value.trim(),
      motivos_oracion: wrap.querySelector('#eq-oracion').value.trim(),
      anfitrion: wrap.querySelector('#eq-anfitrion').value.trim(),
      direccion_anfitrion: wrap.querySelector('#eq-dir').value.trim(),
    };
    try {
      if (id) {
        const { error } = await supabase.from('nuevos_equipos').update(payload).eq('id', id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('nuevos_equipos').insert(payload);
        if (error) throw new Error(error.message);
      }
      await renderEquipos(container, navigate);
    } catch(e) {
      errEl.textContent = e.message;
      errEl.classList.remove('hidden');
    }
  });
}
