import { getGrupos, createGrupo, deleteGrupo } from '../db.js';
import { getUsuarios, createUsuario, deleteUsuario, updateUsuario } from '../auth.js';
import { canManageClaves } from '../main.js';

const SEDES = ['Sede Este', 'Sede Oeste', 'Sede Cabudare', 'Sede 48', 'Sede 52'];
const ROLES = ['Líder de Grupo', 'Líder Asesor', 'Pastor de Área', 'Super Usuario'];

export async function renderAdmin(container, navigate) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;

  let grupos = await getGrupos();
  let usuarios = await getUsuarios();
  let editingUserId = null;
  const revealedPass = new Set();
  const puedeClaves = canManageClaves();

  function render() {
    const grupoOptions = grupos.map(g => `<option value="${g.id}">${g.nombre}</option>`).join('');
    const rolOptions = (sel) => ROLES.map(r => `<option value="${r}" ${sel===r?'selected':''}>${r}</option>`).join('');

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
          ${usuarios.map(u => {
            const g = grupos.find(gr => gr.id === u.grupoId);
            if (editingUserId === u.id) {
              return `
              <div class="user-edit-row" style="padding:12px 14px;background:#f5f7fb;border-radius:10px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                  <div class="form-group" style="margin:0;"><label>Nombre</label><input class="edit-u-nombre" value="${u.nombre}" /></div>
                  <div class="form-group" style="margin:0;"><label>Correo</label><input class="edit-u-email" type="email" value="${u.email}" /></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                  <div class="form-group" style="margin:0;"><label>Rol</label><select class="edit-u-rol">${rolOptions(u.rol)}</select></div>
                  <div class="form-group" style="margin:0;"><label>Grupo asignado</label>
                    <select class="edit-u-grupo">
                      <option value="">— Ninguno (Pastor/Asesor) —</option>
                      ${grupos.map(gr => `<option value="${gr.id}" ${u.grupoId===gr.id?'selected':''}>${gr.nombre}</option>`).join('')}
                    </select>
                  </div>
                </div>
                ${puedeClaves ? `
                <div class="form-group" style="margin:0 0 10px;"><label>Nueva contraseña (dejar vacío para no cambiar)</label><input class="edit-u-pass" type="text" placeholder="••••••" /></div>
                ` : ''}
                <div style="display:flex;gap:8px;">
                  <button class="btn-secondary btn-cancel-edit-usuario" style="flex:1;justify-content:center;">Cancelar</button>
                  <button class="btn-primary btn-save-usuario" data-id="${u.id}" style="flex:1;">Guardar cambios</button>
                </div>
              </div>`;
            }
            return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f5f7fb;border-radius:10px;">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;color:#14223a;">${u.nombre}</div>
                <div style="font-size:12px;color:#8a94a8;">${u.email} · ${u.rol}${g ? ' · ' + g.nombre : ''}</div>
                ${puedeClaves ? `
                <div style="font-size:12px;color:#8a94a8;margin-top:4px;display:flex;align-items:center;gap:6px;">
                  Clave: <span style="font-family:'IBM Plex Mono',monospace;">${revealedPass.has(u.id) ? (u.password || '—') : '••••••••'}</span>
                  <button class="btn-toggle-pass" data-id="${u.id}" style="border:none;background:none;color:#1e5aa8;font-weight:600;font-size:11.5px;cursor:pointer;padding:0;">${revealedPass.has(u.id) ? 'Ocultar' : 'Ver'}</button>
                </div>` : ''}
              </div>
              <button class="btn-icon btn-edit-usuario" data-id="${u.id}" title="Editar">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#56607a" stroke-width="1.9" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
              </button>
              <button class="btn-icon btn-del-usuario" data-id="${u.id}" title="Eliminar">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a3b52" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>`;
          }).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
          <div class="form-group" style="margin:0;"><label>Nombre completo</label><input id="new-u-nombre" placeholder="Nombre..." /></div>
          <div class="form-group" style="margin:0;"><label>Correo</label><input id="new-u-email" type="email" placeholder="correo@..." /></div>
          <div class="form-group" style="margin:0;"><label>Contraseña</label><input id="new-u-pass" type="password" placeholder="••••••" /></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;">
          <div class="form-group" style="margin:0;"><label>Rol</label>
            <select id="new-u-rol">${rolOptions()}</select>
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
        try {
          await deleteUsuario(btn.dataset.id);
          usuarios = await getUsuarios();
          render();
        } catch (e) {
          alert('Error: ' + e.message);
        }
      });
    });

    // Ver / ocultar clave
    container.querySelectorAll('.btn-toggle-pass').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (revealedPass.has(id)) revealedPass.delete(id); else revealedPass.add(id);
        render();
      });
    });

    // Editar usuario
    container.querySelectorAll('.btn-edit-usuario').forEach(btn => {
      btn.addEventListener('click', () => {
        editingUserId = btn.dataset.id;
        render();
      });
    });
    container.querySelectorAll('.btn-cancel-edit-usuario').forEach(btn => {
      btn.addEventListener('click', () => {
        editingUserId = null;
        render();
      });
    });
    container.querySelectorAll('.btn-save-usuario').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.user-edit-row');
        const nombre = row.querySelector('.edit-u-nombre').value.trim();
        const email = row.querySelector('.edit-u-email').value.trim();
        const rol = row.querySelector('.edit-u-rol').value;
        const grupoId = row.querySelector('.edit-u-grupo').value;
        const passInput = row.querySelector('.edit-u-pass');
        const password = passInput ? passInput.value : '';
        if (!nombre || !email) return;
        btn.textContent = 'Guardando...'; btn.disabled = true;
        try {
          await updateUsuario(btn.dataset.id, { nombre, email, rol, grupoId, password });
          editingUserId = null;
          usuarios = await getUsuarios();
          render();
        } catch (e) {
          alert('Error: ' + e.message);
          btn.textContent = 'Guardar cambios'; btn.disabled = false;
        }
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
      if (pass.length < 8) { errEl.textContent = 'La contraseña debe tener al menos 8 caracteres.'; errEl.classList.remove('hidden'); return; }
      errEl.classList.add('hidden');
      const btn = container.querySelector('#btn-add-usuario');
      btn.textContent = 'Agregando...'; btn.disabled = true;
      try {
        await createUsuario({ nombre, email, password: pass, rol, grupoId });
        usuarios = await getUsuarios();
        render();
      } catch (e) {
        errEl.textContent = e.message;
        errEl.classList.remove('hidden');
        btn.textContent = 'Agregar'; btn.disabled = false;
      }
    });
  }

  render();
}
