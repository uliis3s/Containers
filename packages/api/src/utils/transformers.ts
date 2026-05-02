import { generatePresignedUrl } from '../services/storage.service'
import type {
  DbCaja,
  DbConductor,
  DbFoto,
  DbInspeccion,
  DbSolicitud,
  DbTractor,
  DbUsuario,
} from './types'

// ── Sync transformers (no photo URLs) ─────────────────────────────────────────

export function toPublicUsuario(u: DbUsuario) {
  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol }
  // passwordHash never included — not even as undefined
}

export function toPublicTractor(t: DbTractor) {
  return { id: t.id, truckNumero: t.truckNumero, placas: t.placas }
}

export function toPublicCaja(c: DbCaja) {
  return {
    id: c.id,
    numero: c.numero,
    tipo: c.tipo,
    isoCode: c.isoCode,
    longitud: c.longitud,
    ancho: c.ancho,
    alto: c.alto,
  }
}

// ── Async transformers (generate pre-signed photo URLs) ────────────────────────

export async function toPublicConductor(c: DbConductor) {
  return {
    id: c.id,
    transportistaId: c.transportistaId,
    idInterno: c.idInterno,
    nombre: c.nombre,
    licenciaNumero: c.licenciaNumero,
    fastNumero: c.fastNumero,
    visaNumero: c.visaNumero,
    fotoUrl: c.fotoUrl ? await generatePresignedUrl(c.fotoUrl) : null,
    activo: c.activo,
    // fechaNacimiento intentionally omitted — not needed in API responses
    // passwordHash never exists on conductor, but explicit omission documents intent
  }
}

async function toPublicFoto(f: DbFoto) {
  return {
    id: f.id,
    categoria: f.categoria,
    url: await generatePresignedUrl(f.url), // pre-signed, never raw R2 path
    ocrValidado: f.ocrValidado,
    // ocrTexto (raw OCR output) omitted from general responses
  }
}

export async function toPublicInspeccion(i: DbInspeccion) {
  return {
    id: i.id,
    momento: i.momento,
    resultado: i.resultado,
    medicionOk: i.medicionOk,
    discrepanciaDetalle: i.discrepanciaDetalle,
    iaPlacasOk: i.iaPlacasOk,
    iaSelloOk: i.iaSelloOk,
    creadoEn: i.creadoEn,
    fotos: await Promise.all(i.fotos.map(toPublicFoto)),
  }
}

export async function toPublicSolicitud(s: DbSolicitud) {
  return {
    id: s.id,
    status: s.status,
    tipoOperacion: s.tipoOperacion,
    canalOrigen: s.canalOrigen,
    comentarioLogistica: s.comentarioLogistica,
    creadoEn: s.creadoEn,
    aprobadoEn: s.aprobadoEn,
    conductor: s.conductor ? await toPublicConductor(s.conductor) : null,
    tractor: s.tractor ? toPublicTractor(s.tractor) : null,
    cajaDrop: s.cajaDrop ? toPublicCaja(s.cajaDrop) : null,
    cajaPickup: s.cajaPickup ? toPublicCaja(s.cajaPickup) : null,
    sellos: s.sellos.map((sel) => ({
      numero: sel.numero,
      tipo: sel.tipo,
      orden: sel.orden,
    })),
    transportista: { id: s.transportista.id, nombre: s.transportista.nombre },
  }
}
