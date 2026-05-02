import Fastify, { FastifyInstance, FastifyRequest } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { config } from './config'
import corsPlugin from './plugins/cors'
import { AppError } from './utils/errors'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.isDev ? 'debug' : 'info',
      // Never log authorization headers or credential fields — Rule 7
      redact: [
        'req.headers.authorization',
        'req.body.password',
        'req.body.passwordHash',
      ],
    },
  })

  // ── Rate limiting ────────────────────────────────────────────────────────────
  // Global default: 200 req/min, keyed by userId when authenticated, else IP.
  // Auth routes override this to 10 req/min in their route config:
  //   config: { rateLimit: { max: 10, keyGenerator: (req) => req.ip } }
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    keyGenerator(request) {
      // request.user is populated by authenticate middleware; may be absent on
      // public routes like /auth/login, so we guard with optional chaining.
      const req = request as FastifyRequest & { user?: { id: string } }
      return req.user?.id ?? request.ip
    },
    errorResponseBuilder(_request, context) {
      return {
        error: {
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Retry after ${context.after}.`,
        },
      }
    },
  })

  // ── CORS ─────────────────────────────────────────────────────────────────────
  await app.register(corsPlugin)

  // ── Global error handler ─────────────────────────────────────────────────────
  // Catches AppError subclasses and converts them to structured JSON.
  // Unknown errors: log internally, return a generic message.
  // Stack traces only in development — never in production.
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      })
    }

    // Log error type and message only — never the full request body — Rule 7
    app.log.error(
      { errName: error.name, errMessage: error.message },
      'Unhandled server error',
    )

    const body: Record<string, unknown> = {
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    }
    if (config.isDev) {
      body.stack = error.stack
    }

    return reply.status(500).send(body)
  })

  // Routes are registered here per-module once route files are ready:
  // await app.register(import('./routes'), { prefix: '/api/v1' })

  return app
}

export async function startServer(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.listen({ port: config.api.port, host: config.api.host })
  return app
}
