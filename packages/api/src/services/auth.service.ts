import bcrypt from 'bcryptjs'
import { sign, verify } from 'jsonwebtoken'
import { config } from '../config'
import { prisma } from '../db'
import { UnauthorizedError } from '../utils/errors'
import type { JwtPayload, Rol } from '../utils/types'

export async function login(email: string, password: string) {
  const user = await prisma.usuario.findUnique({ where: { email } })
  if (!user || !user.activo) throw new UnauthorizedError('Invalid credentials')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new UnauthorizedError('Invalid credentials')

  const payload: JwtPayload = {
    id: user.id,
    rol: user.rol as Rol,
    entidadId: user.entidadId,
  }

  const accessToken = sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  })
  const refreshToken = sign({ id: user.id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      entidadId: user.entidadId,
    },
  }
}

export async function refreshAccessToken(token: string) {
  let decoded: { id: string }
  try {
    decoded = verify(token, config.jwt.refreshSecret) as { id: string }
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token')
  }

  const user = await prisma.usuario.findUnique({ where: { id: decoded.id } })
  if (!user || !user.activo) throw new UnauthorizedError('Account unavailable')

  const payload: JwtPayload = {
    id: user.id,
    rol: user.rol as Rol,
    entidadId: user.entidadId,
  }

  const accessToken = sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  })
  return { accessToken }
}
