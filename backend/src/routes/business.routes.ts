import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export async function businessRoutes(app: FastifyInstance) {
  // Listar todos os estabelecimentos
  app.get('/businesses', async () => {
    const businesses = await prisma.businesses.findMany()
    return businesses
  })

  // Buscar por ID
  app.get('/businesses/:id', async (request, reply) => {
    const getParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = getParamsSchema.parse(request.params)

    const business = await prisma.businesses.findUnique({
      where: { id },
    })

    if (!business) {
      return reply.status(404).send({ message: 'Estabelecimento não encontrado.' })
    }

    return reply.send(business)
  })

  // Criar novo estabelecimento
  app.post('/businesses', async (request, reply) => {
    const createBusinessSchema = z.object({
      name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
      category: z.string(),
    })

    const data = createBusinessSchema.parse(request.body)
    const business = await prisma.businesses.create({ data })

    return reply.status(201).send(business)
  })
}