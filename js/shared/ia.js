import { sHtml as s } from '../ui.js';

const CANALES_DEFECTO = ['Instagram', 'Facebook', 'TikTok', 'Operaciones'];

const CANAL_COLORS = {
  'instagram': { bg: '#fce7f3', color: '#9d174d' },
  'facebook':  { bg: '#dbeafe', color: '#1e40af' },
  'tiktok':    { bg: '#f0fdf4', color: '#166534' },
};

const CANAL_CAL_COLOR = {
  'instagram':   '#e91e8c',
  'facebook':    '#1877f2',
  'tiktok':      '#010101',
  'operaciones': '#f59e0b',
};

function canalStyle(canal) {
  const key = canal.toLowerCase();
  const c = CANAL_COLORS[key];
  return c
    ? `background:${c.bg}; color:${c.color};`
    : 'background:var(--surface-1); color:var(--text-secondary);';
}

function mesFormateado(yyyymm) {
  const [y, m] = yyyymm.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

function fechaFormateada(yyyy_mm_dd) {
  const d = new Date(yyyy_mm_dd + 'T12:00');
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleDateString('es-MX', { weekday: 'long' });
}

// ── Formulario ────────────────────────────────────────────────
export async function renderFormIA(supabase, companyId, showToast) {
  const cont = document.getElementById('formIA');
  if (!cont) return;

  const mesDefault = new Date().toISOString().slice(0, 7);

  const [{ data: campanias }, { data: canalesBD }] = await Promise.all([
    supabase.from('campaigns').select('id, name').eq('company_id', companyId).eq('status', 'activa'),
    supabase.from('social_channels').select('id, name, icon').eq('company_id', companyId).order('name'),
  ]);

  const canales = canalesBD?.length ? canalesBD : CANALES_DEFECTO.map((n, i) => ({ id: i, name: n, icon: '' }));

  const optsCampanias = [
    '<option value="">Sin campaña específica</option>',
    ...(campanias ?? []).map(c => `<option value="${c.id}">${s(c.name)}</option>`)
  ].join('');

  cont.innerHTML = `
    <div class="ia-form-section">
      <div class="ia-form-row">
        <div class="ia-form-group">
          <label class="ia-form-label">Campaña</label>
          <select id="iaCampania" class="ia-form-select">${optsCampanias}</select>
        </div>
        <div class="ia-form-group">
          <label class="ia-form-label">Mes</label>
          <input type="month" id="iaMes" class="ia-form-input" value="${mesDefault}">
        </div>
      </div>

      <div class="ia-form-group">
        <label class="ia-form-label">Canales</label>
        <div class="ia-canales-grid">
          ${canales.map(c => `
            <label class="ia-canal-chip">
              <input type="checkbox" name="iaCanal" value="${s(c.name)}" checked>
              ${c.icon ? s(c.icon) + ' ' : ''}${s(c.name)}
            </label>`).join('')}
        </div>
      </div>

      <div class="ia-form-group">
        <label class="ia-form-label">Frecuencia de publicación</label>
        <select id="iaFrecuencia" class="ia-form-select">
          <option value="2 por semana">2 por semana</option>
          <option value="3 por semana" selected>3 por semana</option>
          <option value="5 por semana">5 por semana</option>
          <option value="Diario">Diario</option>
        </select>
      </div>

      <div class="ia-form-group">
        <label class="ia-form-label">Contexto adicional</label>
        <textarea id="iaContexto" class="ia-form-textarea"
          placeholder="Describe tu negocio, promociones especiales, eventos del mes..."></textarea>
      </div>

      <button class="ia-btn-generar" onclick="window._generarCalendario()">
        ✨ Generar calendario
      </button>
    </div>`;

  window._generarCalendario = () => generarCalendarioIA(supabase, companyId, showToast);
}

// ── Llamada a la API ──────────────────────────────────────────
export async function generarCalendarioIA(supabase, companyId, showToast) {
  const resultado = document.getElementById('resultadoIA');
  const btn = document.querySelector('.ia-btn-generar');

  const campaignId = document.getElementById('iaCampania')?.value || null;
  const mes        = document.getElementById('iaMes')?.value || new Date().toISOString().slice(0, 7);
  const frecuencia = document.getElementById('iaFrecuencia')?.value || '3 por semana';
  const contexto   = document.getElementById('iaContexto')?.value?.trim() || 'Negocio general';

  const canalesChecked = [...document.querySelectorAll('input[name="iaCanal"]:checked')]
    .map(el => el.value);

  if (!canalesChecked.length) {
    showToast('Selecciona al menos un canal.', 'error');
    return;
  }

  let nombreCampania = 'Sin campaña';
  if (campaignId) {
    const sel = document.getElementById('iaCampania');
    nombreCampania = sel?.options[sel.selectedIndex]?.text || 'Sin campaña';
  }

  const prompt = `Eres un experto en marketing digital.
Genera un calendario de actividades para el mes de ${mesFormateado(mes)} para la campaña "${nombreCampania}".

Canales seleccionados: ${canalesChecked.join(', ')}
Frecuencia: ${frecuencia}
Contexto del negocio: ${contexto}

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin bloques de código, sin explicaciones. El formato exacto es:

{
  "actividades": [
    {
      "titulo": "Título de la actividad",
      "canal": "Nombre del canal",
      "fecha": "YYYY-MM-DD",
      "descripcion": "Descripción breve de qué publicar"
    }
  ]
}

Genera entre 8 y 16 actividades distribuidas en el mes de ${mes}.
Usa fechas reales del mes solicitado (formato YYYY-MM-DD).
Los títulos deben ser concretos y accionables.`;

  if (resultado) {
    resultado.innerHTML = `
      <div class="ia-spinner-box">
        <div class="ia-spinner"></div>
        <p class="ia-spinner-text">Claude está creando tu calendario...</p>
        <p class="ia-spinner-sub">Esto puede tomar unos segundos</p>
      </div>`;
  }
  if (btn) btn.disabled = true;

  try {
    const { data, error } = await supabase.functions.invoke('generar-calendario', {
      body: { prompt }
    });

    if (error) throw new Error(error.message ?? 'Error al llamar a la función de IA');
    if (data?.error) throw new Error(data.error);

    const texto = data.choices?.[0]?.message?.content ?? '';

    let parsed;
    try {
      parsed = JSON.parse(texto);
    } catch {
      const match = texto.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('La respuesta no contiene JSON válido.');
    }

    const actividades = parsed.actividades ?? [];
    if (!actividades.length) throw new Error('El modelo no generó actividades.');

    await renderResultadoIA(actividades, campaignId, mes, supabase, companyId, showToast);
  } catch (err) {
    showToast('Error al generar: ' + err.message, 'error');
    if (resultado) resultado.innerHTML = '';
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── Mostrar resultado ─────────────────────────────────────────
export async function renderResultadoIA(actividades, campaignId, mes, supabase, companyId, showToast) {
  const cont = document.getElementById('resultadoIA');
  if (!cont) return;

  const { data: colaboradores } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('company_id', companyId)
    .eq('role', 'collaborator');

  const optsColaboradores = [
    '<option value="">Sin asignar</option>',
    ...(colaboradores ?? []).map(c => `<option value="${c.id}">${s(c.full_name || c.id)}</option>`)
  ].join('');

  cont.innerHTML = `
    <div class="ia-resultado-box">
      <div class="ia-resultado-header">
        <span class="ia-resultado-title">✨ Calendario generado — ${mesFormateado(mes)}</span>
        <div class="ia-resultado-actions">
          <button class="btn-regenerar" onclick="window._generarCalendario()">↺ Regenerar</button>
          <button class="btn-publicar" onclick="window._publicarCalendario()">Publicar al equipo →</button>
        </div>
      </div>
      <div class="ia-form-group" style="margin-bottom:12px;">
        <label class="ia-form-label">Asignar todas las actividades a</label>
        <select id="iaAsignarA" class="ia-form-select">${optsColaboradores}</select>
      </div>
      <div class="ia-act-list">
        ${actividades.map(a => `
          <div class="ia-act-item">
            <div class="ia-act-titulo">${s(a.titulo)}</div>
            <div class="ia-act-fecha">${fechaFormateada(a.fecha)}</div>
            <span class="ia-act-canal" style="${canalStyle(a.canal)}">${s(a.canal)}</span>
          </div>`).join('')}
      </div>
      <p class="ia-nota">
        Al publicar, estas actividades se agregan al calendario de tu empresa
        y aparecerán en "Mis tareas" del colaborador asignado.
      </p>
    </div>`;

  window._publicarCalendario = () => {
    const assigned_to = document.getElementById('iaAsignarA')?.value || null;
    publicarCalendario(actividades, campaignId, companyId, supabase, showToast, assigned_to);
  };
}

// ── Publicar en Supabase ──────────────────────────────────────
export async function publicarCalendario(actividades, campaignId, companyId, supabase, showToast, assigned_to = null) {
  const filas = actividades.map(a => ({
    company_id:   companyId,
    campaign_id:  campaignId || null,
    assigned_to,
    titulo:       a.titulo,
    canal:        a.canal,
    descripcion:  a.descripcion,
    fecha:        a.fecha,
    status:       'pendiente',
    progress_pct: 0,
    color:        CANAL_CAL_COLOR[a.canal?.toLowerCase()] ?? '#6366f1',
  }));

  const { error } = await supabase.from('actividades').insert(filas);

  if (error) {
    showToast('Error al publicar: ' + error.message, 'error');
    return;
  }

  showToast('✅ Calendario publicado al equipo');

  const resultado = document.getElementById('resultadoIA');
  const formIA    = document.getElementById('formIA');
  if (resultado) resultado.innerHTML = '';
  if (formIA) formIA.style.display = 'block';

  if (window._recargarActividades) await window._recargarActividades();
}
