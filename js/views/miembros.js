import { getMiembros, getGrupos, deleteMiembro } from '../db.js';
import { isAdmin, getCurrentGrupoId } from '../main.js';

const ROLES_ORDER = ['Líder de Grupo','Líder Asistente','Padre Espiritual','Miembro'];

function rolClass(rol) {
  if (rol === 'Líder de Grupo') return 'role-lider-grupo';
  if (rol === 'Líder Asistente') return 'role-lider-asistente';
  if (rol === 'Padre Espiritual') return 'role-padre-espiritual';
  return 'role-miembro';
}

function iniciales(nombre) {
  return (nombre || '').split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
}

const COLORS = ['#1e5aa8','#2f7d6b','#9a5b2b','#6b4e9a','#9a3b52','#2b6f8a','#3a6ea5','#7a7a3a'];

export async function renderMiembros(container, navigate, params = {}) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;
  const todosGrupos = await getGrupos();
  const grupoFiltro = !isAdmin() ? getCurrentGrupoId() : (params.grupoId || null);
  const grupos = !isAdmin() ? todosGrupos.filter(g => g.id === grupoFiltro) : todosGrupos;
  let miembros = await getMiembros(grupoFiltro, params.search || '');

  function html() {
    const rows = miembros.map((m, i) => {
      const color = COLORS[i % COLORS.length];
      const pct = m.nivel_idx != null ? Math.round((m.nivel_idx + 1) / 9 * 100) : 0;
      return `
        <div class="table-row members-grid" data-miembro-id="${m.id}">
          <div class="flex gap-12" style="align-items:center;min-width:0;">
            <div class="avatar sm" style="background:${color};">${iniciales(m.nombre)}</div>
            <div style="min-width:0;">
              <div style="font-size:14px;font-weight:600;color:#14223a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.nombre}</div>
              <div style="font-size:12px;color:#8a94a8;">${m.grupos?.sede || '—'}</div>
            </div>
          </div>
          <div><span class="role-badge ${rolClass(m.rol)}">${m.rol}</span></div>
          <div style="font-size:13.5px;color:#3d4860;">${m.grupos?.nombre || '—'}</div>
          <div style="font-size:13px;color:#56607a;font-family:'IBM Plex Mono',monospace;">${m.telefono || '—'}</div>
          <div class="progress-wrap">
            <div class="progress-bar"><div class="fill" style="width:${pct}%;"></div></div>
            <span class="progress-val">${pct}%</span>
          </div>
          <div style="text-align:right;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c2cad8" stroke-width="2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg></div>
        </div>
      `;
    }).join('');

    const grupoOptions = grupos.map(g => `<option value="${g.id}" ${params.grupoId===g.id?'selected':''}>${g.nombre}</option>`).join('');

    return `
    <div class="page-wrap fade-up">
      <div class="flex mb-18" style="align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
        <div class="flex gap-12" style="align-items:center;flex-wrap:wrap;">
          <div class="search-box" style="width:280px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa5b5" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input id="search-miembros" placeholder="Buscar por nombre o rol..." value="${params.search||''}" />
          </div>
          <select id="filter-grupo" style="padding:10px 13px;border:1px solid #e6eaf0;border-radius:10px;font-size:13.5px;color:#2d3650;background:#fff;outline:none;cursor:pointer;">
            <option value="">Todos los grupos</option>
            ${grupoOptions}
          </select>
          <span style="font-size:13px;color:#8a94a8;">${miembros.length} miembro${miembros.length!==1?'s':''}</span>
        </div>
        <button id="btn-nuevo-miembro" class="btn-primary sm" style="display:flex;align-items:center;gap:7px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo miembro
        </button>
      </div>
      <div class="table-wrap">
        <div class="table-head members-grid">
          <div>Miembro</div><div>Rol / Nivel</div><div>Grupo de Cuidado</div><div>Teléfono</div><div>Ruta</div><div></div>
        </div>
        ${rows || '<div class="empty-state">Sin miembros encontrados</div>'}
      </div>
    </div>`;
  }

  container.innerHTML = html();
  bindEvents(container, navigate, grupos, params);
}

function bindEvents(container, navigate, grupos, params) {
  container.querySelector('#search-miembros')?.addEventListener('input', async (e) => {
    params.search = e.target.value;
    const miembros = await getMiembros(params.grupoId || null, params.search);
    renderMiembros(container, navigate, params);
  });
  container.querySelector('#filter-grupo')?.addEventListener('change', async (e) => {
    params.grupoId = e.target.value || null;
    renderMiembros(container, navigate, params);
  });
  container.querySelector('#btn-nuevo-miembro')?.addEventListener('click', () => navigate('nuevo'));
  container.querySelectorAll('[data-miembro-id]').forEach(row => {
    row.addEventListener('click', () => navigate('ficha', { id: row.dataset.miembroId }));
  });
}
