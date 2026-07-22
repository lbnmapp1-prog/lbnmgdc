import { getMiembros, getGrupos } from '../db.js';
import { getUsuarios } from '../auth.js';
import { isAdmin, getCurrentGrupoId } from '../main.js';

const COLORS = ['#1e5aa8','#2f7d6b','#9a5b2b','#6b4e9a','#9a3b52','#2b6f8a','#3a6ea5','#7a7a3a'];
function ini(n) { return (n||'').split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase(); }

export async function renderOrganigrama(container, navigate) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;
  const [todosGrupos, miembros, usuarios] = await Promise.all([getGrupos(), getMiembros(), getUsuarios()]);
  const pastor = usuarios.find(u => u.rol === 'Pastor de Área' || u.rol === 'Super Usuario');
  const asesor = usuarios.find(u => u.rol === 'Líder Asesor');

  // Un Líder de Grupo solo ve la tarjeta de su propio grupo, nunca la de otros.
  const grupos = isAdmin() ? todosGrupos : todosGrupos.filter(g => g.id === getCurrentGrupoId());

  const groupCards = grupos.map((g, gi) => {
    const gm = miembros.filter(m => m.grupo_id === g.id);
    const lideres = gm.filter(m => m.rol === 'Líder de Grupo');
    const asistentes = gm.filter(m => m.rol === 'Líder Asistente');
    const padres = gm.filter(m => m.rol === 'Padre Espiritual');
    const membs = gm.filter(m => m.rol === 'Miembro');
    const color = COLORS[gi % COLORS.length];

    const memberRow = (m, cls, roleLabel, roleColor) => `
      <div class="org-member ${cls}" data-miembro-id="${m.id}">
        <div class="avatar sm" style="background:${COLORS[miembros.indexOf(m)%COLORS.length]};">${ini(m.nombre)}</div>
        <div style="min-width:0;">
          <div style="font-size:13px;font-weight:600;color:#14223a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.nombre}</div>
          <div style="font-size:11px;color:${roleColor};font-weight:600;">${roleLabel}</div>
        </div>
      </div>`;

    const memberSmRow = (m) => `
      <div class="org-member-sm" data-miembro-id="${m.id}">
        <div class="avatar xs" style="background:${COLORS[miembros.indexOf(m)%COLORS.length]};">${ini(m.nombre)}</div>
        <div style="font-size:12.5px;color:#2d3650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.nombre}</div>
      </div>`;

    return `
      <div class="org-card">
        <div class="org-card-header" style="border-top:4px solid ${color};">
          <div style="font-size:14px;font-weight:700;color:#14223a;">${g.nombre}</div>
          <div style="font-size:11.5px;color:#8a94a8;margin-top:2px;">${g.sede} · ${gm.length} integrantes</div>
        </div>
        <div class="org-card-body">
          ${lideres.map(m => memberRow(m,'lider','Líder de Grupo','#1e5aa8')).join('')}
          ${asistentes.map(m => memberRow(m,'asistente','Líder Asistente','#2f7d6b')).join('')}
          <div style="height:1px;background:#f0f2f6;"></div>
          ${padres.length ? `<div><div class="org-sub-label" style="color:#6b4e9a;">Padres espirituales</div>${padres.map(memberSmRow).join('')}</div>` : ''}
          ${membs.length ? `<div><div class="org-sub-label" style="color:#8a94a8;">Miembros</div>${membs.map(memberSmRow).join('')}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
  <div class="page-wrap fade-up">
    <div class="org-tree">
      <div style="background:#0d2440;color:#fff;border-radius:16px;padding:20px 32px;text-align:center;min-width:240px;box-shadow:0 8px 24px rgba(13,36,64,.2);">
        <div class="avatar md" style="margin:0 auto 12px;background:linear-gradient(135deg,#4685d6,#1e5aa8);font-size:18px;font-weight:700;border-radius:12px;width:48px;height:48px;">${ini(pastor?.nombre) || '—'}</div>
        <div style="font-size:15px;font-weight:700;">${pastor?.nombre || 'Sin asignar'}</div>
        <div style="font-size:11.5px;color:#9fb6d6;margin-top:3px;font-weight:500;">${pastor?.rol || 'Pastor de Área'}</div>
      </div>
      <div class="org-connector"></div>
      <div style="background:#eef6f3;border:1.5px solid #b8ddd4;border-radius:16px;padding:18px 32px;text-align:center;min-width:220px;">
        <div class="avatar md" style="background:#2f7d6b;margin:0 auto 10px;border-radius:10px;font-size:14px;">${ini(asesor?.nombre) || '—'}</div>
        <div style="font-size:14px;font-weight:700;color:#14223a;">${asesor?.nombre || 'Sin asignar'}</div>
        <div style="font-size:11.5px;color:#2f7d6b;font-weight:600;margin-top:3px;">Líder Asesor</div>
      </div>
      <div class="org-connector"></div>
      <div class="org-label">${isAdmin() ? `${todosGrupos.length} Grupos de Cuidado` : 'Tu Grupo de Cuidado'}</div>
      <div class="org-connector"></div>
    </div>
    <div class="org-grid">${groupCards}</div>
  </div>`;

  container.querySelectorAll('[data-miembro-id]').forEach(el => {
    el.addEventListener('click', () => navigate('ficha', { id: el.dataset.miembroId }));
  });
}
