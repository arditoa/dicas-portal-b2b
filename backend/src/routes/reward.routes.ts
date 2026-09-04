import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middlewares/auth.middleware.js'

export async function rewardRoutes(app: FastifyInstance) {
  // 1. Listar todas as Recompensas (Pública)
  app.get('/rewards', async () => {
    return await prisma.rewards.findMany()
  })

  // 2. Criar Nova Recompensa (Protegida)
  app.post('/rewards', { preHandler: [authenticate] }, async (request, reply) => {
    const createRewardSchema = z.object({
      business_id: z.string().uuid(),
      title: z.string().min(3),
      points_cost: z.number().positive(),
    })

    const { business_id, title, points_cost } = createRewardSchema.parse(request.body)

    const reward = await prisma.rewards.create({
      data: {
        business_id,
        title,
        cost_points: points_cost,
      },
    })

    return reply.status(201).send(reward)
  })

  // 3. Resgatar Recompensa (Protegida: usa ID do usuário do Token JWT)
  app.post('/rewards/:id/redeem', { preHandler: [authenticate] }, async (request, reply) => {
    const getParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id: reward_id } = getParamsSchema.parse(request.params)
    const user_id = request.user!.id

    const reward = await prisma.rewards.findUnique({
      where: { id: reward_id },
    })

    if (!reward) {
      return reply.status(404).send({ message: 'Recompensa não encontrada.' })
    }

    const ledger = await prisma.points_ledger.findMany({
      where: { user_id },
    })

    const totalPoints = ledger.reduce((acc, item) => acc + item.points, 0)

    if (totalPoints < reward.cost_points) {
      return reply.status(400).send({ message: 'Saldo de pontos insuficiente.' })
    }

    const couponCode = `CPN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const coupon = await prisma.coupons.create({
      data: {
        profile_id: user_id,
        reward_id,
        code: couponCode,
      },
    })

    await prisma.points_ledger.create({
      data: {
        user_id,
        points: -reward.cost_points,
        reason: `Resgate de recompensa: ${reward.title}`,
      },
    })

    return reply.status(201).send({
      message: 'Recompensa resgatada com sucesso!',
      coupon,
    })
  })

  // 4. Listar Cupons do Usuário Autenticado (Protegida)
  app.get('/users/me/coupons', { preHandler: [authenticate] }, async (request, reply) => {
    const profile_id = request.user!.id

    const coupons = await prisma.coupons.findMany({
      where: { profile_id },
    })

    return reply.send(coupons)
  })
}