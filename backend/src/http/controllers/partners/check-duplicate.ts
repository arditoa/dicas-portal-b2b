import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma.js'

export async function checkDuplicate(request: FastifyRequest, reply: FastifyReply) {
  const checkQuerySchema = z.object({
    documento: z.string(),
  })

  const { documento } = checkQuerySchema.parse(request.query)

  const partner = await prisma.businesses.findFirst({
    where: { cnpj: documento },
  })

  return reply.status(200).send({ existe: !!partner })
}