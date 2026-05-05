import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { Rol } from '../utils/types'
import type { DbSolicitud } from '../utils/types'
import { prisma } from '../db'
import { toPublicSolicitud } from '../utils/transformers'
import { NotFoundError, ValidationError } from '../utils/errors'

const STATUS_TRANSITIONS: Record<string, string> = {
  AUTORIZADO: 'EN_PLANTA',
  EN_PLANTA: 'CARGANDO',
  CARGANDO: 'LISTO',
  LISTO: 'DESPACHADO',
}

const MOV_INCLUDE = {
  solicitud: {
    include: {
      transportista: { select: { id: true, nombre: true } },
      conductor: true,
      tractor: true,
      cajaDrop: { include: { tipoCaja: true } },
      cajaPickup: { include: { tipoCaja: true } },
      sellos: { orderBy: { orden: 'asc' as const } },
    },
  },
  alertas: { where: { atendida: false } },
  invoices: {
    include: { cliente: { select: { id: true, nombre: true } } },
  },
}

function formatMovimiento(m: any) {
  return {
    id: m.id,
    solicitudId: m.solicitudId,
    lugarAsignado: m.lugarAsignado,
    ubicacion: m.ubicacion,
    status: m.status,
    horaEntrada: m.horaEntrada,
    horaSalida: m.horaSalida,
    alertasActivas: m.alertas?.length ?? 0,
    invoicesCount: m.invoices?.length ?? 0,
  }
}

export default async function movimientosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // ── GET / ──────────────────────────────────────────────────────────────────
  app.get<{ Querystring: { status?: string; transportistaId?: string } }>(
    '/',
    async (request, reply) => {
      const user = request.user
      const { status, transportistaId } = request.query

      const where: any = {}
      if (status) where.status = status

      if (user.rol === Rol.TRANSPORTISTA && user.entidadId) {
        where.solicitud = { transportistaId: user.entidadId }
      } else if (user.rol === Rol.BROKER && user.entidadId) {
        where.solicitud = { transportista: { brokerId: user.entidadId } }
      } else if (transportistaId) {
        where.solicitud = { transportistaId }
      }

      const movimientos = await prisma.movimiento.findMany({
        where,
        orderBy: { horaEntrada: 'desc' },
        include: MOV_INCLUDE,
      })
      return reply.send({ data: movimientos.map(formatMovimiento) })
    },
  )

  // ── GET /:id ───────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const m = await prisma.movimiento.findUnique({
      where: { id: request.params.id },
      include: {
        ...MOV_INCLUDE,
        inspecciones: {
          include: {
            fotos: true,
            guardia: { select: { id: true, nombre: true } },
          },
          orderBy: { creadoEn: 'asc' as const },
        },
      },
    })
    if (!m) throw new NotFoundError('Movimiento not found')

    const user = request.user
    if (user.rol === Rol.TRANSPORTISTA && user.entidadId) {
      const s = m.solicitud as any
      if (s.transportistaId !== user.entidadId) throw new NotFoundError('Movimiento not found')
    }

    const solicitudPublic = await toPublicSolicitud(m.solicitud as unknown as DbSolicitud)

    return reply.send({
      data: {
        ...formatMovimiento(m),
        solicitud: solicitudPublic,
        inspecciones: m.inspecciones.map((i: any) => ({
          id: i.id,
          momento: i.momento,
          resultado: i.resultado,
          medicionOk: i.medicionOk,
          laserLargoCm: i.laserLargoCm?.toNumber() ?? null,
          laserAnchoCm: i.laserAnchoCm?.toNumber() ?? null,
          laserAltoCm: i.laserAltoCm?.toNumber() ?? null,
          discrepanciaDetalle: i.discrepanciaDetalle,
          iaPlacasOk: i.iaPlacasOk,
          iaSelloOk: i.iaSelloOk,
          iaConductorOk: i.iaConductorOk,
          guardia: i.guardia,
          creadoEn: i.creadoEn,
          fotosCount: i.fotos.length,
        })),
        invoices: m.invoices.map((inv: any) => ({
          id: inv.id,
          numeroInvoice: inv.numeroInvoice,
          numeroPedimento: inv.numeroPedimento,
          cliente: inv.cliente,
          creadoEn: inv.creadoEn,
        })),
      },
    })
  })

  // ── PATCH /:id/entrada ─────────────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: { lugarAsignado?: string } }>(
    '/:id/entrada',
    { preHandler: [authorize(Rol.SEGURIDAD, Rol.ADMIN)] },
    async (request, reply) => {
      const m = await prisma.movimiento.findUnique({ where: { id: request.params.id } })
      if (!m) throw new NotFoundError('Movimiento not found')
      if (m.status !== 'AUTORIZADO')
        throw new ValidationError('Movimiento must be AUTORIZADO for entrada')

      const updated = await prisma.movimiento.update({
        where: { id: m.id },
        data: {
          horaEntrada: new Date(),
          status: 'EN_PLANTA',
          lugarAsignado: request.body?.lugarAsignado,
        },
      })
      return reply.send({ data: formatMovimiento({ ...updated, alertas: [], invoices: [] }) })
    },
  )

  // ── PATCH /:id/salida ──────────────────────────────────────────────────────
  app.patch<{ Params: { id: string } }>(
    '/:id/salida',
    { preHandler: [authorize(Rol.SEGURIDAD, Rol.ADMIN)] },
    async (request, reply) => {
      const m = await prisma.movimiento.findUnique({ where: { id: request.params.id } })
      if (!m) throw new NotFoundError('Movimiento not found')
      if (m.status !== 'LISTO')
        throw new ValidationError('Movimiento must be LISTO for salida')

      const updated = await prisma.movimiento.update({
        where: { id: m.id },
        data: { horaSalida: new Date(), status: 'DESPACHADO' },
      })
      return reply.send({ data: formatMovimiento({ ...updated, alertas: [], invoices: [] }) })
    },
  )

  // ── PATCH /:id/status ──────────────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/:id/status',
    { preHandler: [authorize(Rol.SEGURIDAD, Rol.LOGISTICA, Rol.ADMIN)] },
    async (request, reply) => {
      const m = await prisma.movimiento.findUnique({ where: { id: request.params.id } })
      if (!m) throw new NotFoundError('Movimiento not found')

      const nextStatus = STATUS_TRANSITIONS[m.status]
      if (!nextStatus || request.body.status !== nextStatus)
        throw new ValidationError(
          `Invalid transition from ${m.status}. Expected next status: ${nextStatus ?? 'none (terminal state)'}`,
        )

      const updated = await prisma.movimiento.update({
        where: { id: m.id },
        data: { status: request.body.status as any },
      })
      return reply.send({ data: formatMovimiento({ ...updated, alertas: [], invoices: [] }) })
    },
  )

  // ── PATCH /:id/lugar ───────────────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: { lugarAsignado: string; ubicacion?: string } }>(
    '/:id/lugar',
    { preHandler: [authorize(Rol.LOGISTICA, Rol.SEGURIDAD, Rol.ADMIN)] },
    async (request, reply) => {
      const m = await prisma.movimiento.findUnique({ where: { id: request.params.id } })
      if (!m) throw new NotFoundError('Movimiento not found')

      const updated = await prisma.movimiento.update({
        where: { id: m.id },
        data: {
          lugarAsignado: request.body.lugarAsignado,
          ubicacion: request.body.ubicacion as any,
        },
      })
      return reply.send({ data: formatMovimiento({ ...updated, alertas: [], invoices: [] }) })
    },
  )
}
