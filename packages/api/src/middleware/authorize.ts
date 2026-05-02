import { FastifyRequest } from 'fastify'
import { ForbiddenError } from '../utils/errors'
import type { Rol } from '../utils/types'

/**
 * Returns a Fastify preHandler that allows only the listed roles.
 * Usage in a route: preHandler: [authenticate, authorize('LOGISTICA', 'ADMIN')]
 */
export function authorize(...allowedRoles: Rol[]) {
  return async (request: FastifyRequest): Promise<void> => {
    if (!allowedRoles.includes(request.user.rol)) {
      throw new ForbiddenError(
        `Role ${request.user.rol} cannot access this resource`,
      )
    }
  }
}

/**
 * Carrier scope guard — use in every route accessible to TRANSPORTISTA/BROKER.
 * Returns the transportistaId from the verified JWT; never from the request body.
 * Throw if the user has no associated entity (e.g. an ADMIN calling a carrier route).
 *
 * Usage:
 *   const transportistaId = requireOwnTransportista(request)
 *   // add WHERE transportista_id = transportistaId to every query
 */
export function requireOwnTransportista(request: FastifyRequest): string {
  const id = request.user.entidadId
  if (!id) {
    throw new ForbiddenError('No transportista associated with this account')
  }
  return id
}
