import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export async function userRoutes(app: FastifyInstance) {
  app.post('/users', async (request, reply) => {
    const createUserSchema = z.object({
      nome_social: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
      data_nascimento: z.string().transform((val: string) => new Date(val)),
      whatsapp: z.string().min(10, 'Número de WhatsApp inválido'),
      modo_discreto: z.boolean().default(true),
      status_solteiro: z.boolean().default(false),
    })

    const data = createUserSchema.parse(request.body)
    const user = await prisma.user.create({ data })

    return reply.status(201).send(user)
  })

  app.get('/users/:id', async (request, reply) => {
    const getUserParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = getUserParamsSchema.parse(request.params)

    const user = await prisma.user.findUnique({
      where: { id },
      include: { consents: true },
    })

    if (!user) {
      return reply.status(404).send({ message: 'Usuário não encontrado.' })
    }

    return reply.send(user)
  })

  app.patch('/users/:id', async (request, reply) => {
    const getUserParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const updateUserBodySchema = z.object({
      nome_social: z.string().min(2).optional(),
      modo_discreto: z.boolean().optional(),
      status_solteiro: z.boolean().optional(),
    })

    const { id } = getUserParamsSchema.parse(request.params)
    const data = updateUserBodySchema.parse(request.body)

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    })

    return reply.send(updatedUser)
  })

  app.post('/users/:id/consents', async (request, reply) => {
    const getUserParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const createConsentSchema = z.object({
      tipo: z.enum(['lgpd', 'localizacao']),
      versao_politica: z.string().default('1.0'),
    })

    const { id } = getUserParamsSchema.parse(request.params)
    const { tipo, versao_politica } = createConsentSchema.parse(request.body)

    const consent = await prisma.userConsent.create({
      data: {
        user_id: id,
        tipo,
        versao_politica,
      },
    })

    return reply.status(201).send(consent)
  })
}