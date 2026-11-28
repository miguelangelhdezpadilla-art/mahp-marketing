// Pruebas de sugerencias de campaña (v35). Sin red ni base de datos.
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1.0.13';
import { armarDatos, normalizarRecomendaciones, proyectar, validarAnalisisCampanas } from './campanas.ts';

const ayer = '2026-11-27';
const dias = (desde: number, hasta: number, spend: number, conv: number, id = 'c1') =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => {
    const d = new Date(`${ayer}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (desde + i));
    return { campaign_id: id, fecha: d.toISOString().slice(0, 10), spend, conversations: conv };
  });

Deno.test('Proyección: mismo ritmo de los últimos 7 días', () => {
  const p = proyectar([...dias(0, 6, 10, 2), ...dias(7, 13, 50, 1)], ayer);
  assertEquals(p?.gasto, 70);
  assertEquals(p?.conversaciones, 14);
  assertEquals(p?.costo_por_conversacion, 5);
});

Deno.test('Proyección: sin gasto reciente no hay', () => {
  assertEquals(proyectar(dias(7, 13, 50, 1), ayer), null);
});

Deno.test('Datos: compara periodos y trae la proyección', () => {
  const diarias = [...dias(0, 6, 10, 2), ...dias(7, 13, 10, 1)];
  const datos = armarDatos([{ campaign_id: 'c1', name: 'Mensajes', effective_status: 'ACTIVE' }], diarias, ayer,
    [{ tipo: 'X', nivel: null, texto: 'Usa Reels', mejora: null, puntos: 12, url: null }], 78, proyectar(diarias, ayer));
  assertStringIncludes(datos, 'costo por conversación $5.00 (antes $10.00, cambio -50%)');
  assertStringIncludes(datos, '78 de 100');
  assertStringIncludes(datos, 'Usa Reels (+12 puntos)');
  assertStringIncludes(datos, 'Proyección próximos 7 días');
});

Deno.test('Validación: descarta frases con cifras que no están en los datos', () => {
  const datos = 'gasto $70.00; costo por conversación $5.00, cambio -50%';
  const a = validarAnalisisCampanas(JSON.stringify({
    resumen: 'El costo bajó 50% a $5.00.',
    hallazgos: ['Bien', 'Subirá a $99.00'],
    sugerencias: [{ titulo: 'Sube presupuesto', detalle: 'Ganarás 30% más', prioridad: 'alta' }, { titulo: 'Renueva anuncios', detalle: 'Cambia la imagen', prioridad: 'x' }],
    proyeccion: 'Gastarías $70.00',
  }), datos)!;
  assertEquals(a.resumen, 'El costo bajó 50% a $5.00.');
  assertEquals(a.hallazgos, ['Bien']);
  assertEquals(a.sugerencias, [{ titulo: 'Renueva anuncios', detalle: 'Cambia la imagen', prioridad: 'media' }]);
  assertEquals(a.quitadas, 2);
});

Deno.test('Validación: salida que no es JSON → null', () => {
  assertEquals(validarAnalisisCampanas('hola', ''), null);
});

Deno.test('Recomendaciones: forma de cuenta y de portfolio', () => {
  const cuenta = normalizarRecomendaciones({ data: [{ recommendations: [{
    type: 'MUSIC', recommendation_content: { body: 'Agrega música', lift_estimate: '5% menos costo', opportunity_score_lift: '14' },
    url: 'https://adsmanager.facebook.com/x', }] }] });
  assertEquals(cuenta[0], { tipo: 'MUSIC', nivel: null, texto: 'Agrega música', mejora: '5% menos costo', puntos: 14, url: 'https://adsmanager.facebook.com/x' });
  const negocio = normalizarRecomendaciones({ data: [{ ad_account_id: '1', opportunity_score: 78, recommendations: [{
    recommendation_name: 'reels_pc_recommendation', level: 'ad_set', opportunity_score_lift: '26', url: 'https://evil.example/x' }] }] });
  assertEquals(negocio[0].texto, 'reels pc recommendation');
  assertEquals(negocio[0].puntos, 26);
  assertEquals(negocio[0].url, null);
});
