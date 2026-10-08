import { AREAS_RUEDA } from './constants.js';

const HINTS = {
  Dios: 'Oración, lectura de la Biblia, intimidad con Dios.',
  Familia: 'Tu relación con tus padres, hermanos, pareja o hijos.',
  Relaciones: 'Tu vida sentimental y la calidad de tus vínculos cercanos.',
  Amigos: 'Amistades sanas que te edifican.',
  Salud: 'Salud física y emocional, descanso, alimentación.',
  Dinero: 'Orden en tus finanzas, ahorro y deudas.',
  Profesion: 'Estudios, trabajo o emprendimiento.',
  VidaAdulta: 'Responsabilidad, toma de decisiones e independencia.',
  Ocio: 'Descanso, hobbies y tiempo de calidad.',
};

const app = document.getElementById('app');
const miembroId = new URLSearchParams(location.search).get('m') || '';

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fail(msg) { app.innerHTML = `<div class="card ok"><h1>Enlace no válido</h1><p class="lead">${esc(msg)}</p></div>`; }

async function init() {
  if (!miembroId) return fail('Pídele a tu líder que te envíe el enlace de nuevo.');
  let nombre;
  try {
    const r = await fetch(`/api/evaluacion?m=${encodeURIComponent(miembroId)}`);
    const d = await r.json();
    if (!r.ok) return fail(d.error || 'Pídele a tu líder que te envíe el enlace de nuevo.');
    nombre = d.nombre;
  } catch { return fail('No se pudo cargar. Revisa tu conexión e intenta de nuevo.'); }

  const valores = {};
  app.innerHTML = `
    <h1>Hola${nombre ? `, ${esc(nombre)}` : ''} 👋</h1>
    <p class="lead">Esta es la <b>rueda de tu vida</b>. Mueve cada barra para indicar cómo te sientes hoy en cada área, del <b>1</b> (muy mal) al <b>10</b> (excelente). Sé honesto: no hay respuestas correctas. Tu líder la revisará contigo.</p>
    ${AREAS_RUEDA.map(a => `
      <div class="card">
        <div class="area-top"><span class="area-name">${a.label}</span><span class="val unset" id="v-${a.key}">–</span></div>
        <div class="area-hint">${HINTS[a.key] || ''}</div>
        <input type="range" min="1" max="10" step="1" value="5" data-k="${a.key}" />
      </div>`).join('')}
    <div class="card">
      <div class="area-name" style="margin-bottom:8px;">¿Algo más que quieras compartir? (opcional)</div>
      <textarea id="comentario" rows="3" maxlength="1000"></textarea>
    </div>
    <div id="err" class="err hidden"></div>
    <button id="enviar">Enviar</button>`;

  app.querySelectorAll('input[type=range]').forEach(inp => {
    const show = () => {
      valores[inp.dataset.k] = Number(inp.value);
      const el = document.getElementById(`v-${inp.dataset.k}`);
      el.textContent = inp.value; el.classList.remove('unset');
    };
    inp.addEventListener('input', show);
    inp.addEventListener('change', show);
  });

  const btn = document.getElementById('enviar');
  btn.addEventListener('click', async () => {
    const errEl = document.getElementById('err');
    errEl.classList.add('hidden');
    if (AREAS_RUEDA.some(a => !valores[a.key])) {
      errEl.textContent = 'Mueve la barra de cada área para responderla (aunque sea un 5).';
      errEl.classList.remove('hidden');
      return;
    }
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const r = await fetch('/api/evaluacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ m: miembroId, valores, comentario: document.getElementById('comentario').value }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error al enviar.');
      app.innerHTML = `<div class="card ok"><h1>¡Gracias! 🙏</h1><p class="lead">Tu evaluación fue enviada. Tu líder la revisará contigo en la próxima conversación.</p></div>`;
    } catch (e) {
      errEl.textContent = e.message;
      errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Enviar';
    }
  });
}

init();
