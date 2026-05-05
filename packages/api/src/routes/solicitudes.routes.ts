import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { Rol } from '../utils/types'
import type { DbSolicitud } from '../utils/types'
import { prisma } from '../db'
import { toPublicSolicitud } from '../utils/transformers'
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors'

// Reusable include for solicitud queries
const SOLICITUD_INCLUDE = {
  transportista: { select: { id: true, nombre: true } },
  conductor: true,
  tractor: true,
  cajaDrop: { include: { tipoCaja: true } },
  cajaPickup: { include: { tipoCaja: true } },
  sellos: { orderBy: { orden: 'asc' as const } },
}

interface CreateBody {
  conductorId: string
  tractorId: string
  cajaDropId?: string
  cajaPickupId?: string
  tipoOperacion: string
  canalOrigen: string
  comentario?: string
  sellos: Array<{ numero: string; tipo: string; orden: number }>
}

interface ApproveBody {
  comentario?: string
}

export default async function solicitudesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // ── POST / ─────────────────────────────────────────────────────────────────
  app.post<{ Body: CreateBody }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['conductorId', 'tractorId', 'tipoOperacion', 'canalOrigen', 'sellos'],
          properties: {
            conductorId: { type: 'string' },
            tractorId: { type: 'string' },
            cajaDropId: { type: 'string' },
            cajaPickupId: { type: 'string' },
            tipoOperacion: { type: 'string', enum: ['DROP', 'PICKUP', 'SWAP'] },
            canalOrigen: { type: 'string', enum: ['EMAIL', 'WHATSAPP', 'TELEFONO', 'PORTAL'] },
            comentario: { type: 'string' },
            sellos: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['numero', 'tipo', 'orden'],
                properties: {
                  numero: { type: 'string', minLength: 1 },
                  tipo: { type: 'string', enum: ['PRIMARIO', 'SECUNDARIO'] },
                  orden: { type: 'integer', minimum: 1 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user
      const body = request.body

      if (![Rol.TRANSPORTISTA, Rol.LOGISTICA, Rol.ADMIN].includes(user.rol as Rol)) {
        throw new ForbiddenError('Access denied')
      }

      // Determine transportistaId: TRANSPORTISTA is scoped to own carrier
      let transportistaId: string
      if (user.rol === Rol.TRANSPORTISTA) {
        if (!user.entidadId) throw new ForbiddenError('No carrier associated with this account')
        transportistaId = user.entidadId
      } else {
        // LOGISTICA/ADMIN: infer from conductor
        const c = await prisma.conductor.findUnique({ where: { id: body.conductorId } })
        if (!c) throw new ValidationError('Conductor not found')
        transportistaId = c.transportistaId
      }

      // Validate tipoOperacion vs caja requirements
      if (body.tipoOperacion === 'DROP' && !body.cajaDropId)
        throw new ValidationError('DROP requires cajaDropId')
      if (body.tipoOperacion === 'PICKUP' && !body.cajaPickupId)
        throw new ValidationError('PICKUP requires cajaPickupId')
      if (body.tipoOperacion === 'SWAP' && (!body.cajaDropId || !body.cajaPickupId))
        throw new ValidationError('SWAP requires both cajaDropId and cajaPickupId')

      // Validate all assets belong to the carrier
      const conductor = await prisma.conductor.findFirst({
        where: { id: body.conductorId, transportistaId, activo: true },
      })
      if (!conductor) throw new ValidationError('Conductor not found in this carrier')

      const tractor = await prisma.tractor.findFirst({
        where: { id: body.tractorId, transportistaId, activo: true },
      })
      if (!tractor) throw new ValidationError('Tractor not found in this carrier')

      if (body.cajaDropId) {
        const caja = await prisma.caja.findFirst({
          where: { id: body.cajaDropId, transportistaId, activo: true },
        })
        if (!caja) throw new ValidationError('Caja drop not found in this carrier')
      }
      if (body.cajaPickupId) {
        const caja = await prisma.caja.findFirst({
          where: { id: body.cajaPickupId, transportistaId, activo: true },
        })
        if (!caja) throw new ValidationError('Caja pickup not found in this carrier')
      }

      const solicitud = await prisma.solicitud.create({
        data: {
          transportistaId,
          conductorId: body.conductorId,
          tractorId: body.tractorId,
          cajaDropId: body.cajaDropId,
          cajaPickupId: body.cajaPickupId,
          tipoOperacion: body.tipoOperacion as any,
          canalOrigen: body.canalOrigen as any,
          comentarioLogistica: body.comentario,
          sellos: {
            create: body.sellos.map((s) => ({
              numero: s.numero,
              tipo: s.tipo as any,
              orden: s.orden,
            })),
          },
        },
        include: SOLICITUD_INCLUDE,
      })

      return reply
        .status(201)
        .send({ data: await toPublicSolicitud(solicitud as unknown as DbSolicitud) })
    },
  )

  // ── GET / ──────────────────────────────────────────────────────────────────
  app.get<{ Querystring: { status?: string; transportistaId?: string } }>(
    '/',
    async (request, reply) => {
      const user = request.user
      const { status, transportistaId } = request.query

      const where: Record<string, unknown> = {}
      if (status) where.status = status

      if (user.rol === Rol.TRANSPORTISTA && user.entidadId) {
        where.transportistaId = user.entidadId
      } else if (user.rol === Rol.BROKER && user.entidadId) {
        where.transportista = { brokerId: user.entidadId }
      } else if (transportistaId) {
        where.transportistaId = transportistaId
      }

      const solicitudes = await prisma.solicitud.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        include: SOLICITUD_INCLUDE,
      })

      const data = await Promise.all(
        solicitudes.map((s) => toPublicSolicitud(s as unknown as DbSolicitud)),
      )
      return reply.send({ data })
    },
  )

  // ── GET /:id ───────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = request.user
    const solicitud = await prisma.solicitud.findUnique({
      where: { id: request.params.id },
      include: SOLICITUD_INCLUDE,
    })
    if (!solicitud) throw new NotFoundError('Solicitud not found')

    if (user.rol === Rol.TRANSPORTISTA && solicitud.transportistaId !== user.entidadId) {
      throw new ForbiddenError('Access denied')
    }
    if (user.rol === Rol.BROKER && user.entidadId) {
      const carrier = await prisma.transportista.findFirst({
        where: { id: solicitud.transportistaId, brokerId: user.entidadId },
      })
      if (!carrier) throw new ForbiddenError('Access denied')
    }

    return reply.send({ data: await toPublicSolicitud(solicitud as unknown as DbSolicitud) })
  })

  // ── PATCH /:id/aprobar ─────────────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: ApproveBody }>(
    '/:id/aprobar',
    { preHandler: [authorize(Rol.LOGISTICA, Rol.ADMIN)] },
    async (request, reply) => {
      const solicitud = await prisma.solicitud.findUnique({
        where: { id: request.params.id },
      })
      if (!solicitud) throw new NotFoundError('Solicitud not found')
      if (solicitud.status !== 'PENDIENTE')
        throw new ValidationError('Only PENDIENTE solicitudes can be approved')

      const updated = await prisma.$transaction(async (tx) => {
        const sol = await tx.solicitud.update({
          where: { id: solicitud.id },
          data: {
            status: 'APROBADA',
            aprobadoPorId: request.user.id,
            aprobadoEn: new Date(),
            comentarioLogistica: request.body?.comentario,
          },
          include: SOLICITUD_INCLUDE,
        })
        await tx.movimiento.create({ data: { solicitudId: solicitud.id } })
        return sol
      })

      return reply.send({ data: await toPublicSolicitud(updated as unknown as DbSolicitud) })
    },
  )

  // ── PATCH /:id/rechazar ────────────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: ApproveBody }>(
    '/:id/rechazar',
    { preHandler: [authorize(Rol.LOGISTICA, Rol.ADMIN)] },
    async (request, reply) => {
      const solicitud = await prisma.solicitud.findUnique({
        where: { id: request.params.id },
      })
      if (!solicitud) throw new NotFoundError('Solicitud not found')
      if (solicitud.status !== 'PENDIENTE')
        throw new ValidationError('Only PENDIENTE solicitudes can be rejected')

      const updated = await prisma.solicitud.update({
        where: { id: solicitud.id },
        data: {
          status: 'RECHAZADA',
          aprobadoPorId: request.user.id,
          aprobadoEn: new Date(),
          comentarioLogistica: request.body?.comentario,
        },
        include: SOLICITUD_INCLUDE,
      })

      return reply.send({ data: await toPublicSolicitud(updated as unknown as DbSolicitud) })
    },
  )
}
