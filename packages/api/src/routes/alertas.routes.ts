import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { Rol } from '../utils/types'
import { prisma } from '../db'
import { NotFoundError } from '../utils/errors'

export default async function alertasRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', authorize(Rol.LOGISTICA, Rol.ADMIN, Rol.SEGURIDAD))

  // ── GET / ──────────────────────────────────────────────────────────────────
  app.get<{ Querystring: { atendida?: string; movimientoId?: string } }>(
    '/',
    async (request, reply) => {
      const { atendida, movimientoId } = request.query

      const atendidaFilter =
        atendida === 'true' ? true : atendida === 'false' ? false : undefined

      const alertas = await prisma.alerta.findMany({
        where: {
          ...(atendidaFilter !== undefined ? { atendida: atendidaFilter } : { atendida: false }),
          ...(movimientoId ? { movimientoId } : {}),
        },
        orderBy: { creadoEn: 'desc' },
        include: {
          movimiento: { select: { id: true, solicitudId: true, status: true } },
          atendidaPor: { select: { id: true, nombre: true } },
        },
      })

      return reply.send({
        data: alertas.map((a) => ({
          id: a.id,
          tipo: a.tipo,
          mensaje: a.mensaje,
          atendida: a.atendida,
          creadoEn: a.creadoEn,
          movimiento: a.movimiento,
          atendidaPor: a.atendidaPor,
        })),
      })
    },
  )

  // ── PATCH /:id/atender ─────────────────────────────────────────────────────
  app.patch<{ Params: { id: string } }>(
    '/:id/atender',
    async (request, reply) => {
      const alerta = await prisma.alerta.findUnique({ where: { id: request.params.id } })
      if (!alerta) throw new NotFoundError('Alerta not found')

      const updated = await prisma.alerta.update({
        where: { id: alerta.id },
        data: { atendida: true, atendidaPorId: request.user.id },
      })

      return reply.send({
        data: {
          id: updated.id,
          tipo: updated.tipo,
          mensaje: updated.mensaje,
          atendida: updated.atendida,
          creadoEn: updated.creadoEn,
          atendidaPorId: updated.atendidaPorId,
        },
      })
    },
  )
}
