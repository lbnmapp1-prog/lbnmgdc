import { supabase, CONFIGURADO } from './supabase.js';
import { MILESTONES, CURSOS, APOYO } from './constants.js';

const app = document.getElementById('app');
const tokenId = new URLSearchParams(location.search).get('t') || null;
let tokenInfo = null;

const TEMPS = [{c:'M',l:'Melancólico'},{c:'F',l:'Flemático'},{c:'C',l:'Colérico'},{c:'S',l:'Sanguíneo'}];
const SEDES = ['Sede Este','Sede Oeste','Sede Cabudare','Sede 48','Sede 52'];

let selectedTemps  = [];
let selectedMs     = [];
let selectedCursos = [];
let selectedApoyo  = [];

function fail(msg){
  app.innerHTML = `<div style="text-align:center;padding:32px 0;">
    <p style="font-size:2rem;margin-bottom:12px;">⚠️</p>
    <p style="color:var(--muted);">${msg}</p>
  </div>`;
}

if(!CONFIGURADO){ fail('El sistema aún no está configurado.'); }
else { init(); }

async function init(){
  if(tokenId){
    const { data, error } = await supabase.rpc('registro_token_info', { p_token: tokenId });
    if(error || !data?.valido){
      fail(data?.error || 'Enlace no válido. Pídele a tu líder que te envíe uno nuevo.');
      return;
    }
    tokenInfo = data;
    if(tokenInfo.tipo === 'grupal' && tokenInfo.expira_en){
      const ms = new Date(tokenInfo.expira_en) - new Date();
      if(ms > 0){
        const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
        tokenInfo._expiraTexto = h>0 ? `${h}h ${m}min` : `${m} minutos`;
      }
    }
  }
  buildForm();
}

function sanitize(val, max=200){ return String(val||'').replace(/[<>"'\\]/g,'').trim().slice(0,max); }

function buildForm(){
  const esIndividual = tokenInfo?.tipo === 'individual';
  const esGrupal     = tokenInfo?.tipo === 'grupal';
  const nombreFijo   = esIndividual ? tokenInfo.nombre_persona : '';
  const grupoFijo    = tokenInfo?.grupo_nombre || '';

  const banner = esGrupal && grupoFijo ? `
    <div style="background:#e8f0fb;border:1px solid #c0d4f5;border-radius:10px;padding:11px 14px;margin-bottom:16px;font-size:13.5px;color:#1e5aa8;display:flex;align-items:center;gap:10px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.85M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <span>Te estás uniendo al grupo <strong>${grupoFijo}</strong>${tokenInfo._expiraTexto ? ` · Enlace válido por <strong>${tokenInfo._expiraTexto}</strong>` : ''}</span>
    </div>` :
  esIndividual && nombreFijo ? `
    <div style="background:#e8f0fb;border:1px solid #c0d4f5;border-radius:10px;padding:11px 14px;margin-bottom:16px;font-size:13.5px;color:#1e5aa8;display:flex;align-items:center;gap:10px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
      <span>Hola <strong>${nombreFijo}</strong>, este enlace fue creado especialmente para ti.</span>
    </div>` : '';

  app.innerHTML = `
    <h2>Formulario de inscripción</h2>
    <p class="subtitle">Completa tus datos. Tu líder revisará la información y te confirmará tu ingreso al grupo.</p>
    ${banner}

    <div class="card">
      <div class="card-title">Datos personales</div>
      <div class="form-row one" style="margin-bottom:12px;">
        <div class="form-group">
          <label for="f-nombre">Nombre completo <span class="req">*</span></label>
          <input id="f-nombre" type="text" placeholder="Ej: Juan Pérez" maxlength="100" autocomplete="name"
            value="${nombreFijo}" ${esIndividual && nombreFijo ? 'readonly' : ''}>
          <span class="field-err" id="err-nombre"></span>
        </div>
      </div>
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-group">
          <label for="f-tel">Teléfono <span class="req">*</span></label>
          <input id="f-tel" type="tel" placeholder="04140000000" maxlength="20" inputmode="numeric">
          <span class="field-hint">Solo números</span>
          <span class="field-err" id="err-tel"></span>
        </div>
        <div class="form-group">
          <label for="f-correo">Correo electrónico</label>
          <input id="f-correo" type="email" placeholder="tu@correo.com" maxlength="100" autocomplete="email" inputmode="email">
          <span class="field-err" id="err-correo"></span>
        </div>
      </div>
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-group">
          <label for="f-nac">Fecha de nacimiento</label>
          <input id="f-nac" type="date" max="${new Date().toISOString().slice(0,10)}">
          <span class="field-err" id="err-nac"></span>
        </div>
        <div class="form-group">
          <label for="f-civil">Estado civil</label>
          <select id="f-civil">
            <option value="">— Selecciona —</option>
            <option>Soltero/a</option><option>Casado/a</option>
            <option>Divorciado/a</option><option>Viudo/a</option><option>Unión libre</option>
          </select>
        </div>
      </div>
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-group">
          <label for="f-profesion">Profesión u oficio</label>
          <input id="f-profesion" type="text" placeholder="Ej: Docente, Ingeniero…" maxlength="100">
        </div>
        <div class="form-group">
          <label for="f-ocupacion">Ocupación actual</label>
          <input id="f-ocupacion" type="text" placeholder="Ej: Empleado, Independiente…" maxlength="100">
        </div>
      </div>
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-group">
          <label for="f-tiempo">Tiempo en la iglesia</label>
          <input id="f-tiempo" type="text" placeholder="Ej: 2 años" maxlength="50">
        </div>
        <div class="form-group">
          <label for="f-nro-hijos">N.º de hijos</label>
          <input id="f-nro-hijos" type="number" min="0" max="30" placeholder="0">
        </div>
      </div>
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-group">
          <label for="f-edades-hijos">Edades de los hijos</label>
          <input id="f-edades-hijos" type="text" placeholder="Ej: 5, 8 y 12 años" maxlength="100">
        </div>
        <div class="form-group">
          <label for="f-aniversario">Aniversario de bodas</label>
          <input id="f-aniversario" type="text" placeholder="DD/MM/AAAA" maxlength="20">
        </div>
      </div>
      <div class="form-row one">
        <div class="form-group">
          <label for="f-direccion">Dirección de habitación</label>
          <input id="f-direccion" type="text" placeholder="Calle, sector, municipio…" maxlength="200">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Datos ministeriales</div>
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-group">
          <label for="f-sede">Sede asignada</label>
          <select id="f-sede">
            <option value="">— Selecciona —</option>
            ${SEDES.map(s=>`<option>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="f-bautizado">¿Bautizado/a?</label>
          <select id="f-bautizado">
            <option value="">— Selecciona —</option>
            <option value="false">No</option>
            <option value="true">Sí</option>
          </select>
        </div>
      </div>
      <div class="form-row one" style="margin-bottom:12px;">
        <div class="form-group">
          <label for="f-padre-esp">Padre / Madre espiritual</label>
          <input id="f-padre-esp" type="text" placeholder="Nombre" maxlength="100">
        </div>
      </div>
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-group">
          <label for="f-disc-inicio">Inicio de discipulado</label>
          <input id="f-disc-inicio" type="text" placeholder="MM/AAAA" maxlength="20">
        </div>
        <div class="form-group">
          <label for="f-disc-fin">Culminación de discipulado</label>
          <input id="f-disc-fin" type="text" placeholder="MM/AAAA (vacío si en curso)" maxlength="20">
        </div>
      </div>
      ${!grupoFijo ? `
      <div class="form-row one">
        <div class="form-group">
          <label for="f-grupo">¿A qué grupo perteneces o quieres unirte?</label>
          <input id="f-grupo" type="text" placeholder="Nombre del grupo o líder" maxlength="100">
        </div>
      </div>` : '<input id="f-grupo" type="hidden" value="">'}
    </div>

    <div class="card">
      <div class="card-title">Dones y temperamento</div>
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-group">
          <label for="f-dones">Dones espirituales</label>
          <input id="f-dones" type="text" placeholder="Ej: Enseñanza, Música…" maxlength="200">
        </div>
        <div class="form-group">
          <label for="f-habilidades">Habilidades</label>
          <input id="f-habilidades" type="text" placeholder="Ej: Liderazgo, comunicación…" maxlength="200">
        </div>
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>Temperamento(s)</label>
        <div class="temp-chips" id="temp-chips"></div>
      </div>
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-group">
          <label for="f-mentor">Mentor</label>
          <input id="f-mentor" type="text" placeholder="Nombre del mentor" maxlength="100">
        </div>
      </div>
      <div class="form-row one">
        <div class="form-group">
          <label for="f-oracion">Motivos de oración</label>
          <textarea id="f-oracion" rows="3" placeholder="Escribe los motivos de oración…" maxlength="500"></textarea>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Ruta de crecimiento · Hitos completados</div>
      <div class="checkbox-grid" id="ms-grid"></div>
    </div>

    <div class="card">
      <div class="card-title">Datos ministeriales adicionales</div>
      <div class="checkbox-grid two" id="cursos-grid"></div>
    </div>

    <div class="card">
      <div class="card-title">Grupos de apoyo</div>
      <div class="checkbox-grid two" id="apoyo-grid"></div>
    </div>

    <div class="card">
      <div class="card-title">¿Cómo llegaste?</div>
      <div class="form-row one">
        <div class="form-group">
          <textarea id="f-como" rows="2" placeholder="Un amigo me invitó, vine a un evento, busqué en redes…" maxlength="300"></textarea>
          <span class="field-hint">Máx. 300 caracteres</span>
        </div>
      </div>
    </div>

    <div class="err-box" id="err-global"></div>
    <button class="btn-submit" id="btn-send">Enviar inscripción</button>
  `;

  renderTemps();
  renderMilestones();
  renderCursos();
  renderApoyo();

  document.getElementById('f-tel').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/[^0-9+]/g,'');
  });
  document.getElementById('f-nombre').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/[0-9<>"'\\]/g,'');
  });
  document.getElementById('btn-send').addEventListener('click', enviar);
}

function renderTemps(){
  const wrap = document.getElementById('temp-chips');
  if(!wrap) return;
  wrap.innerHTML = TEMPS.map(t => {
    const sel = selectedTemps.includes(t.c);
    return `<div class="temp-chip${sel?' selected':''}" data-temp="${t.c}">
      <div class="tc-box">${sel?`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`:''}</div>
      <span>${t.l}</span>
    </div>`;
  }).join('');
  wrap.querySelectorAll('.temp-chip').forEach(chip => chip.addEventListener('click', () => {
    const c = chip.dataset.temp;
    selectedTemps = selectedTemps.includes(c) ? selectedTemps.filter(x=>x!==c) : [...selectedTemps,c];
    renderTemps();
  }));
}

function renderMilestones(){
  const grid = document.getElementById('ms-grid');
  if(!grid) return;
  grid.innerHTML = MILESTONES.map((ml,i) => {
    const done = selectedMs.includes(i);
    return `<div class="checkbox-item${done?' checked':''}" data-ms="${i}">
      <div class="cb-box">${done?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`:''}</div>
      <div><div class="cb-label">${ml.t}</div><div class="cb-sub">${ml.s}</div></div>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-ms]').forEach(item => item.addEventListener('click', () => {
    const i = parseInt(item.dataset.ms);
    selectedMs = selectedMs.includes(i) ? selectedMs.filter(x=>x!==i) : [...selectedMs,i];
    renderMilestones();
  }));
}

function renderCursos(){
  const grid = document.getElementById('cursos-grid');
  if(!grid) return;
  grid.innerHTML = CURSOS.map((c,i) => {
    const done = selectedCursos.includes(c);
    return `<div class="checkbox-item${done?' checked':''}" data-curso="${i}">
      <div class="cb-box">${done?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`:''}</div>
      <div class="cb-label">${c}</div>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-curso]').forEach(item => item.addEventListener('click', () => {
    const c = CURSOS[parseInt(item.dataset.curso)];
    selectedCursos = selectedCursos.includes(c) ? selectedCursos.filter(x=>x!==c) : [...selectedCursos,c];
    renderCursos();
  }));
}

function renderApoyo(){
  const grid = document.getElementById('apoyo-grid');
  if(!grid) return;
  grid.innerHTML = APOYO.map((a,i) => {
    const done = selectedApoyo.includes(a);
    return `<div class="checkbox-item${done?' checked':''}" data-apoyo="${i}">
      <div class="cb-box">${done?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>`:''}</div>
      <div class="cb-label">${a}</div>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-apoyo]').forEach(item => item.addEventListener('click', () => {
    const a = APOYO[parseInt(item.dataset.apoyo)];
    selectedApoyo = selectedApoyo.includes(a) ? selectedApoyo.filter(x=>x!==a) : [...selectedApoyo,a];
    renderApoyo();
  }));
}

function fieldErr(id, msg){
  const el = document.getElementById('err-'+id);
  const inp = document.getElementById('f-'+id);
  if(el){ el.textContent = msg; el.classList.toggle('show', !!msg); }
  if(inp){ inp.classList.toggle('error', !!msg); }
}

async function enviar(){
  ['nombre','tel','correo','nac'].forEach(k => fieldErr(k,''));
  const errGlobal = document.getElementById('err-global');
  errGlobal.classList.remove('show');

  const nombre   = document.getElementById('f-nombre').value.trim();
  const telefono = document.getElementById('f-tel').value.replace(/[^0-9+]/g,'');
  const correo   = document.getElementById('f-correo').value.trim().toLowerCase();
  const nac      = document.getElementById('f-nac').value;
  const civil    = document.getElementById('f-civil').value;
  const grupo    = sanitize(document.getElementById('f-grupo').value);
  const como     = sanitize(document.getElementById('f-como').value, 300);

  let valid = true;
  if(nombre.length < 2){ fieldErr('nombre','El nombre es requerido.'); valid=false; }
  if(telefono.length < 7){ fieldErr('tel','Ingresa un teléfono válido (mín. 7 dígitos).'); valid=false; }
  if(correo && !/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(correo)){
    fieldErr('correo','El correo no tiene un formato válido.'); valid=false;
  }
  if(nac){
    const d = new Date(nac), ahora = new Date();
    if(d > new Date(ahora - 10*365.25*24*3600*1000) || d < new Date(ahora - 100*365.25*24*3600*1000)){
      fieldErr('nac','Fecha de nacimiento inválida.'); valid=false;
    }
  }
  if(!valid) return;

  const nivelIdx = selectedMs.length ? Math.max(...selectedMs) : null;
  const btn = document.getElementById('btn-send');
  btn.disabled = true; btn.textContent = 'Enviando…';

  try {
    const rpcArgs = {
      p_datos: {
        nombre, telefono, correo: correo||null, fecha_nacimiento: nac||null,
        estado_civil: civil||null, grupo_nombre: grupo||null, como_llego: como||null,
        profesion:      sanitize(document.getElementById('f-profesion').value),
        ocupacion:      sanitize(document.getElementById('f-ocupacion').value),
        tiempo_iglesia: sanitize(document.getElementById('f-tiempo').value, 50),
        nro_hijos:      document.getElementById('f-nro-hijos').value !== '' ? parseInt(document.getElementById('f-nro-hijos').value)||0 : null,
        edades_hijos:   sanitize(document.getElementById('f-edades-hijos').value),
        aniversario:    sanitize(document.getElementById('f-aniversario').value, 20),
        direccion:      sanitize(document.getElementById('f-direccion').value),
        sede:           document.getElementById('f-sede').value || null,
        padre_esp:      sanitize(document.getElementById('f-padre-esp').value),
        disc_inicio:    sanitize(document.getElementById('f-disc-inicio').value, 20),
        disc_fin:       sanitize(document.getElementById('f-disc-fin').value, 20),
        bautizado:      document.getElementById('f-bautizado').value !== '' ? document.getElementById('f-bautizado').value : null,
        dones:          sanitize(document.getElementById('f-dones').value),
        habilidades:    sanitize(document.getElementById('f-habilidades').value),
        mentor:         sanitize(document.getElementById('f-mentor').value),
        oracion:        sanitize(document.getElementById('f-oracion').value, 500),
        temperamentos:  selectedTemps.length ? selectedTemps : null,
        nivel_idx:      nivelIdx,
        cursos_completados: selectedCursos.length ? selectedCursos : null,
        apoyo_completados:  selectedApoyo.length  ? selectedApoyo  : null,
      }
    };
    if(tokenId) rpcArgs.p_token = tokenId;

    const { error } = await supabase.rpc('registro_publico_enviar', rpcArgs);
    if(error) throw new Error(error.message);

    app.innerHTML = `<div class="ok-screen">
      <p class="ok-icon">🎉</p>
      <h1>¡Listo!</h1>
      <p>Tu inscripción fue enviada. Tu líder la revisará y te confirmará tu ingreso al grupo de crecimiento.</p>
    </div>`;
  } catch(e){
    errGlobal.textContent = e.message || 'Hubo un error. Revisa tu conexión e intenta de nuevo.';
    errGlobal.classList.add('show');
    btn.disabled = false; btn.textContent = 'Enviar inscripción';
  }
}
