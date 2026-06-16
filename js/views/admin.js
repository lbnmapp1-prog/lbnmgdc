import { getGrupos, createGrupo, deleteGrupo } from '../db.js';
import { getUsuarios, createUsuario, deleteUsuario } from '../auth.js';

const SEDES = ['Sede Este', 'Sede Oeste', 'Sede Cabudare', 'Sede 48', 'Sede 52'];

export async function renderAdmin(container, navigate) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;

  let grupos = await getGrupos();
  let usuarios = await getUsuarios();

  function render() {
    const grupoOptions = grupos.map(g => `<option value="${g.id}">${g.nombre}</option>`).join('');

    container.innerHTML = `
    <div class="page-wrap fade-up">

      <!-- GRUPOS -->
      <div class="card" style="margin-bottom:18px;">
        <div class="card-title" style="margin-bottom:16px;">Grupos de Cuidado</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
          ${grupos.map(g => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f5f7fb;border-radius:10px;">
              <div style="flex:1;">
                <div style="font-weight:600;color:#14223a;">${g.nombre}</div>
                <div style="font-size:12px;color:#8a94a8;">${g.sede || '—'}</div>
              </div>
              <button class="btn-icon btn-del-grupo" data-id="${g.id}" title="Eliminar">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a3b52" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;">
          <div class="form-group" style="margin:0;"><label>Nombre del grupo</label><input id="new-grupo-nombre" placeholder="GDC Nombre..." /></div>
          <div class="form-group" style="margin:0;"><label>Sede</label>
            <select id="new-grupo-sede">
              ${SEDES.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <button class="btn-primary" id="btn-add-grupo" style="height:40px;padding:0 18px;">Agregar</button>
        </div>
      </div>

      <!-- USUARIOS -->
      <div class="card">
        <div class="card-title" style="margin-bottom:16px;">Usuarios del sistema</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
          ${usuarios.map(u => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f5f7fb;border-radius:10px;">
              <div style="flex:1;">
                <div style="font-weight:600;color:#14223a;">${u.nombre}</div>
                <div style="font-size:12px;color:#8a94a8;">${u.email} · ${u.rol}</div>
              </div>
              <button class="btn-icon btn-del-usuario" data-id="${u.id}" title="Eliminar">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a3b52" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
          <div class="form-group" style="margin:0;"><label>Nombre completo</label><input id="new-u-nombre" placeholder="Nombre..." /></div>
          <div class="form-group" style="margin:0;"><label>Correo</label><input id="new-u-email" type="email" placeholder="correo@..." /></div>
          <div class="form-group" style="margin:0;"><label>Contraseña</label><input id="new-u-pass" type="password" placeholder="••••••" /></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;">
          <div class="form-group" style="margin:0;"><label>Rol</label>
            <select id="new-u-rol">
              <option value="Líder de Grupo">Líder de Grupo</option>
              <option value="Líder Asesor">Líder Asesor</option>
              <option value="Pastor de Área">Pastor de Área</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;"><label>Grupo asignado</label>
            <select id="new-u-grupo">
              <option value="">— Ninguno (Pastor/Asesor) —</option>
              ${grupoOptions}
            </select>
          </div>
          <button class="btn-primary" id="btn-add-usuario" style="height:40px;padding:0 18px;">Agregar</button>
        </div>
        <div id="admin-error" class="login-error hidden" style="margin-top:10px;"></div>
      </div>
    </div>`;

    // Eliminar grupo
    container.querySelectorAll('.btn-del-grupo').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este grupo?')) return;
        await deleteGrupo(btn.dataset.id);
        grupos = await getGrupos();
        render();
      });
    });

    // Agregar grupo
    container.querySelector('#btn-add-grupo').addEventListener('click', async () => {
      const nombre = container.querySelector('#new-grupo-nombre').value.trim();
      const sede = container.querySelector('#new-grupo-sede').value;
      if (!nombre) return;
      await createGrupo(nombre, sede);
      grupos = await getGrupos();
      render();
    });

    // Eliminar usuario
    container.querySelectorAll('.btn-del-usuario').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este usuario?')) return;
        await deleteUsuario(btn.dataset.id);
        usuarios = await getUsuarios();
        render();
      });
    });

    // Agregar usuario
    container.querySelector('#btn-add-usuario').addEventListener('click', async () => {
      const errEl = container.querySelector('#admin-error');
      const nombre = container.querySelector('#new-u-nombre').value.trim();
      const email  = container.querySelector('#new-u-email').value.trim();
      const pass   = container.querySelector('#new-u-pass').value;
      const rol    = container.querySelector('#new-u-rol').value;
      const grupoId = container.querySelector('#new-u-grupo').value;
      if (!nombre || !email || !pass) { errEl.textContent = 'Nombre, correo y contraseña son requeridos.'; errEl.classList.remove('hidden'); return; }
      errEl.classList.add('hidden');
      await createUsuario({ nombre, email, password: pass, rol, grupoId });
      usuarios = await getUsuarios();
      render();
    });
  }

  render();
}
