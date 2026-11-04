import { getRegistrosPendientes, updateRegistro, deleteRegistro, createMiembro,
         getRegistroTokens, createRegistroToken, updateRegistroToken, deleteRegistroToken,
         getGrupos } from '../db.js';
import { getCurrentGrupoId, isAdmin } from '../main.js';
import { refreshSolicitudesBadge } from '../main.js';

function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function tiempoRestante(expira_en){
  if(!expira_en) return null;
  const ms = new Date(expira_en) - new Date();
  if(ms <= 0) return 'Expirado';
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
  if(h >= 24){ const d=Math.floor(h/24); return `${d}d ${h%24}h`; }
  return h>0 ? `${h}h ${m}min` : `${m} min`;
}

function formatFecha(iso){
  if(!iso) return '—';
  return new Date(iso).toLocaleString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

export async function renderSolicitudes(container, navigate) {
  container.innerHTML = `<div class="spinner">Cargando…</div>`;

  let items = [], tokens = [], grupos = [];
  try {
    [items, tokens, grupos] = await Promise.all([
      getRegistrosPendientes(), getRegistroTokens(), getGrupos()
    ]);
  } catch(e) {
    container.innerHTML = `<div class="empty-state">Error: ${esc(e.message)}</div>`; return;
  }

  const BASE_URL = location.origin;
  let tabActivo = 'solicitudes'; // 'solicitudes' | 'enlaces'

  function draw(){
    const pendientes  = items.filter(r => r.estado === 'Pendiente');
    const procesados  = items.filter(r => r.estado !== 'Pendiente');
    const tokActivos  = tokens.filter(t => t.activo && (t.tipo==='individual' || !t.expira_en || new Date(t.expira_en)>new Date()));
    const tokVencidos = tokens.filter(t => !t.activo || (t.tipo==='grupal' && t.expira_en && new Date(t.expira_en)<=new Date()));

    container.innerHTML = `
    <div class="page-wrap fade-up">
      <div style="margin-bottom:20px;">
        <h2 style="font-size:22px;font-weight:700;margin:0 0 4px;">Solicitudes de inscripción</h2>
        <p style="font-size:13px;color:#8a94a8;margin:0;">Gestiona los enlaces de registro y aprueba las solicitudes recibidas.</p>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:4px;border-bottom:2px solid #eef1f6;margin-bottom:22px;">
        <button class="tab-btn${tabActivo==='solicitudes'?' tab-active':''}" data-tab="solicitudes"
          style="padding:9px 18px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:600;color:${tabActivo==='solicitudes'?'#1e5aa8':'#8a94a8'};border-bottom:${tabActivo==='solicitudes'?'2px solid #1e5aa8':'2px solid transparent'};margin-bottom:-2px;">
          Solicitudes ${pendientes.length?`<span style="background:#c0392b;color:#fff;border-radius:20px;font-size:10px;padding:1px 7px;margin-left:4px;">${pendientes.length}</span>`:''}
        </button>
        <button class="tab-btn${tabActivo==='enlaces'?' tab-active':''}" data-tab="enlaces"
          style="padding:9px 18px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:600;color:${tabActivo==='enlaces'?'#1e5aa8':'#8a94a8'};border-bottom:${tabActivo==='enlaces'?'2px solid #1e5aa8':'2px solid transparent'};margin-bottom:-2px;">
          Mis enlaces ${tokActivos.length?`<span style="background:#2f7d6b;color:#fff;border-radius:20px;font-size:10px;padding:1px 7px;margin-left:4px;">${tokActivos.length}</span>`:''}
        </button>
      </div>

      ${tabActivo === 'solicitudes' ? renderTabSolicitudes(pendientes, procesados) : renderTabEnlaces(tokActivos, tokVencidos, grupos)}
    </div>`;

    // Tabs
    container.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => {
      tabActivo = b.dataset.tab; draw();
    }));

    if(tabActivo === 'solicitudes'){
      bindSolicitudes();
    } else {
      bindEnlaces(grupos);
    }
  }

  // ===== TAB SOLICITUDES =====
  function renderTabSolicitudes(pendientes, procesados){
    const cardHtml = (r, isPend) => {
      const fecha = new Date(r.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'});
      const estadoColor = r.estado==='Aprobado'?'#2f7d6b':r.estado==='Rechazado'?'#9a3b52':'#b9892b';
      return `
      <div class="reg-card" style="background:#fff;border:1px solid #dde2ea;border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#1e5aa8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;">
              ${esc(r.nombre.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase())}
            </div>
            <div>
              <div style="font-weight:700;font-size:15px;">${esc(r.nombre)}</div>
              <div style="font-size:12px;color:#8a94a8;">${fecha}${r.grupo_nombre?` · ${esc(r.grupo_nombre)}`:''}</div>
            </div>
          </div>
          <span style="font-size:11px;font-weight:700;color:#fff;background:${estadoColor};padding:3px 10px;border-radius:20px;">${esc(r.estado)}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:5px 16px;font-size:13px;">
          ${r.telefono?`<div><span style="color:#8a94a8;">Tel:</span> ${esc(r.telefono)}</div>`:''}
          ${r.correo?`<div><span style="color:#8a94a8;">Correo:</span> ${esc(r.correo)}</div>`:''}
          ${r.fecha_nacimiento?`<div><span style="color:#8a94a8;">Nac:</span> ${esc(r.fecha_nacimiento)}</div>`:''}
          ${r.estado_civil?`<div><span style="color:#8a94a8;">Civil:</span> ${esc(r.estado_civil)}</div>`:''}
          ${r.como_llego?`<div style="grid-column:1/-1;"><span style="color:#8a94a8;">¿Cómo llegó?</span> ${esc(r.como_llego)}</div>`:''}
        </div>
        ${isPend ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
          <button class="btn-aprobar btn-primary sm" data-id="${esc(r.id)}" data-nombre="${esc(r.nombre)}"
            data-tel="${esc(r.telefono||'')}" data-correo="${esc(r.correo||'')}"
            data-nac="${esc(r.fecha_nacimiento||'')}" data-civil="${esc(r.estado_civil||'')}"
            style="flex:1;min-width:120px;">✓ Aprobar e ingresar</button>
          <button class="btn-rechazar btn-secondary sm" data-id="${esc(r.id)}" data-nombre="${esc(r.nombre)}" style="flex:1;min-width:120px;color:#9a3b52;">✕ Rechazar</button>
        </div>` : `
        <button class="btn-eliminar" data-id="${esc(r.id)}" data-nombre="${esc(r.nombre)}" style="background:none;border:none;cursor:pointer;font-size:12px;color:#9a3b52;text-align:left;padding:0;">Eliminar registro</button>`}
      </div>`;
    };

    return `
      ${pendientes.length ? `
      <div style="font-size:11.5px;font-weight:700;color:#b9892b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Pendientes (${pendientes.length})</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px;">${pendientes.map(r=>cardHtml(r,true)).join('')}</div>
      ` : `<div class="empty-state" style="margin-bottom:24px;"><p>No hay solicitudes pendientes.</p></div>`}

      ${procesados.length ? `
      <div style="font-size:11.5px;font-weight:700;color:#8a94a8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Procesadas (${procesados.length})</div>
      <div style="display:flex;flex-direction:column;gap:10px;">${procesados.map(r=>cardHtml(r,false)).join('')}</div>
      ` : ''}`;
  }

  function bindSolicitudes(){
    container.querySelectorAll('.btn-aprobar').forEach(btn => btn.addEventListener('click', async () => {
      if(!confirm(`¿Aprobar e ingresar a ${btn.dataset.nombre}?`)) return;
      btn.disabled=true; btn.textContent='Procesando…';
      try {
        await createMiembro({ nombre:btn.dataset.nombre, telefono:btn.dataset.tel,
          correo:btn.dataset.correo, fecha_nacimiento:btn.dataset.nac,
          estado_civil:btn.dataset.civil, rol:'Miembro' });
        await updateRegistro(btn.dataset.id, { estado:'Aprobado' });
        items = items.map(x => x.id===btn.dataset.id ? {...x,estado:'Aprobado'} : x);
        refreshSolicitudesBadge();
        draw();
      } catch(e){ alert('Error: '+e.message); btn.disabled=false; btn.textContent='✓ Aprobar e ingresar'; }
    }));

    container.querySelectorAll('.btn-rechazar').forEach(btn => btn.addEventListener('click', async () => {
      if(!confirm(`¿Rechazar la solicitud de ${btn.dataset.nombre}?`)) return;
      btn.disabled=true;
      try {
        await updateRegistro(btn.dataset.id, { estado:'Rechazado' });
        items = items.map(x => x.id===btn.dataset.id ? {...x,estado:'Rechazado'} : x);
        refreshSolicitudesBadge();
        draw();
      } catch(e){ alert('Error: '+e.message); btn.disabled=false; }
    }));

    container.querySelectorAll('.btn-eliminar').forEach(btn => btn.addEventListener('click', async () => {
      if(!confirm(`¿Eliminar el registro de ${btn.dataset.nombre}?`)) return;
      try {
        await deleteRegistro(btn.dataset.id);
        items = items.filter(x=>x.id!==btn.dataset.id);
        refreshSolicitudesBadge();
        draw();
      } catch(e){ alert('Error: '+e.message); }
    }));
  }

  // ===== TAB ENLACES =====
  function renderTabEnlaces(activos, vencidos, grupos){
    const grupoOpts = grupos.map(g=>`<option value="${esc(g.id)}" data-nombre="${esc(g.nombre)}">${esc(g.nombre)}</option>`).join('');

    const tokenCard = t => {
      const url = `${BASE_URL}/registro.html?t=${t.id}`;
      const resto = t.tipo==='grupal' ? tiempoRestante(t.expira_en) : null;
      const expirado = resto === 'Expirado' || !t.activo;
      const statusColor = expirado ? '#9a3b52' : t.tipo==='individual'&&t.usado ? '#8a94a8' : '#2f7d6b';
      const statusText  = expirado ? 'Expirado/Inactivo' : t.tipo==='individual'&&t.usado ? 'Usado' : t.tipo==='grupal' ? `Activo · ${resto}` : 'Activo · 1 uso';
      return `
      <div style="background:#fff;border:1px solid #dde2ea;border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div>
            <span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:${t.tipo==='grupal'?'#e8f0fb':'#f5f0fa'};color:${t.tipo==='grupal'?'#1e5aa8':'#6b4e9a'};">${t.tipo==='grupal'?'Grupal':'Individual'}</span>
            <span style="font-size:14px;font-weight:700;margin-left:8px;">${esc(t.grupo_nombre||t.nombre_persona||'—')}</span>
          </div>
          <span style="font-size:11px;font-weight:700;color:#fff;background:${statusColor};padding:3px 10px;border-radius:20px;">${statusText}</span>
        </div>
        ${t.tipo==='grupal'&&t.expira_en?`<div style="font-size:12px;color:#8a94a8;">Expira: ${formatFecha(t.expira_en)}</div>`:''}
        <div style="display:flex;align-items:center;gap:8px;background:#f7f9fb;border:1px solid #eef1f6;border-radius:8px;padding:8px 12px;">
          <code style="font-size:11px;color:#56607a;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${url}</code>
          <button class="btn-copy-tok" data-url="${esc(url)}" style="background:#1e5aa8;color:#fff;border:none;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">Copiar</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${!expirado&&!t.usado?`<button class="btn-desactivar" data-id="${t.id}" style="background:none;border:1px solid #dde2ea;border-radius:7px;padding:5px 12px;font-size:12px;cursor:pointer;color:#9a3b52;">Desactivar</button>`:''}
          <button class="btn-del-tok" data-id="${t.id}" style="background:none;border:1px solid #dde2ea;border-radius:7px;padding:5px 12px;font-size:12px;cursor:pointer;color:#8a94a8;">Eliminar</button>
        </div>
      </div>`;
    };

    return `
      <!-- Crear enlace grupal -->
      <div style="background:#fff;border:1px solid #dde2ea;border-radius:14px;padding:18px;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e5aa8" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.85M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Nuevo enlace grupal
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div class="form-group">
            <label style="font-size:12px;font-weight:600;color:#56607a;">Grupo</label>
            <select id="sel-grupo-tok" style="padding:8px 10px;border:1.5px solid #dde2ea;border-radius:8px;font-size:14px;">
              <option value="">— Selecciona —</option>
              ${grupoOpts}
            </select>
          </div>
          <div class="form-group">
            <label style="font-size:12px;font-weight:600;color:#56607a;">Duración</label>
            <select id="sel-duracion" style="padding:8px 10px;border:1.5px solid #dde2ea;border-radius:8px;font-size:14px;">
              <option value="1">1 hora</option>
              <option value="24" selected>24 horas</option>
              <option value="48">48 horas</option>
              <option value="168">1 semana</option>
              <option value="336">2 semanas</option>
            </select>
          </div>
        </div>
        <button id="btn-crear-grupal" class="btn-primary sm" style="width:100%;">Generar enlace grupal</button>
      </div>

      <!-- Crear enlace individual -->
      <div style="background:#fff;border:1px solid #dde2ea;border-radius:14px;padding:18px;margin-bottom:24px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b4e9a" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/><path d="M19 8v6M22 11h-6"/></svg>
          Nuevo enlace individual
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div class="form-group">
            <label style="font-size:12px;font-weight:600;color:#56607a;">Nombre de la persona</label>
            <input id="inp-nombre-tok" type="text" placeholder="Ej: María Rodríguez" maxlength="100"
              style="padding:8px 10px;border:1.5px solid #dde2ea;border-radius:8px;font-size:14px;width:100%;">
          </div>
          <div class="form-group">
            <label style="font-size:12px;font-weight:600;color:#56607a;">Grupo (opcional)</label>
            <select id="sel-grupo-ind" style="padding:8px 10px;border:1.5px solid #dde2ea;border-radius:8px;font-size:14px;">
              <option value="">— Sin asignar —</option>
              ${grupoOpts}
            </select>
          </div>
        </div>
        <button id="btn-crear-individual" class="btn-primary sm" style="width:100%;background:#6b4e9a;">Generar enlace individual</button>
      </div>

      <!-- Tokens activos -->
      ${activos.length ? `
      <div style="font-size:11.5px;font-weight:700;color:#2f7d6b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Enlaces activos (${activos.length})</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px;">${activos.map(tokenCard).join('')}</div>
      ` : ''}

      ${vencidos.length ? `
      <div style="font-size:11.5px;font-weight:700;color:#8a94a8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Vencidos / usados (${vencidos.length})</div>
      <div style="display:flex;flex-direction:column;gap:10px;">${vencidos.map(tokenCard).join('')}</div>
      ` : ''}`;
  }

  function bindEnlaces(grupos){
    // Crear grupal
    container.querySelector('#btn-crear-grupal')?.addEventListener('click', async () => {
      const selGrupo = container.querySelector('#sel-grupo-tok');
      const grupoId  = selGrupo.value;
      const grupoNombre = selGrupo.options[selGrupo.selectedIndex]?.dataset.nombre || '';
      const horas    = parseInt(container.querySelector('#sel-duracion').value) || 24;
      if(!grupoId){ alert('Selecciona un grupo.'); return; }
      const expira = new Date(Date.now() + horas*3600*1000).toISOString();
      try {
        const tok = await createRegistroToken({ tipo:'grupal', grupo_id:grupoId, grupo_nombre:grupoNombre, expira_en:expira, activo:true });
        tokens = [tok, ...tokens];
        tabActivo = 'enlaces';
        draw();
        // Copiar al portapapeles automáticamente
        const url = `${BASE_URL}/registro.html?t=${tok.id}`;
        try { await navigator.clipboard.writeText(url); } catch{}
        alert(`✅ Enlace grupal creado y copiado.\n\nVálido por ${horas} hora(s) para el grupo "${grupoNombre}".`);
      } catch(e){ alert('Error: '+e.message); }
    });

    // Crear individual
    container.querySelector('#btn-crear-individual')?.addEventListener('click', async () => {
      const nombre = container.querySelector('#inp-nombre-tok').value.trim();
      const selGrupo = container.querySelector('#sel-grupo-ind');
      const grupoId  = selGrupo.value || null;
      const grupoNombre = grupoId ? (selGrupo.options[selGrupo.selectedIndex]?.dataset.nombre||'') : null;
      if(nombre.length < 2){ alert('Escribe el nombre de la persona.'); return; }
      try {
        const tok = await createRegistroToken({ tipo:'individual', nombre_persona:nombre, grupo_id:grupoId, grupo_nombre:grupoNombre, activo:true });
        tokens = [tok, ...tokens];
        tabActivo = 'enlaces';
        draw();
        const url = `${BASE_URL}/registro.html?t=${tok.id}`;
        try { await navigator.clipboard.writeText(url); } catch{}
        alert(`✅ Enlace individual creado y copiado.\n\nEnvíalo a ${nombre}. Solo podrá usarse una vez.`);
      } catch(e){ alert('Error: '+e.message); }
    });

    // Copiar enlace
    container.querySelectorAll('.btn-copy-tok').forEach(btn => btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.url); btn.textContent='¡Copiado!'; setTimeout(()=>btn.textContent='Copiar',2000); }
      catch { prompt('Copia este enlace:', btn.dataset.url); }
    }));

    // Desactivar
    container.querySelectorAll('.btn-desactivar').forEach(btn => btn.addEventListener('click', async () => {
      if(!confirm('¿Desactivar este enlace?')) return;
      try {
        await updateRegistroToken(btn.dataset.id, { activo: false });
        tokens = tokens.map(t => t.id===btn.dataset.id ? {...t,activo:false} : t);
        draw();
      } catch(e){ alert('Error: '+e.message); }
    }));

    // Eliminar token
    container.querySelectorAll('.btn-del-tok').forEach(btn => btn.addEventListener('click', async () => {
      if(!confirm('¿Eliminar este enlace?')) return;
      try {
        await deleteRegistroToken(btn.dataset.id);
        tokens = tokens.filter(t=>t.id!==btn.dataset.id);
        draw();
      } catch(e){ alert('Error: '+e.message); }
    }));
  }

  draw();
}
