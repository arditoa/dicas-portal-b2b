import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middlewares/auth.middleware.js'

export async function checkinRoutes(app: FastifyInstance) {
  app.post('/checkins', { onRequest: [authenticate] }, async (request, reply) => {
    const { business_id } = request.body as { business_id: string }
    const userId = request.user.sub

    const checkin = await prisma.checkIn.create({
      data: {
        user_id: userId,
        business_id,
      },
    })

    await prisma.pointsLedger.create({
      data: {
        user_id: userId,
        business_id,
        points: 10,
        type: 'EARNED',
      },
    })

    return reply.status(201).send({
      message: 'Check-in realizado com sucesso!',
      checkin_id: checkin.id,
      points_earned: 10,
    })
  })
}