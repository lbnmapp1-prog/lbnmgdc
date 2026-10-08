import { getClases, createClase, updateClase, deleteClase, subirArchivoClase } from '../db.js';
import { isAdmin } from '../main.js';
import { PILARES, CLASES_POR_PILAR } from '../constants.js';

const ICON_EDIT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`;
const ICON_DEL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a3b52" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;
const ICON_PDF = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>`;

function fmtFecha(f) {
  if (!f) return 'Sin fecha';
  const d = new Date(`${f}T00:00:00`);
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function renderTemas(container, navigate) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;
  let clases;
  try {
    clases = await getClases();
  } catch (e) {
    container.innerHTML = `<div class="card" style="color:#9a3b52;padding:24px;"><b>Error al cargar Organizador de Temas:</b><br><code style="font-size:12px;">${e.message}</code><br><br>Si el problema continúa, avisa al administrador del sistema.</div>`;
    return;
  }
  let editingSlot = null; // { pilar, orden, clase } | null
  const admin = isAdmin();

  function slotHtml(pilar, orden) {
    const clase = clases.find(c => c.pilar === pilar.nombre && c.orden === orden);

    if (!clase) {
      return admin
        ? `<div class="org-member" style="border:1.5px dashed #d7dde6;color:#9aa5b5;justify-content:center;" data-add-pilar="${pilar.nombre}" data-add-orden="${orden}">
             <span style="font-size:12.5px;font-weight:600;">+ Agregar clase ${orden}</span>
           </div>`
        : `<div class="org-member" style="cursor:default;opacity:.55;justify-content:center;">
             <span style="font-size:12px;color:#9aa5b5;">Clase ${orden} — sin programar</span>
           </div>`;
    }

    return `
      <div class="org-member" style="cursor:default;">
        <div class="avatar sm" style="background:${pilar.color};">${orden}</div>
        <div style="min-width:0;flex:1;">
          <div style="font-size:13px;font-weight:600;color:#14223a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${clase.titulo || '(Sin título)'}</div>
          <div style="font-size:11px;color:#8a94a8;">${fmtFecha(clase.fecha)}${clase.hora ? ' · ' + clase.hora : ''}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          ${clase.archivo ? `<a class="btn-icon" href="${clase.archivo.url}" target="_blank" rel="noopener" title="Descargar PDF" style="color:#9a3b52;">${ICON_PDF}</a>` : ''}
          ${admin ? `
            <button class="btn-icon btn-edit-clase" data-pilar="${pilar.nombre}" data-orden="${orden}" title="Editar" style="color:#56607a;">${ICON_EDIT}</button>
            <button class="btn-icon btn-del-clase" data-id="${clase.id}" title="Eliminar">${ICON_DEL}</button>
          ` : ''}
        </div>
      </div>`;
  }

  function formHtml() {
    const { pilar, orden, clase } = editingSlot;
    const f = clase || {};
    return `
    <div class="form-section" id="clase-form" style="margin-bottom:18px;">
      <div class="section-label">${f.id ? 'Editar' : 'Agregar'} clase ${orden} · ${pilar}</div>
      <div class="form-row">
        <div class="form-group span2"><label>Título de la clase *</label><input id="cl-titulo" value="${f.titulo || ''}" placeholder="Ej: Introducción a la oración" /></div>
        <div class="form-group"><label>Fecha</label><input id="cl-fecha" type="date" value="${f.fecha || ''}" /></div>
        <div class="form-group"><label>Hora</label><input id="cl-hora" placeholder="Ej: 6:00 PM" value="${f.hora || ''}" /></div>
        <div class="form-group span2"><label>Descripción</label><textarea id="cl-descripcion" rows="2" placeholder="Contenido o notas de la clase...">${f.descripcion || ''}</textarea></div>
        <div class="form-group span2"><label>Material (PDF, máx. 5MB)</label><input id="cl-archivo" type="file" accept="application/pdf" />
          ${f.archivo ? `<div style="font-size:12px;color:#8a94a8;margin-top:6px;">Archivo actual: <a href="${f.archivo.url}" target="_blank" rel="noopener">${f.archivo.filename}</a> (se reemplaza si subes uno nuevo)</div>` : ''}
        </div>
      </div>
      <div id="cl-error" class="login-error hidden" style="margin-top:10px;"></div>
      <div class="form-actions" style="margin-top:14px;">
        <button class="btn-secondary" id="btn-cancel-clase">Cancelar</button>
        <button class="btn-primary" id="btn-save-clase">${f.id ? 'Guardar cambios' : 'Agregar clase'}</button>
      </div>
    </div>`;
  }

  function render() {
    const pilarCards = PILARES.map(p => {
      const slots = [];
      for (let i = 1; i <= CLASES_POR_PILAR; i++) slots.push(slotHtml(p, i));
      const count = clases.filter(c => c.pilar === p.nombre).length;
      return `
      <div class="org-card">
        <div class="org-card-header" style="border-top:4px solid ${p.color};">
          <div style="font-size:14px;font-weight:700;color:#14223a;">${p.nombre}</div>
          <div style="font-size:11.5px;color:#8a94a8;margin-top:2px;">${count}/${CLASES_POR_PILAR} clases programadas</div>
        </div>
        <div class="org-card-body">${slots.join('')}</div>
      </div>`;
    }).join('');

    container.innerHTML = `
    <div class="page-wrap fade-up">
      ${editingSlot ? formHtml() : ''}
      <div class="org-grid">${pilarCards}</div>
    </div>`;

    container.querySelectorAll('[data-add-pilar]').forEach(el => {
      el.addEventListener('click', () => {
        editingSlot = { pilar: el.dataset.addPilar, orden: parseInt(el.dataset.addOrden, 10), clase: null };
        render();
        container.querySelector('#clase-form')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    container.querySelectorAll('.btn-edit-clase').forEach(btn => {
      btn.addEventListener('click', () => {
        const clase = clases.find(c => c.pilar === btn.dataset.pilar && c.orden === parseInt(btn.dataset.orden, 10));
        editingSlot = { pilar: btn.dataset.pilar, orden: parseInt(btn.dataset.orden, 10), clase };
        render();
        container.querySelector('#clase-form')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    container.querySelectorAll('.btn-del-clase').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm('¿Eliminar esta clase?')) return;
        await deleteClase(btn.dataset.id);
        clases = await getClases();
        render();
      });
    });

    container.querySelector('#btn-cancel-clase')?.addEventListener('click', () => { editingSlot = null; render(); });

    container.querySelector('#btn-save-clase')?.addEventListener('click', async () => {
      const { pilar, orden, clase } = editingSlot;
      const errEl = container.querySelector('#cl-error');
      const titulo = container.querySelector('#cl-titulo').value.trim();
      if (!titulo) { errEl.textContent = 'El título es requerido.'; errEl.classList.remove('hidden'); return; }
      const fields = {
        pilar, orden, titulo,
        fecha: container.querySelector('#cl-fecha').value,
        hora: container.querySelector('#cl-hora').value,
        descripcion: container.querySelector('#cl-descripcion').value,
      };
      const archivoInput = container.querySelector('#cl-archivo');
      const file = archivoInput.files[0] || null;
      const btn = container.querySelector('#btn-save-clase');
      btn.textContent = file ? 'Guardando y subiendo PDF...' : 'Guardando...'; btn.disabled = true;
      try {
        let id = clase?.id;
        if (id) await updateClase(id, fields);
        else { const nueva = await createClase(fields); id = nueva.id; }
        if (file) await subirArchivoClase(id, file);
        editingSlot = null;
        clases = await getClases();
        render();
      } catch (e) {
        errEl.textContent = e.message;
        errEl.classList.remove('hidden');
        btn.textContent = clase?.id ? 'Guardar cambios' : 'Agregar clase';
        btn.disabled = false;
      }
    });
  }

  render();
}
