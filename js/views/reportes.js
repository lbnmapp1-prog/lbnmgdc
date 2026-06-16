import { getMiembros, getGrupos } from '../db.js';

const COLORS = ['#1e5aa8','#2f7d6b','#9a5b2b','#6b4e9a','#9a3b52','#2b6f8a','#3a6ea5','#7a7a3a'];
function ini(n) { return (n||'').split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase(); }

let activeGrupoId = null;

export async function renderReportes(container, navigate, params = {}) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;
  const [grupos, miembros] = await Promise.all([getGrupos(), getMiembros()]);
  if (!activeGrupoId && grupos.length) activeGrupoId = params.grupoId || grupos[0].id;

  function render() {
    const g = grupos.find(x => x.id === activeGrupoId) || grupos[0];
    const gm = miembros.filter(m => m.grupo_id === g?.id);
    const lideres = gm.filter(m => m.rol === 'Líder de Grupo');
    const asistentes = gm.filter(m => m.rol === 'Líder Asistente');
    const padres = gm.filter(m => m.rol === 'Padre Espiritual');
    const membs = gm.filter(m => m.rol === 'Miembro');

    const tabs = grupos.map((gr, i) => `
      <div class="report-tab${gr.id===activeGrupoId?' active':''}" data-gid="${gr.id}">
        <div class="report-tab-dot" style="background:${COLORS[i%COLORS.length]};"></div>${gr.nombre}
      </div>`).join('');

    const memberCard = (m, cls, roleLabel, roleColor) => {
      const pct = m.nivel_idx != null ? Math.round((m.nivel_idx+1)/9*100) : 0;
      const idx = miembros.indexOf(m);
      return `
        <div class="rep-member ${cls}" onclick="window.navigate('ficha',{id:'${m.id}'})">
          <div class="avatar md" style="background:${COLORS[idx%COLORS.length]};">${ini(m.nombre)}</div>
          <div style="flex:1;min-width:0;"><div class="rep-member-name">${m.nombre}</div><div class="rep-member-role" style="color:${roleColor};">${roleLabel}</div></div>
          <div style="text-align:right;flex-shrink:0;"><div style="font-size:12.5px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:${roleColor};">${pct}%</div><div class="text-muted text-sm">ruta</div></div>
        </div>`;
    };

    const memberBase = (m) => {
      const pct = m.nivel_idx != null ? Math.round((m.nivel_idx+1)/9*100) : 0;
      const idx = miembros.indexOf(m);
      return `
        <div class="rep-member base" onclick="window.navigate('ficha',{id:'${m.id}'})">
          <div class="avatar sm" style="background:${COLORS[idx%COLORS.length]};">${ini(m.nombre)}</div>
          <div style="flex:1;min-width:0;"><div class="rep-member-name">${m.nombre}</div><div class="text-muted text-sm">${m.grupos?.sede||'—'}</div></div>
          <div class="progress-wrap" style="flex-shrink:0;">
            <div class="progress-bar" style="width:56px;"><div class="fill" style="width:${pct}%;"></div></div>
            <span class="progress-val">${pct}%</span>
          </div>
        </div>`;
    };

    container.innerHTML = `
    <div class="page-wrap fade-up">
      <div class="report-tabs">${tabs}</div>
      <div class="report-stat-grid">
        <div class="report-stat"><div class="report-stat-label">Total integrantes</div><div class="report-stat-num" style="color:#14223a;">${gm.length}</div></div>
        <div class="report-stat"><div class="report-stat-label">Líder de Grupo</div><div class="report-stat-num text-primary">${lideres.length}</div></div>
        <div class="report-stat"><div class="report-stat-label">Líderes totales</div><div class="report-stat-num" style="color:#6b4e9a;">${gm.filter(m=>m.rol!=='Miembro').length}</div></div>
        <div class="report-stat"><div class="report-stat-label">Miembros base</div><div class="report-stat-num" style="color:#56607a;">${membs.length}</div></div>
      </div>
      <div class="grid-2 align-start">
        <div class="card">
          <div class="section-label">Liderazgo</div>
          ${lideres.map(m=>memberCard(m,'lider','Líder de Grupo','#1e5aa8')).join('')}
          ${asistentes.map(m=>memberCard(m,'asistente','Líder Asistente','#2f7d6b')).join('')}
          ${padres.map(m=>memberCard(m,'padre','Padre Espiritual','#6b4e9a')).join('')}
          ${!lideres.length&&!asistentes.length&&!padres.length?'<div class="empty-state">Sin líderes registrados</div>':''}
        </div>
        <div class="card">
          <div class="section-label" style="color:#6b7689;">Miembros</div>
          ${membs.map(memberBase).join('') || '<div class="empty-state">Sin miembros</div>'}
        </div>
      </div>
    </div>`;

    container.querySelectorAll('.report-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeGrupoId = tab.dataset.gid;
        render();
      });
    });
  }

  render();
}
