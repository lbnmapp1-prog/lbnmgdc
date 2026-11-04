import { getRegistrosPendientes, updateRegistro, deleteRegistro, createMiembro } from '../db.js';

function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

export async function renderSolicitudes(container, navigate) {
  container.innerHTML = `<div class="spinner">Cargando solicitudes…</div>`;
  let items = [];
  try { items = await getRegistrosPendientes(); } catch(e) {
    container.innerHTML = `<div class="empty-state">Error: ${esc(e.message)}</div>`; return;
  }
  draw();

  function draw(){
    const pendientes = items.filter(r => r.estado === 'Pendiente');
    const procesados = items.filter(r => r.estado !== 'Pendiente');

    const cardHtml = (r, isPend) => {
      const fecha = new Date(r.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'});
      const estadoColor = r.estado==='Aprobado'?'#2f7d6b':r.estado==='Rechazado'?'#9a3b52':'#b9892b';
      return `
      <div class="reg-card" data-id="${esc(r.id)}" style="background:#fff;border:1px solid #dde2ea;border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#1e5aa8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;">
              ${esc(r.nombre.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase())}
            </div>
            <div>
              <div style="font-weight:700;font-size:15px;">${esc(r.nombre)}</div>
              <div style="font-size:12px;color:#8a94a8;">${fecha}</div>
            </div>
          </div>
          <span style="font-size:11px;font-weight:700;color:#fff;background:${estadoColor};padding:3px 10px;border-radius:20px;">${esc(r.estado)}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px 16px;font-size:13px;">
          ${r.telefono?`<div><span style="color:#8a94a8;">Tel:</span> ${esc(r.telefono)}</div>`:''}
          ${r.correo?`<div><span style="color:#8a94a8;">Correo:</span> ${esc(r.correo)}</div>`:''}
          ${r.fecha_nacimiento?`<div><span style="color:#8a94a8;">Nac:</span> ${esc(r.fecha_nacimiento)}</div>`:''}
          ${r.estado_civil?`<div><span style="color:#8a94a8;">Civil:</span> ${esc(r.estado_civil)}</div>`:''}
          ${r.grupo_nombre?`<div><span style="color:#8a94a8;">Grupo:</span> ${esc(r.grupo_nombre)}</div>`:''}
          ${r.como_llego?`<div style="grid-column:1/-1;"><span style="color:#8a94a8;">¿Cómo llegó?</span> ${esc(r.como_llego)}</div>`:''}
        </div>
        ${isPend ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
          <button class="btn-aprobar btn-primary sm" data-id="${esc(r.id)}" style="flex:1;min-width:120px;">✓ Aprobar e ingresar</button>
          <button class="btn-rechazar btn-secondary sm" data-id="${esc(r.id)}" style="flex:1;min-width:120px;color:#9a3b52;">✕ Rechazar</button>
        </div>` : `
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button class="btn-eliminar btn-secondary sm" data-id="${esc(r.id)}" style="color:#9a3b52;font-size:12px;">Eliminar registro</button>
        </div>`}
      </div>`;
    };

    container.innerHTML = `
    <div class="page-wrap fade-up">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="font-size:22px;font-weight:700;margin:0 0 4px;">Solicitudes de inscripción</h2>
          <p style="font-size:13px;color:#8a94a8;margin:0;">Personas que se registraron por el enlace público y esperan tu aprobación.</p>
        </div>
        <button class="btn-secondary" id="btn-copy-link">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Copiar enlace de registro
        </button>
      </div>

      ${pendientes.length ? `
      <div style="font-size:12px;font-weight:700;color:#b9892b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">
        Pendientes de aprobación (${pendientes.length})
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:28px;">
        ${pendientes.map(r=>cardHtml(r,true)).join('')}
      </div>` : `
      <div class="empty-state" style="margin-bottom:28px;">
        <p>No hay solicitudes pendientes.</p>
        <p style="font-size:13px;">Comparte el enlace de registro con nuevas personas.</p>
      </div>`}

      ${procesados.length ? `
      <div style="font-size:12px;font-weight:700;color:#8a94a8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">
        Procesadas (${procesados.length})
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${procesados.map(r=>cardHtml(r,false)).join('')}
      </div>` : ''}
    </div>`;

    container.querySelector('#btn-copy-link')?.addEventListener('click', async ev => {
      const link = `${location.origin}/registro.html`;
      try { await navigator.clipboard.writeText(link); ev.target.textContent = '¡Enlace copiado!'; setTimeout(()=>ev.target.textContent='Copiar enlace de registro',2000); }
      catch { prompt('Copia este enlace:', link); }
    });

    container.querySelectorAll('.btn-aprobar').forEach(btn => btn.addEventListener('click', async () => {
      const r = items.find(x=>x.id===btn.dataset.id);
      if(!r) return;
      if(!confirm(`¿Aprobar e ingresar a ${r.nombre} como nuevo miembro?`)) return;
      btn.disabled=true; btn.textContent='Procesando…';
      try {
        // Crear el miembro con los datos del registro
        await createMiembro({
          nombre: r.nombre,
          telefono: r.telefono || '',
          correo: r.correo || '',
          fecha_nacimiento: r.fecha_nacimiento || '',
          estado_civil: r.estado_civil || '',
          rol: 'Miembro',
        });
        await updateRegistro(r.id, { estado: 'Aprobado' });
        items = items.map(x => x.id===r.id ? {...x, estado:'Aprobado'} : x);
        draw();
      } catch(e) {
        alert('Error: ' + e.message);
        btn.disabled=false; btn.textContent='✓ Aprobar e ingresar';
      }
    }));

    container.querySelectorAll('.btn-rechazar').forEach(btn => btn.addEventListener('click', async () => {
      const r = items.find(x=>x.id===btn.dataset.id);
      if(!r || !confirm(`¿Rechazar la solicitud de ${r.nombre}?`)) return;
      btn.disabled=true;
      try {
        await updateRegistro(r.id, { estado: 'Rechazado' });
        items = items.map(x => x.id===r.id ? {...x, estado:'Rechazado'} : x);
        draw();
      } catch(e) { alert('Error: '+e.message); btn.disabled=false; }
    }));

    container.querySelectorAll('.btn-eliminar').forEach(btn => btn.addEventListener('click', async () => {
      const r = items.find(x=>x.id===btn.dataset.id);
      if(!r || !confirm(`¿Eliminar el registro de ${r.nombre}?`)) return;
      btn.disabled=true;
      try {
        await deleteRegistro(r.id);
        items = items.filter(x=>x.id!==r.id);
        draw();
      } catch(e) { alert('Error: '+e.message); btn.disabled=false; }
    }));
  }
}
