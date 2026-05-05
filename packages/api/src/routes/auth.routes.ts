import { FastifyInstance } from 'fastify'
import { login, refreshAccessToken } from '../services/auth.service'

export default async function authRoutes(app: FastifyInstance) {
  const authRateLimit = { max: 10, timeWindow: '1 minute' }

  app.post<{ Body: { email: string; password: string } }>(
    '/login',
    {
      config: { rateLimit: authRateLimit },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body
      const result = await login(email, password)
      return reply.send({ data: result })
    },
  )

  app.post<{ Body: { refreshToken: string } }>(
    '/refresh',
    {
      config: { rateLimit: authRateLimit },
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body
      const result = await refreshAccessToken(refreshToken)
      return reply.send({ data: result })
    },
  )
}
