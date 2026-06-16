import { getEventos, createEvento, deleteEvento } from '../db.js';
import { isAdmin } from '../main.js';

const DAYS = ['L','M','X','J','V','S','D'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const EV_COLORS = { reunion:'#1e5aa8', evento:'#9a3b52', servicio:'#2f7d6b', capacitacion:'#9a5b2b', retiro:'#6b4e9a' };

let calState = { y: new Date().getFullYear(), m: new Date().getMonth() };

export async function renderCalendario(container, navigate) {
  async function render() {
    container.innerHTML = `<div class="spinner">Cargando...</div>`;
    const { y, m } = calState;
    const eventos = await getEventos(y, m);
    const evMap = {};
    eventos.forEach(e => {
      const d = new Date(e.fecha).getUTCDate();
      (evMap[d] = evMap[d] || []).push(e);
    });

    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const isToday = (d) => today.getFullYear()===y && today.getMonth()===m && today.getDate()===d;

    let cells = '';
    for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell blank"></div>`;
    for (let d = 1; d <= days; d++) {
      const evs = (evMap[d] || []).map(e => `<div class="cal-ev-chip" style="background:${EV_COLORS[e.tipo]||'#8a94a8'};">${e.titulo}</div>`).join('');
      cells += `<div class="cal-cell${isToday(d)?' today':''}"><div class="cal-num">${d}</div>${evs}</div>`;
    }
    const rem = (startDow + days) % 7;
    if (rem) for (let i = rem; i < 7; i++) cells += `<div class="cal-cell blank"></div>`;

    const evList = eventos.map(e => {
      const d = new Date(e.fecha);
      const color = EV_COLORS[e.tipo] || '#8a94a8';
      return `
        <div class="cal-ev-item">
          <div class="cal-ev-day"><div class="day-num">${d.getUTCDate()}</div><div class="day-mon">${d.toLocaleString('es',{month:'short'})}</div></div>
          <div class="cal-ev-info">
            <div class="ev-title">${e.titulo}</div>
            <div class="ev-sub">${e.hora||''} ${e.lugar?'· '+e.lugar:''}</div>
          </div>
          <div class="cal-dot" style="background:${color};"></div>
        </div>`;
    }).join('') || '<div class="text-muted text-sm">Sin eventos este mes</div>';

    container.innerHTML = `
    <div class="page-wrap fade-up">
      <div class="cal-grid-layout">
        <div class="card" style="padding:0;overflow:hidden;">
          <div class="cal-header">
            <button class="cal-nav-btn" id="cal-prev">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#56607a" stroke-width="2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div class="cal-month">${MONTHS[m]} ${y}</div>
            <button class="cal-nav-btn" id="cal-next">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#56607a" stroke-width="2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
          <div class="cal-dow">${DAYS.map(d=>`<span>${d}</span>`).join('')}</div>
          <div class="cal-cells">${cells}</div>
        </div>
        <div class="flex-col gap-14">
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <div class="card-title">Eventos del mes</div>
              ${isAdmin() ? `<button class="btn-primary sm" id="btn-show-form">+ Agregar</button>` : ''}
            </div>
            <div id="form-evento" style="display:none;margin-bottom:16px;">
              <div class="form-section" style="padding:14px;margin-bottom:0;">
                <div style="display:flex;flex-direction:column;gap:10px;">
                  <input id="ev-titulo" placeholder="Título del evento" style="padding:9px 12px;border:1px solid #d7dde6;border-radius:9px;font-size:13.5px;outline:none;" />
                  <input id="ev-fecha" type="date" style="padding:9px 12px;border:1px solid #d7dde6;border-radius:9px;font-size:13.5px;outline:none;" />
                  <input id="ev-hora" placeholder="Hora (ej: 7:00 PM)" style="padding:9px 12px;border:1px solid #d7dde6;border-radius:9px;font-size:13.5px;outline:none;" />
                  <input id="ev-lugar" placeholder="Lugar" style="padding:9px 12px;border:1px solid #d7dde6;border-radius:9px;font-size:13.5px;outline:none;" />
                  <select id="ev-tipo" style="padding:9px 12px;border:1px solid #d7dde6;border-radius:9px;font-size:13.5px;outline:none;">
                    <option value="reunion">Reunión</option>
                    <option value="evento">Evento especial</option>
                    <option value="servicio">Servicio general</option>
                    <option value="capacitacion">Capacitación</option>
                    <option value="retiro">Retiro</option>
                  </select>
                  <div style="display:flex;gap:8px;">
                    <button class="btn-secondary" id="btn-cancel-ev" style="flex:1;justify-content:center;">Cancelar</button>
                    <button class="btn-primary" id="btn-save-ev" style="flex:1;">Guardar</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="cal-event-list">${evList}</div>
          </div>
          <div class="card">
            <div class="card-title" style="margin-bottom:12px;">Leyenda</div>
            <div class="flex-col gap-8">
              <div class="legend-item"><div class="legend-dot" style="background:#1e5aa8;"></div>Reunión</div>
              <div class="legend-item"><div class="legend-dot" style="background:#9a3b52;"></div>Evento especial</div>
              <div class="legend-item"><div class="legend-dot" style="background:#2f7d6b;"></div>Servicio general</div>
              <div class="legend-item"><div class="legend-dot" style="background:#9a5b2b;"></div>Capacitación</div>
              <div class="legend-item"><div class="legend-dot" style="background:#6b4e9a;"></div>Retiro</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    container.querySelector('#cal-prev')?.addEventListener('click', () => {
      calState.m--; if (calState.m < 0) { calState.m = 11; calState.y--; } render();
    });
    container.querySelector('#cal-next')?.addEventListener('click', () => {
      calState.m++; if (calState.m > 11) { calState.m = 0; calState.y++; } render();
    });

    const formEl = container.querySelector('#form-evento');
    container.querySelector('#btn-show-form')?.addEventListener('click', () => {
      formEl.style.display = formEl.style.display === 'none' ? '' : 'none';
    });
    container.querySelector('#btn-cancel-ev')?.addEventListener('click', () => {
      formEl.style.display = 'none';
    });
    container.querySelector('#btn-save-ev')?.addEventListener('click', async () => {
      const titulo = container.querySelector('#ev-titulo').value.trim();
      const fecha  = container.querySelector('#ev-fecha').value;
      if (!titulo || !fecha) return;
      const btn = container.querySelector('#btn-save-ev');
      btn.textContent = 'Guardando...'; btn.disabled = true;
      await createEvento({
        titulo,
        fecha,
        hora:  container.querySelector('#ev-hora').value,
        lugar: container.querySelector('#ev-lugar').value,
        tipo:  container.querySelector('#ev-tipo').value,
      });
      render();
    });
  }

  await render();
}
