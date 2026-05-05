import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { Rol } from '../utils/types'
import { prisma } from '../db'
import { ForbiddenError } from '../utils/errors'

export default async function catalogosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/tipos-caja', async (_request, reply) => {
    const tipos = await prisma.tipoCaja.findMany({
      orderBy: [{ categoria: 'asc' }, { codigo: 'asc' }],
    })
    return reply.send({
      data: tipos.map((t) => ({
        id: t.id,
        codigo: t.codigo,
        descripcion: t.descripcion,
        categoria: t.categoria,
        largoRefCm: t.largoRefCm.toNumber(),
        anchoRefCm: t.anchoRefCm.toNumber(),
        altoRefCm: t.altoRefCm.toNumber(),
        toleranciaCm: t.toleranciaCm.toNumber(),
      })),
    })
  })

  app.get('/clientes', async (_request, reply) => {
    const clientes = await prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    })
    return reply.send({
      data: clientes.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        sellosRequeridos: c.sellosRequeridos,
        scac: c.scac,
        caat: c.caat,
      })),
    })
  })

  app.get(
    '/brokers',
    { preHandler: [authorize(Rol.ADMIN, Rol.LOGISTICA)] },
    async (_request, reply) => {
      const brokers = await prisma.broker.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      })
      return reply.send({
        data: brokers.map((b) => ({
          id: b.id,
          nombre: b.nombre,
          contacto: b.contacto,
          email: b.email,
          telefono: b.telefono,
        })),
      })
    },
  )

  app.get('/transportistas', async (request, reply) => {
    const user = request.user
    const where =
      user.rol === Rol.BROKER && user.entidadId
        ? { brokerId: user.entidadId, activo: true }
        : { activo: true }

    const transportistas = await prisma.transportista.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: { broker: { select: { id: true, nombre: true } } },
    })
    return reply.send({
      data: transportistas.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        contacto: t.contacto,
        email: t.email,
        broker: t.broker ? { id: t.broker.id, nombre: t.broker.nombre } : null,
      })),
    })
  })

  app.get<{ Params: { id: string } }>(
    '/transportistas/:id/conductores',
    async (request, reply) => {
      const { id } = request.params
      const user = request.user

      if (user.rol === Rol.TRANSPORTISTA && user.entidadId !== id) {
        throw new ForbiddenError('Access denied')
      }

      const conductores = await prisma.conductor.findMany({
        where: { transportistaId: id, activo: true },
        orderBy: { nombre: 'asc' },
      })
      return reply.send({
        data: conductores.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          idInterno: c.idInterno,
          licenciaNumero: c.licenciaNumero,
          fastNumero: c.fastNumero,
          visaNumero: c.visaNumero,
        })),
      })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/transportistas/:id/tractores',
    async (request, reply) => {
      const { id } = request.params
      const user = request.user

      if (user.rol === Rol.TRANSPORTISTA && user.entidadId !== id) {
        throw new ForbiddenError('Access denied')
      }

      const tractores = await prisma.tractor.findMany({
        where: { transportistaId: id, activo: true },
        orderBy: { truckNumero: 'asc' },
      })
      return reply.send({
        data: tractores.map((t) => ({
          id: t.id,
          truckNumero: t.truckNumero,
          placas: t.placas,
        })),
      })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/transportistas/:id/cajas',
    async (request, reply) => {
      const { id } = request.params
      const user = request.user

      if (user.rol === Rol.TRANSPORTISTA && user.entidadId !== id) {
        throw new ForbiddenError('Access denied')
      }

      const cajas = await prisma.caja.findMany({
        where: { transportistaId: id, activo: true },
        orderBy: { containerNumero: 'asc' },
        include: { tipoCaja: { select: { codigo: true, descripcion: true, categoria: true } } },
      })
      return reply.send({
        data: cajas.map((c) => ({
          id: c.id,
          containerNumero: c.containerNumero,
          placasContenedor: c.placasContenedor,
          tipoCaja: {
            codigo: c.tipoCaja.codigo,
            descripcion: c.tipoCaja.descripcion,
            categoria: c.tipoCaja.categoria,
          },
        })),
      })
    },
  )
}
