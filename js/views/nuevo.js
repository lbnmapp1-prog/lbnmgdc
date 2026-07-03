import { getGrupos, createMiembro, getMiembro, updateMiembro } from '../db.js';
import { getCurrentProfile, isAdmin, getCurrentGrupoId } from '../main.js';
import { MILESTONES, CURSOS, APOYO } from '../constants.js';

const TEMPS = [{ c:'M', l:'Melancólico'}, { c:'F', l:'Flemático'}, { c:'C', l:'Colérico'}, { c:'S', l:'Sanguíneo'}];

export async function renderNuevo(container, navigate, params = {}) {
  container.innerHTML = `<div class="spinner">Cargando...</div>`;
  let grupos = await getGrupos();
  if (!isAdmin()) {
    const gid = getCurrentGrupoId();
    grupos = grupos.filter(g => g.id === gid);
  }
  const editId = params.editId || null;
  let existing = null;
  if (editId) {
    existing = await getMiembro(editId);
    if (!isAdmin() && existing.grupo_id !== getCurrentGrupoId()) {
      container.innerHTML = `<div class="empty-state">No tienes acceso a este miembro — pertenece a otro Grupo de Cuidado.</div>`;
      return;
    }
  }

  const f = existing || {};
  let selectedTemps = f.temperamentos || [];
  let selectedMs = f.nivel_idx != null ? MILESTONES.slice(0, f.nivel_idx + 1).map((_,i)=>i) : [];
  let selectedCursos = f.cursos_completados || [];
  let selectedApoyo = f.apoyo_completados || [];

  function renderChips() {
    const wrap = container.querySelector('#temp-chips');
    if (!wrap) return;
    wrap.innerHTML = TEMPS.map(t => {
      const sel = selectedTemps.includes(t.c);
      return `<div class="temp-chip${sel?' selected':''}" data-temp="${t.c}">
        <div class="tc-box">${sel?`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`:''}</div>
        <span>${t.l}</span>
      </div>`;
    }).join('');
    wrap.querySelectorAll('.temp-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const c = chip.dataset.temp;
        if (selectedTemps.includes(c)) selectedTemps = selectedTemps.filter(x=>x!==c);
        else selectedTemps.push(c);
        renderChips();
      });
    });
  }

  function renderMilestones() {
    const grid = container.querySelector('#ms-grid');
    if (!grid) return;
    grid.innerHTML = MILESTONES.map((ml, i) => {
      const done = selectedMs.includes(i);
      return `<div class="checkbox-item${done?' checked':''}" data-ms="${i}">
        <div class="cb-box">${done?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`:''}</div>
        <div><div class="cb-label">${ml.t}</div><div class="cb-sub">${ml.s}</div></div>
      </div>`;
    }).join('');
    grid.querySelectorAll('.checkbox-item[data-ms]').forEach(item => {
      item.addEventListener('click', () => {
        const i = parseInt(item.dataset.ms);
        if (selectedMs.includes(i)) selectedMs = selectedMs.filter(x=>x!==i);
        else selectedMs.push(i);
        renderMilestones();
      });
    });
  }

  function renderCursos() {
    const grid = container.querySelector('#cursos-grid');
    if (!grid) return;
    grid.innerHTML = CURSOS.map((c, i) => {
      const done = selectedCursos.includes(c);
      return `<div class="checkbox-item${done?' checked':''}" data-curso="${i}">
        <div class="cb-box">${done?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`:''}</div>
        <div class="cb-label">${c}</div>
      </div>`;
    }).join('');
    grid.querySelectorAll('[data-curso]').forEach(item => {
      item.addEventListener('click', () => {
        const c = CURSOS[parseInt(item.dataset.curso)];
        if (selectedCursos.includes(c)) selectedCursos = selectedCursos.filter(x=>x!==c);
        else selectedCursos.push(c);
        renderCursos();
      });
    });
  }

  function renderApoyo() {
    const grid = container.querySelector('#apoyo-grid');
    if (!grid) return;
    grid.innerHTML = APOYO.map((a, i) => {
      const done = selectedApoyo.includes(a);
      return `<div class="checkbox-item${done?' checked':''}" data-apoyo="${i}">
        <div class="cb-box">${done?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`:''}</div>
        <div class="cb-label">${a}</div>
      </div>`;
    }).join('');
    grid.querySelectorAll('[data-apoyo]').forEach(item => {
      item.addEventListener('click', () => {
        const a = APOYO[parseInt(item.dataset.apoyo)];
        if (selectedApoyo.includes(a)) selectedApoyo = selectedApoyo.filter(x=>x!==a);
        else selectedApoyo.push(a);
        renderApoyo();
      });
    });
  }

  function renderForm() {
    const grupoOptions = grupos.map(g => `<option value="${g.id}" ${f.grupo_id===g.id?'selected':''}>${g.nombre}</option>`).join('');

    const tempChips = TEMPS.map(t => {
      const sel = selectedTemps.includes(t.c);
      return `<div class="temp-chip${sel?' selected':''}" data-temp="${t.c}">
        <div class="tc-box">${sel?`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`:''}</div>
        <span>${t.l}</span>
      </div>`;
    }).join('');

    const msItems = MILESTONES.map((ml, i) => {
      const done = selectedMs.includes(i);
      return `<div class="checkbox-item${done?' checked':''}" data-ms="${i}">
        <div class="cb-box">${done?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`:''}</div>
        <div><div class="cb-label">${ml.t}</div><div class="cb-sub">${ml.s}</div></div>
      </div>`;
    }).join('');

    container.innerHTML = `
    <div class="page-wrap narrow fade-up">
      <button class="back-link" id="btn-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
        Volver a Miembros
      </button>

      <div class="form-section">
        <div class="section-label">Datos personales</div>
        <div class="form-row">
          <div class="form-group span2"><label>Nombre completo *</label><input id="f-nombre" value="${f.nombre||''}" placeholder="Ej: María González" /></div>
          <div class="form-group"><label>Teléfono</label><input id="f-telefono" value="${f.telefono||''}" placeholder="04XX-XXXXXXX" /></div>
          <div class="form-group"><label>Correo electrónico</label><input id="f-correo" type="email" value="${f.correo||''}" placeholder="correo@gmail.com" /></div>
          <div class="form-group"><label>Fecha de nacimiento</label><input id="f-fecha-nac" value="${f.fecha_nacimiento||''}" placeholder="DD/MM/AAAA" /></div>
          <div class="form-group"><label>Estado civil</label>
            <select id="f-estado-civil">
              <option value="Soltero" ${f.estado_civil==='Soltero'?'selected':''}>Soltero/a</option>
              <option value="Casado" ${f.estado_civil==='Casado'?'selected':''}>Casado/a</option>
              <option value="Divorciado" ${f.estado_civil==='Divorciado'?'selected':''}>Divorciado/a</option>
              <option value="Viudo" ${f.estado_civil==='Viudo'?'selected':''}>Viudo/a</option>
            </select>
          </div>
          <div class="form-group"><label>Profesión u oficio</label><input id="f-profesion" value="${f.profesion||''}" placeholder="Ej: Docente, Ingeniero..." /></div>
          <div class="form-group"><label>Ocupación actual</label><input id="f-ocupacion" value="${f.ocupacion||''}" placeholder="Ej: Empleado, Independiente..." /></div>
          <div class="form-group"><label>Tiempo en la iglesia</label><input id="f-tiempo" value="${f.tiempo_iglesia||''}" placeholder="Ej: 2 años" /></div>
          <div class="form-group"><label>N.º de hijos</label><input id="f-nro-hijos" type="number" min="0" value="${f.nro_hijos ?? 0}" /></div>
          <div class="form-group"><label>Edades de los hijos</label><input id="f-edades-hijos" value="${f.edades_hijos||''}" placeholder="Ej: 5, 8 y 12 años" /></div>
          <div class="form-group"><label>Aniversario de bodas</label><input id="f-aniversario" value="${f.aniversario||''}" placeholder="DD/MM/AAAA" /></div>
          <div class="form-group span2"><label>Dirección de habitación</label><input id="f-direccion" value="${f.direccion||''}" placeholder="Calle, sector, municipio..." /></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px;">
        <div class="form-section" style="margin-bottom:0;">
          <div class="section-label">Datos ministeriales</div>
          <div class="form-row single">
            <div class="form-group"><label>Rol en el área *</label>
              <select id="f-rol">
                <option value="Miembro" ${f.rol==='Miembro'||!f.rol?'selected':''}>Miembro</option>
                <option value="Padre Espiritual" ${f.rol==='Padre Espiritual'?'selected':''}>Padre Espiritual</option>
                <option value="Líder Asistente" ${f.rol==='Líder Asistente'?'selected':''}>Líder Asistente</option>
                <option value="Líder de Grupo" ${f.rol==='Líder de Grupo'?'selected':''}>Líder de Grupo</option>
              </select>
            </div>
            <div class="form-group"><label>Grupo de Cuidado *</label><select id="f-grupo">${grupoOptions}</select></div>
            <div class="form-group"><label>Sede asignada</label>
              <select id="f-sede">
                <option value="">— Seleccionar —</option>
                <option value="Sede Este" ${f.sede==='Sede Este'?'selected':''}>Sede Este</option>
                <option value="Sede Oeste" ${f.sede==='Sede Oeste'?'selected':''}>Sede Oeste</option>
                <option value="Sede Cabudare" ${f.sede==='Sede Cabudare'?'selected':''}>Sede Cabudare</option>
                <option value="Sede 48" ${f.sede==='Sede 48'?'selected':''}>Sede 48</option>
                <option value="Sede 52" ${f.sede==='Sede 52'?'selected':''}>Sede 52</option>
              </select>
            </div>
            <div class="form-group"><label>Padre / Madre espiritual</label><input id="f-padre-esp" value="${f.padre_esp||''}" placeholder="Nombre" /></div>
            <div class="form-group"><label>Inicio de discipulado</label><input id="f-disc-inicio" value="${f.disc_inicio||''}" placeholder="MM/AAAA" /></div>
            <div class="form-group"><label>Culminación de discipulado</label><input id="f-disc-fin" value="${f.disc_fin||''}" placeholder="MM/AAAA (o vacío si está en curso)" /></div>
            <div class="form-group"><label>¿Bautizado?</label>
              <select id="f-bautizado">
                <option value="false" ${!f.bautizado?'selected':''}>No</option>
                <option value="true" ${f.bautizado?'selected':''}>Sí</option>
              </select>
            </div>
          </div>
        </div>
        <div class="form-section" style="margin-bottom:0;">
          <div class="section-label">Dones y temperamento</div>
          <div class="form-row single">
            <div class="form-group"><label>Dones espirituales</label><input id="f-dones" value="${f.dones||''}" placeholder="Ej: Enseñanza, Música..." /></div>
            <div class="form-group"><label>Habilidades</label><input id="f-habilidades" value="${f.habilidades||''}" placeholder="Ej: Liderazgo, comunicación..." /></div>
            <div class="form-group"><label>Temperamento(s)</label><div class="temp-chips" id="temp-chips">${tempChips}</div></div>
            <div class="form-group"><label>Mentor</label><input id="f-mentor" value="${f.mentor||''}" placeholder="Nombre del mentor" /></div>
            <div class="form-group"><label>Motivos de oración</label><textarea id="f-oracion" rows="3" placeholder="Escribe los motivos de oración...">${f.oracion||''}</textarea></div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="section-label">Ruta de crecimiento · Hitos completados</div>
        <div class="checkbox-grid" id="ms-grid">${msItems}</div>
      </div>

      <div class="form-section">
        <div class="section-label">Datos ministeriales adicionales</div>
        <div class="checkbox-grid" id="cursos-grid"></div>
      </div>

      <div class="form-section">
        <div class="section-label">Grupos de apoyo</div>
        <div class="checkbox-grid" id="apoyo-grid"></div>
      </div>

      <div id="form-error" class="login-error hidden"></div>
      <div class="form-actions">
        <button class="btn-secondary" id="btn-cancel">Cancelar</button>
        <button class="btn-primary" id="btn-save">${editId ? 'Guardar cambios' : 'Guardar registro'}</button>
      </div>
    </div>`;

    // Temperamentos — solo re-renderiza los chips
    container.querySelectorAll('.temp-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const c = chip.dataset.temp;
        if (selectedTemps.includes(c)) selectedTemps = selectedTemps.filter(x=>x!==c);
        else selectedTemps.push(c);
        renderChips();
      });
    });

    // Milestones — solo re-renderiza los hitos
    container.querySelectorAll('.checkbox-item[data-ms]').forEach(item => {
      item.addEventListener('click', () => {
        const i = parseInt(item.dataset.ms);
        if (selectedMs.includes(i)) selectedMs = selectedMs.filter(x=>x!==i);
        else selectedMs.push(i);
        renderMilestones();
      });
    });

    container.querySelector('#btn-back')?.addEventListener('click', () => navigate('miembros'));
    container.querySelector('#btn-cancel')?.addEventListener('click', () => navigate('miembros'));
    container.querySelector('#btn-save')?.addEventListener('click', async () => {
      const nombre = container.querySelector('#f-nombre').value.trim();
      if (!nombre) { container.querySelector('#form-error').textContent = 'El nombre es requerido.'; container.querySelector('#form-error').classList.remove('hidden'); return; }
      const nivelIdx = selectedMs.length ? Math.max(...selectedMs) : 0;
      const fields = {
        nombre,
        telefono: container.querySelector('#f-telefono').value,
        correo: container.querySelector('#f-correo').value,
        fecha_nacimiento: container.querySelector('#f-fecha-nac').value || null,
        estado_civil: container.querySelector('#f-estado-civil').value,
        profesion: container.querySelector('#f-profesion').value,
        ocupacion: container.querySelector('#f-ocupacion').value,
        tiempo_iglesia: container.querySelector('#f-tiempo').value,
        nro_hijos: parseInt(container.querySelector('#f-nro-hijos').value, 10) || 0,
        edades_hijos: container.querySelector('#f-edades-hijos').value,
        aniversario: container.querySelector('#f-aniversario').value,
        direccion: container.querySelector('#f-direccion').value,
        rol: container.querySelector('#f-rol').value,
        grupo_id: container.querySelector('#f-grupo').value,
        sede: container.querySelector('#f-sede').value,
        padre_esp: container.querySelector('#f-padre-esp').value,
        disc_inicio: container.querySelector('#f-disc-inicio').value,
        disc_fin: container.querySelector('#f-disc-fin').value,
        bautizado: container.querySelector('#f-bautizado').value === 'true',
        dones: container.querySelector('#f-dones').value,
        habilidades: container.querySelector('#f-habilidades').value,
        mentor: container.querySelector('#f-mentor').value,
        oracion: container.querySelector('#f-oracion').value,
        temperamentos: selectedTemps,
        nivel_idx: nivelIdx,
        cursos_completados: selectedCursos,
        apoyo_completados: selectedApoyo,
      };
      try {
        let saved;
        if (editId) saved = await updateMiembro(editId, fields);
        else saved = await createMiembro(fields);
        navigate('ficha', { id: saved.id });
      } catch (e) {
        container.querySelector('#form-error').textContent = e.message;
        container.querySelector('#form-error').classList.remove('hidden');
      }
    });
  }

  renderForm();
  renderCursos();
  renderApoyo();
}
