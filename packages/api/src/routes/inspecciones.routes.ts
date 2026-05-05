import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { Rol } from '../utils/types'
import { prisma } from '../db'
import { NotFoundError, ValidationError } from '../utils/errors'

interface CreateBody {
  movimientoId: string
  momento: string
  laserLargoCm?: number
  laserAnchoCm?: number
  laserAltoCm?: number
  medicionOk?: boolean
  discrepanciaDetalle?: string
  iaPlacasOk?: boolean
  iaSelloOk?: boolean
  iaConductorOk?: boolean
  resultado: string
}

export default async function inspeccionesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // ── POST / ─────────────────────────────────────────────────────────────────
  app.post<{ Body: CreateBody }>(
    '/',
    {
      preHandler: [authorize(Rol.SEGURIDAD, Rol.ADMIN)],
      schema: {
        body: {
          type: 'object',
          required: ['movimientoId', 'momento', 'resultado'],
          properties: {
            movimientoId: { type: 'string' },
            momento: { type: 'string', enum: ['ENTRADA', 'SALIDA'] },
            laserLargoCm: { type: 'number' },
            laserAnchoCm: { type: 'number' },
            laserAltoCm: { type: 'number' },
            medicionOk: { type: 'boolean' },
            discrepanciaDetalle: { type: 'string' },
            iaPlacasOk: { type: 'boolean' },
            iaSelloOk: { type: 'boolean' },
            iaConductorOk: { type: 'boolean' },
            resultado: { type: 'string', enum: ['OK', 'REVISAR', 'RECHAZADO'] },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body
      const movimiento = await prisma.movimiento.findUnique({ where: { id: body.movimientoId } })
      if (!movimiento) throw new NotFoundError('Movimiento not found')

      if (body.momento === 'ENTRADA' && movimiento.status === 'DESPACHADO')
        throw new ValidationError('Cannot register ENTRADA for a dispatched movimiento')
      if (body.momento === 'SALIDA' && movimiento.status === 'AUTORIZADO')
        throw new ValidationError('Cannot register SALIDA before ENTRADA')

      const inspeccion = await prisma.inspeccion.create({
        data: {
          movimientoId: body.movimientoId,
          guardiaId: request.user.id,
          momento: body.momento as any,
          laserLargoCm: body.laserLargoCm,
          laserAnchoCm: body.laserAnchoCm,
          laserAltoCm: body.laserAltoCm,
          medicionOk: body.medicionOk,
          discrepanciaDetalle: body.discrepanciaDetalle,
          iaPlacasOk: body.iaPlacasOk,
          iaSelloOk: body.iaSelloOk,
          iaConductorOk: body.iaConductorOk,
          resultado: body.resultado as any,
        },
      })

      // Auto-alert when inspection has issues
      if (body.resultado !== 'OK') {
        await prisma.alerta.create({
          data: {
            movimientoId: body.movimientoId,
            tipo: 'SELLO_NO_COINCIDE',
            mensaje: `Inspección ${body.momento} con resultado ${body.resultado}${body.discrepanciaDetalle ? ': ' + body.discrepanciaDetalle : ''}`,
          },
        })
      }

      return reply.status(201).send({
        data: {
          id: inspeccion.id,
          movimientoId: inspeccion.movimientoId,
          momento: inspeccion.momento,
          resultado: inspeccion.resultado,
          medicionOk: inspeccion.medicionOk,
          laserLargoCm: inspeccion.laserLargoCm?.toNumber() ?? null,
          laserAnchoCm: inspeccion.laserAnchoCm?.toNumber() ?? null,
          laserAltoCm: inspeccion.laserAltoCm?.toNumber() ?? null,
          discrepanciaDetalle: inspeccion.discrepanciaDetalle,
          iaPlacasOk: inspeccion.iaPlacasOk,
          iaSelloOk: inspeccion.iaSelloOk,
          iaConductorOk: inspeccion.iaConductorOk,
          guardiaId: inspeccion.guardiaId,
          creadoEn: inspeccion.creadoEn,
        },
      })
    },
  )

  // ── GET /:id ───────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const inspeccion = await prisma.inspeccion.findUnique({
      where: { id: request.params.id },
      include: {
        fotos: true,
        guardia: { select: { id: true, nombre: true } },
      },
    })
    if (!inspeccion) throw new NotFoundError('Inspeccion not found')

    return reply.send({
      data: {
        id: inspeccion.id,
        movimientoId: inspeccion.movimientoId,
        momento: inspeccion.momento,
        resultado: inspeccion.resultado,
        medicionOk: inspeccion.medicionOk,
        laserLargoCm: inspeccion.laserLargoCm?.toNumber() ?? null,
        laserAnchoCm: inspeccion.laserAnchoCm?.toNumber() ?? null,
        laserAltoCm: inspeccion.laserAltoCm?.toNumber() ?? null,
        discrepanciaDetalle: inspeccion.discrepanciaDetalle,
        iaPlacasOk: inspeccion.iaPlacasOk,
        iaSelloOk: inspeccion.iaSelloOk,
        iaConductorOk: inspeccion.iaConductorOk,
        guardia: inspeccion.guardia,
        creadoEn: inspeccion.creadoEn,
        fotos: inspeccion.fotos.map((f) => ({
          id: f.id,
          categoria: f.categoria,
          url: f.url,
          ocrValidado: f.ocrValidado,
        })),
      },
    })
  })

  // ── GET /movimiento/:movimientoId ──────────────────────────────────────────
  app.get<{ Params: { movimientoId: string } }>(
    '/movimiento/:movimientoId',
    async (request, reply) => {
      const inspecciones = await prisma.inspeccion.findMany({
        where: { movimientoId: request.params.movimientoId },
        orderBy: { creadoEn: 'asc' },
        include: { guardia: { select: { id: true, nombre: true } } },
      })
      return reply.send({
        data: inspecciones.map((i) => ({
          id: i.id,
          momento: i.momento,
          resultado: i.resultado,
          medicionOk: i.medicionOk,
          laserLargoCm: i.laserLargoCm?.toNumber() ?? null,
          laserAnchoCm: i.laserAnchoCm?.toNumber() ?? null,
          laserAltoCm: i.laserAltoCm?.toNumber() ?? null,
          iaPlacasOk: i.iaPlacasOk,
          iaSelloOk: i.iaSelloOk,
          iaConductorOk: i.iaConductorOk,
          guardia: i.guardia,
          creadoEn: i.creadoEn,
        })),
      })
    },
  )
}
