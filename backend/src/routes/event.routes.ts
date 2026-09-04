import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middlewares/auth.middleware.js'

export async function eventRoutes(app: FastifyInstance) {
  // --- EVENTOS ---

  // Listar eventos (Pública)
  app.get('/events', async () => {
    return await prisma.events.findMany()
  })

  // Criar evento (Protegida)
  app.post('/events', { preHandler: [authenticate] }, async (request, reply) => {
    const createEventSchema = z.object({
      business_id: z.string().uuid(),
      title: z.string().min(2),
      description: z.string().optional(),
      starts_at: z.string().transform((val) => new Date(val)),
    })

    const data = createEventSchema.parse(request.body)
    const event = await prisma.events.create({ data })

    return reply.status(201).send(event)
  })

  // --- ROTEIROS (ITINERARIES) ---

  // Listar roteiros (Pública)
  app.get('/itineraries', async () => {
    return await prisma.itineraries.findMany()
  })

  // Criar roteiro (Protegida)
  app.post('/itineraries', { preHandler: [authenticate] }, async (request, reply) => {
    const createItinerarySchema = z.object({
      title: z.string().min(3),
      description: z.string().optional(),
      city: z.string().min(2, 'Cidade é obrigatória'),
    })

    const data = createItinerarySchema.parse(request.body)
    const itinerary = await prisma.itineraries.create({ data })

    return reply.status(201).send(itinerary)
  })
}