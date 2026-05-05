// Shared domain types that mirror the Prisma-generated schema.
// Once `prisma generate` has run, replace the Rol block below with:
//   export { Rol } from '@prisma/client'
// Values must match the Rol enum in packages/database/prisma/schema.prisma exactly.

export const Rol = {
  ADMIN:          'ADMIN',
  LOGISTICA:      'LOGISTICA',
  SEGURIDAD:      'SEGURIDAD',
  ENVIOS:         'ENVIOS',
  VENTAS:         'VENTAS',
  TRANSPORTISTA:  'TRANSPORTISTA',
  BROKER:         'BROKER',
} as const
export type Rol = (typeof Rol)[keyof typeof Rol]

// ── JWT payload attached to every authenticated request ───────────────────────
export interface JwtPayload {
  id: string
  rol: Rol
  entidadId: string | null
  iat?: number
  exp?: number
}

// ── DB-shaped interfaces (subset of what Prisma will generate) ─────────────────
// Only the fields used by transformers are listed here; add more as needed.

export interface DbUsuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  passwordHash: string
  entidadId: string | null
}

export interface DbConductor {
  id: string
  transportistaId: string
  idInterno: string | null
  nombre: string
  licenciaNumero: string
  fastNumero: string | null
  visaNumero: string | null
  fotoUrl: string | null
  fechaNacimiento: Date | null
  activo: boolean
}

export interface DbTractor {
  id: string
  truckNumero: string
  placas: string
}

export interface DbTipoCaja {
  codigo: string
  descripcion: string
  categoria: string
}

export interface DbCaja {
  id: string
  containerNumero: string
  placasContenedor: string | null
  tipoCaja: DbTipoCaja
}

export interface DbSello {
  numero: string
  tipo: string
  orden: number
}

export interface DbFoto {
  id: string
  categoria: string
  url: string
  ocrValidado: boolean
  ocrTexto: string | null
}

export interface DbInspeccion {
  id: string
  momento: string
  resultado: string
  medicionOk: boolean | null
  discrepanciaDetalle: string | null
  iaPlacasOk: boolean | null
  iaSelloOk: boolean | null
  creadoEn: Date
  fotos: DbFoto[]
}

export interface DbSolicitud {
  id: string
  status: string
  tipoOperacion: string
  canalOrigen: string
  comentarioLogistica: string | null
  creadoEn: Date
  aprobadoEn: Date | null
  conductor: DbConductor | null
  tractor: DbTractor | null
  cajaDrop: DbCaja | null
  cajaPickup: DbCaja | null
  sellos: DbSello[]
  transportista: { id: string; nombre: string }
}
