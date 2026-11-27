// Pruebas del aprendizaje (v34). Sin red ni base de datos.
import { assertEquals } from 'jsr:@std/assert@1.0.13';
import { armarPares, filtrarPropuestas, type MensajeHist } from './aprendizaje.ts';

let id = 0;
const t0 = Date.parse('2026-11-20T15:00:00Z');
function m(conv: number, dir: 'inbound' | 'outbound', quien: string, texto: string, minutos: number): MensajeHist {
  return { id: ++id, conversation_id: conv, direction: dir, sender_type: quien, content: texto, sent_at: new Date(t0 + minutos * 60_000).toISOString() };
}

Deno.test('Arma el par pregunta del cliente → respuesta del equipo', () => {
  const pares = armarPares([
    m(1, 'inbound', 'cliente', '¿Tienen estacionamiento?', 0),
    m(1, 'outbound', 'agente', 'Sí, en la calle de atrás 😊', 5),
  ]);
  assertEquals(pares.length, 1);
  assertEquals(pares[0].pregunta, '¿Tienen estacionamiento?');
  assertEquals(pares[0].respuesta, 'Sí, en la calle de atrás 😊');
});

Deno.test('Une varios mensajes seguidos del cliente y del equipo', () => {
  const pares = armarPares([
    m(2, 'inbound', 'cliente', 'Hola buenas', 0),
    m(2, 'inbound', 'cliente', '¿aceptan mascotas?', 1),
    m(2, 'outbound', 'agente', '¡Claro!', 3),
    m(2, 'outbound', 'agente', 'En la terraza', 4),
  ]);
  assertEquals(pares[0].pregunta, 'Hola buenas ¿aceptan mascotas?');
  assertEquals(pares[0].respuesta, '¡Claro!\nEn la terraza');
});

Deno.test('No aprende de respuestas de la IA ni de mensajes triviales', () => {
  const pares = armarPares([
    m(3, 'inbound', 'cliente', '¿Cuál es su horario?', 0),
    m(3, 'outbound', 'ia', 'De 9 a 18', 1),
    m(3, 'outbound', 'agente', 'Cualquier duda aquí estamos', 2),   // ya contestó la IA
    m(3, 'inbound', 'cliente', 'gracias', 3),
    m(3, 'outbound', 'agente', '¡A ti!', 4),                         // "gracias" no es pregunta
  ]);
  assertEquals(pares.length, 0);
});

Deno.test('Respuesta después de 24 h no cuenta', () => {
  const pares = armarPares([
    m(4, 'inbound', 'cliente', '¿Hacen eventos privados?', 0),
    m(4, 'outbound', 'agente', 'Sí', 25 * 60),
  ]);
  assertEquals(pares.length, 0);
});

const pares = [
  { conversationId: 10, messageId: 100, pregunta: '¿tienen estacionamiento?', respuesta: 'Sí' },
  { conversationId: 11, messageId: 110, pregunta: 'hay donde estacionar?', respuesta: 'Sí, atrás' },
  { conversationId: 10, messageId: 101, pregunta: 'y estacionamiento?', respuesta: 'Sí' },
];

Deno.test('Solo acepta preguntas de al menos 2 conversaciones distintas', () => {
  const ok = filtrarPropuestas([{ pregunta: '¿Tienen estacionamiento?', respuesta: 'Sí, atrás', ejemplos: [0, 1], motivo: 'x' }], pares, []);
  assertEquals(ok.length, 1);
  assertEquals(ok[0].times_asked, 2);
  const misma = filtrarPropuestas([{ pregunta: '¿Tienen estacionamiento?', respuesta: 'Sí', ejemplos: [0, 2], motivo: 'x' }], pares, []);
  assertEquals(misma.length, 0); // las dos son de la conversación 10
});

Deno.test('Descarta índices inventados y preguntas que ya existen', () => {
  assertEquals(filtrarPropuestas([{ pregunta: 'X', respuesta: 'Y', ejemplos: [0, 99], motivo: '' }], pares, []).length, 0);
  assertEquals(filtrarPropuestas([{ pregunta: '¿Tienen estacionamiento?', respuesta: 'Sí', ejemplos: [0, 1], motivo: '' }],
    pares, ['¿tienen ESTACIONAMIENTO?']).length, 0);
});

// ---------- Estilo del equipo (opción 3) ----------
import { elegirEjemplosEstilo } from './aprendizaje.ts';
import { sugerirRespuesta } from './engine.ts';
import { analisisJson, FakeProvider, limitesDePrueba, MemoryLedger } from './testing/fakes.ts';
import { assertStringIncludes } from 'jsr:@std/assert@1.0.13';

const paresEstilo = [
  { conversationId: 1, messageId: 1, pregunta: '¿tienen terraza?', respuesta: '¡Hola! 😊 Sí, tenemos terraza' },
  { conversationId: 2, messageId: 2, pregunta: '¿cuál es el precio del paquete parejas?', respuesta: 'Buen día ✨ el paquete cuesta $999' },
  { conversationId: 3, messageId: 3, pregunta: 'hola', respuesta: 'Buen día ✨' },
];

Deno.test('Estilo: prefiere ejemplos con palabras en común', () => {
  const e = elegirEjemplosEstilo(paresEstilo, 'qué incluye el paquete para parejas', 1);
  assertEquals(e[0].respuesta, 'Buen día ✨ el paquete cuesta $999');
});

Deno.test('Estilo: los ejemplos llegan al modelo en su propio bloque', async () => {
  const provider = new FakeProvider([{ text: analisisJson() }]);
  await sugerirRespuesta({
    companyId: 1, conversationId: 1, mensaje: '¿tienen terraza?', historial: [], generacionesUltimaHora: 0,
    fuentes: [], estilo: elegirEjemplosEstilo(paresEstilo, '¿tienen terraza?'),
  }, { provider, ledger: new MemoryLedger({ 1: limitesDePrueba() }) });
  assertStringIncludes(provider.llamadas[0].messages[0].content, '<estilo_del_equipo>');
});

Deno.test('Estilo: un precio copiado de un ejemplo (no de <conocimiento>) se bloquea', async () => {
  const provider = new FakeProvider([{ text: analisisJson({ respuesta_sugerida: 'Buen día ✨ el paquete cuesta $999' }) }]);
  const r = await sugerirRespuesta({
    companyId: 1, conversationId: 1, mensaje: '¿precio del paquete parejas?', historial: [], generacionesUltimaHora: 0,
    fuentes: ['Paquete parejas: incluye cena'], estilo: paresEstilo,
  }, { provider, ledger: new MemoryLedger({ 1: limitesDePrueba() }) });
  assertEquals(r.desenlace, 'bloqueada');
});
