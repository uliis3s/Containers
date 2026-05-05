import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { Rol } from '../utils/types'
import { prisma } from '../db'
import { NotFoundError } from '../utils/errors'

interface LineaBody {
  partNumero: string
  descripcion: string
  cantidad: number
  pesoKg: number
  htsus?: string
  htsusOrigen?: string
  numPallets?: number
  materialCost?: number
  addedValue?: number
  unitCost?: number
  extendedCost?: number
}

interface CreateBody {
  movimientoId: string
  clienteId: string
  numeroInvoice: string
  numeroPedimento: string
  tscex?: string
  so?: string
  dn?: string
  bl?: string
  lote?: string
  rampaDestino?: string
  atd?: string
  appointment?: string
  wo?: string
  remark?: string
  lineas: LineaBody[]
}

export default async function invoicesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // ── POST / ─────────────────────────────────────────────────────────────────
  app.post<{ Body: CreateBody }>(
    '/',
    {
      preHandler: [authorize(Rol.ENVIOS, Rol.LOGISTICA, Rol.ADMIN)],
      schema: {
        body: {
          type: 'object',
          required: ['movimientoId', 'clienteId', 'numeroInvoice', 'numeroPedimento', 'lineas'],
          properties: {
            movimientoId: { type: 'string' },
            clienteId: { type: 'string' },
            numeroInvoice: { type: 'string', minLength: 1 },
            numeroPedimento: { type: 'string', minLength: 1 },
            lineas: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['partNumero', 'descripcion', 'cantidad', 'pesoKg'],
                properties: {
                  partNumero: { type: 'string' },
                  descripcion: { type: 'string' },
                  cantidad: { type: 'integer', minimum: 1 },
                  pesoKg: { type: 'number', minimum: 0 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body

      const movimiento = await prisma.movimiento.findUnique({ where: { id: body.movimientoId } })
      if (!movimiento) throw new NotFoundError('Movimiento not found')

      const cliente = await prisma.cliente.findUnique({ where: { id: body.clienteId } })
      if (!cliente) throw new NotFoundError('Cliente not found')

      const invoice = await prisma.invoice.create({
        data: {
          movimientoId: body.movimientoId,
          clienteId: body.clienteId,
          numeroInvoice: body.numeroInvoice,
          numeroPedimento: body.numeroPedimento,
          tscex: body.tscex,
          so: body.so,
          dn: body.dn,
          bl: body.bl,
          lote: body.lote,
          rampaDestino: body.rampaDestino,
          atd: body.atd ? new Date(body.atd) : undefined,
          appointment: body.appointment ? new Date(body.appointment) : undefined,
          wo: body.wo,
          remark: body.remark,
          lineas: {
            create: body.lineas.map((l) => ({
              partNumero: l.partNumero,
              descripcion: l.descripcion,
              cantidad: l.cantidad,
              pesoKg: l.pesoKg,
              htsus: l.htsus,
              htsusOrigen: l.htsusOrigen,
              numPallets: l.numPallets,
              materialCost: l.materialCost,
              addedValue: l.addedValue,
              unitCost: l.unitCost,
              extendedCost: l.extendedCost,
            })),
          },
        },
        include: {
          cliente: { select: { id: true, nombre: true } },
          lineas: true,
        },
      })

      return reply.status(201).send({
        data: {
          id: invoice.id,
          movimientoId: invoice.movimientoId,
          numeroInvoice: invoice.numeroInvoice,
          numeroPedimento: invoice.numeroPedimento,
          cliente: invoice.cliente,
          lineasCount: invoice.lineas.length,
          creadoEn: invoice.creadoEn,
        },
      })
    },
  )

  // ── GET /:id ───────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authorize(Rol.ENVIOS, Rol.LOGISTICA, Rol.VENTAS, Rol.ADMIN)] },
    async (request, reply) => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: request.params.id },
        include: {
          cliente: { select: { id: true, nombre: true } },
          lineas: true,
        },
      })
      if (!invoice) throw new NotFoundError('Invoice not found')

      return reply.send({
        data: {
          id: invoice.id,
          movimientoId: invoice.movimientoId,
          numeroInvoice: invoice.numeroInvoice,
          numeroPedimento: invoice.numeroPedimento,
          tscex: invoice.tscex,
          so: invoice.so,
          dn: invoice.dn,
          bl: invoice.bl,
          lote: invoice.lote,
          rampaDestino: invoice.rampaDestino,
          atd: invoice.atd,
          appointment: invoice.appointment,
          wo: invoice.wo,
          remark: invoice.remark,
          cliente: invoice.cliente,
          creadoEn: invoice.creadoEn,
          lineas: invoice.lineas.map((l) => ({
            id: l.id,
            partNumero: l.partNumero,
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            pesoKg: l.pesoKg.toNumber(),
            htsus: l.htsus,
            htsusOrigen: l.htsusOrigen,
            numPallets: l.numPallets,
            materialCost: l.materialCost?.toNumber() ?? null,
            addedValue: l.addedValue?.toNumber() ?? null,
            unitCost: l.unitCost?.toNumber() ?? null,
            extendedCost: l.extendedCost?.toNumber() ?? null,
          })),
        },
      })
    },
  )

  // ── GET /movimiento/:movimientoId ──────────────────────────────────────────
  app.get<{ Params: { movimientoId: string } }>(
    '/movimiento/:movimientoId',
    { preHandler: [authorize(Rol.ENVIOS, Rol.LOGISTICA, Rol.VENTAS, Rol.ADMIN)] },
    async (request, reply) => {
      const invoices = await prisma.invoice.findMany({
        where: { movimientoId: request.params.movimientoId },
        orderBy: { creadoEn: 'asc' },
        include: { cliente: { select: { id: true, nombre: true } } },
      })

      return reply.send({
        data: invoices.map((inv) => ({
          id: inv.id,
          numeroInvoice: inv.numeroInvoice,
          numeroPedimento: inv.numeroPedimento,
          cliente: inv.cliente,
          so: inv.so,
          bl: inv.bl,
          rampaDestino: inv.rampaDestino,
          creadoEn: inv.creadoEn,
        })),
      })
    },
  )
}
