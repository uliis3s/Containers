import { FastifyInstance } from 'fastify'
import authRoutes from './auth.routes'
import catalogosRoutes from './catalogos.routes'
import solicitudesRoutes from './solicitudes.routes'
import movimientosRoutes from './movimientos.routes'
import inspeccionesRoutes from './inspecciones.routes'
import alertasRoutes from './alertas.routes'
import invoicesRoutes from './invoices.routes'

export default async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(catalogosRoutes, { prefix: '/catalogos' })
  await app.register(solicitudesRoutes, { prefix: '/solicitudes' })
  await app.register(movimientosRoutes, { prefix: '/movimientos' })
  await app.register(inspeccionesRoutes, { prefix: '/inspecciones' })
  await app.register(alertasRoutes, { prefix: '/alertas' })
  await app.register(invoicesRoutes, { prefix: '/invoices' })
}
