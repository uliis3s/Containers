import { FastifyRequest, FastifyReply } from 'fastify'
import { verify } from 'jsonwebtoken'
import { config } from '../config'
import { UnauthorizedError } from '../utils/errors'
import type { JwtPayload, Rol } from '../utils/types'

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token required')
  }

  const token = header.slice(7) // 'Bearer '.length === 7
  try {
    const payload = verify(token, config.jwt.secret) as JwtPayload
    request.user = {
      id: payload.id,
      rol: payload.rol,
      entidadId: payload.entidadId,
    }
  } catch {
    // Never log the token value — Rule 7
    throw new UnauthorizedError('Invalid or expired token')
  }
}

// Extend FastifyRequest so all route handlers have full type safety on request.user
declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; rol: Rol; entidadId: string | null }
  }
}
