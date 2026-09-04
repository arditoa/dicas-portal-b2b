import 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string
      sub: string
      email: string
    }
  }
}