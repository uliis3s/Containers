import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import { FastifyInstance } from 'fastify'
import { config } from '../config'

// Wrapped with fastify-plugin so CORS headers apply to all routes (no scope isolation)
export default fp(async function corsPlugin(app: FastifyInstance) {
  await app.register(cors, {
    // Explicit allow-list — never '*'. Only the known Next.js origin.
    origin: config.api.webUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // required for Auth.js cookies
  })
})
