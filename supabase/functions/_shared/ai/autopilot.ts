// Decide si una respuesta del motor se envía sola al cliente (modo
// automático, ADR-022). Función pura: todo lo que necesita llega como
// dato, así que cada salvaguarda tiene su prueba sin red ni base.
//
// Resultado:
//   enviar     → mandar la respuesta de la IA.
//   transferir → no mandarla; mandar el mensaje de transferencia de la
//                empresa (texto fijo, no generado) y pausar la IA en la
//                conversación hasta que una persona la resuelva.
//   nada       → no mandar nada; queda como propuesta en la bandeja.
import type { Analisis } from './validate.ts';
import type { Desenlace } from './engine.ts';

export type Accion = 'enviar' | 'transferir' | 'nada';

export interface ContextoEnvio {
  modo: 'manual' | 'asistido' | 'automatico';
  /** Interruptor global de plataforma (secreto AI_AUTO_SEND_ENABLED). */
  interruptorGlobal: boolean;
  pausaEmpresa: boolean;
  pausaConversacion: boolean;
  desenlace: Desenlace;
  analisis?: Analisis;
  minConfianza: number;
  /** Han pasado menos de 24 h desde el último mensaje del cliente. */
  dentroDeVentana: boolean;
  respuestasAutoUltimaHora: number;
  maxAutoPorHora: number;
  /** El cliente escribió otra vez después de este mensaje (ráfaga): contesta la corrida del más nuevo. */
  hayMensajeMasNuevo: boolean;
  hayMensajeTransferencia: boolean;
}

export interface Decision { accion: Accion; motivo: string }

// Intenciones que nunca se contestan solas aunque la confianza sea alta.
// 'reserva' ya no está aquí (PO, 2026-11-26): explicar cómo reservar con
// la información publicada (app, enlace) es informar. Confirmar una
// reservación, disponibilidad o grupos lo marca el modelo como
// requiere_humano (prompt social-v5) y eso sí transfiere (ADR-022 #7).
const INTENCIONES_SIEMPRE_HUMANO = new Set(['queja']);

export function decidirEnvio(c: ContextoEnvio): Decision {
  // Paros: ni respuesta ni transferencia automática.
  if (c.modo !== 'automatico') return { accion: 'nada', motivo: `modo ${c.modo}` };
  if (!c.interruptorGlobal) return { accion: 'nada', motivo: 'envío automático apagado en la plataforma' };
  if (c.pausaEmpresa) return { accion: 'nada', motivo: 'automático en pausa para la empresa' };
  if (c.pausaConversacion) return { accion: 'nada', motivo: 'la IA está pausada en esta conversación (transferida a una persona)' };
  if (c.hayMensajeMasNuevo) return { accion: 'nada', motivo: 'el cliente siguió escribiendo; se contesta al mensaje más reciente' };
  if (!c.dentroDeVentana) return { accion: 'nada', motivo: 'fuera de la ventana de 24 h de Meta' };

  // Mensajes triviales (gracias, ok, emoji): no ameritan respuesta.
  if (c.desenlace === 'omitido') return { accion: 'nada', motivo: 'mensaje trivial' };

  const transferir = (motivo: string): Decision => c.hayMensajeTransferencia
    ? { accion: 'transferir', motivo }
    : { accion: 'nada', motivo: `${motivo} (sin mensaje de transferencia configurado)` };

  // Sin respuesta utilizable (presupuesto, error, bloqueo por validación).
  if (c.desenlace !== 'propuesta' || !c.analisis) return transferir(`sin respuesta segura: ${c.desenlace}`);

  const a = c.analisis;
  if (a.requiere_humano) return transferir(`requiere humano: ${a.motivo_humano || 'sin detalle'}`);
  if (INTENCIONES_SIEMPRE_HUMANO.has(a.intencion)) return transferir(`intención "${a.intencion}" siempre la atiende una persona`);
  if (a.fuentes_usadas.length === 0) return transferir('la respuesta no se basa en información publicada del negocio');
  if (a.confianza < c.minConfianza) {
    return transferir(`confianza ${a.confianza.toFixed(2)} menor que el mínimo ${c.minConfianza.toFixed(2)}`);
  }
  if (c.respuestasAutoUltimaHora >= c.maxAutoPorHora) {
    return transferir(`tope de ${c.maxAutoPorHora} respuestas automáticas por hora en esta conversación`);
  }
  return { accion: 'enviar', motivo: `confianza ${a.confianza.toFixed(2)}, basada en ${a.fuentes_usadas.join(', ')}` };
}
