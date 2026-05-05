export type Rol =
  | 'LOGISTICA'
  | 'SEGURIDAD'
  | 'ENVIOS'
  | 'VENTAS'
  | 'TRANSPORTISTA'
  | 'BROKER'
  | 'ADMIN'

export interface AuthUser {
  id: string
  nombre: string
  email: string
  rol: Rol
  entidadId: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface Sello {
  numero: string
  tipo: 'PRIMARIO' | 'SECUNDARIO'
  orden: number
}

export interface Solicitud {
  id: string
  status: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'
  tipoOperacion: 'DROP' | 'PICKUP' | 'SWAP'
  canalOrigen: 'EMAIL' | 'WHATSAPP' | 'TELEFONO' | 'PORTAL'
  comentarioLogistica: string | null
  creadoEn: string
  aprobadoEn: string | null
  transportista: { id: string; nombre: string }
  conductor: {
    id: string
    nombre: string
    licenciaNumero: string
    fastNumero: string
    fotoUrl: string | null
  } | null
  tractor: { id: string; truckNumero: string; placas: string } | null
  cajaDrop: CajaPublic | null
  cajaPickup: CajaPublic | null
  sellos: Sello[]
}

export interface CajaPublic {
  id: string
  containerNumero: string
  placasContenedor: string | null
  tipoCaja: { codigo: string; descripcion: string; categoria: string }
}

export interface Movimiento {
  id: string
  solicitudId: string
  lugarAsignado: string | null
  ubicacion: 'PLANTA' | 'YARDA_EXTERNA'
  horaEntrada: string | null
  horaSalida: string | null
  status: 'AUTORIZADO' | 'EN_PLANTA' | 'CARGANDO' | 'LISTO' | 'DESPACHADO'
  alertasActivas: number
  solicitud: Solicitud
  inspecciones: Inspeccion[]
}

export interface Inspeccion {
  id: string
  momento: 'ENTRADA' | 'SALIDA'
  resultado: 'OK' | 'REVISAR' | 'RECHAZADO'
  medicionOk: boolean | null
  discrepanciaDetalle: string | null
  iaPlacasOk: boolean | null
  iaSelloOk: boolean | null
  creadoEn: string
  fotos: Foto[]
}

export interface Foto {
  id: string
  categoria: string
  url: string
  ocrValidado: boolean
}

export interface Alerta {
  id: string
  movimientoId: string
  tipo: 'DIAS_48' | 'DIAS_72' | 'MEDICION_FALLIDA' | 'SELLO_NO_COINCIDE'
  mensaje: string
  atendida: boolean
  creadoEn: string
}

export interface TipoCaja {
  id: string
  codigo: string
  descripcion: string
  categoria: string
  largoRefCm: number
  anchoRefCm: number
  altoRefCm: number
  toleranciaCm: number
}

export interface Conductor {
  id: string
  nombre: string
  idInterno: string | null
  licenciaNumero: string
  fastNumero: string
  visaNumero: string | null
}

export interface Tractor {
  id: string
  truckNumero: string
  placas: string
}

export interface Caja {
  id: string
  containerNumero: string
  placasContenedor: string | null
  tipoCaja: { codigo: string; descripcion: string; categoria: string }
}

export interface Transportista {
  id: string
  nombre: string
  contacto: string | null
  email: string | null
  broker: { id: string; nombre: string } | null
}

export interface Invoice {
  id: string
  movimientoId: string
  numeroInvoice: string
  numeroPedimento: string
  creadoEn: string
  cliente: { id: string; nombre: string }
}
