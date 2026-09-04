import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma.js'

export async function createPartner(request: FastifyRequest, reply: FastifyReply) {
  const createPartnerBodySchema = z.object({
    documento: z.string(),
    nomeResponsavel: z.string(),
    whatsapp: z.string(),
    nomeEspaco: z.string(),
    categoria: z.string(),
    cep: z.string(),
    logradouro: z.string(),
    numero: z.string(),
    complemento: z.string().optional(),
    bairro: z.string(),
    cidade: z.string(),
    uf: z.string(),
    aceitouTermos: z.boolean(),
    origemLead: z.enum(['whatsapp', 'portal']).optional(),
  })

  const data = createPartnerBodySchema.parse(request.body)

  // Checa duplicidade usando o campo 'cnpj' da tabela 'businesses'
  const partnerExists = await prisma.businesses.findFirst({
    where: { cnpj: data.documento },
  })

  if (partnerExists) {
    return reply.status(409).send({ message: 'Este CPF/CNPJ já está cadastrado.' })
  }

  // Cria o registro no banco com os nomes das colunas da tabela 'businesses'
  const partner = await prisma.businesses.create({
    data: {
      name: data.nomeEspaco,
      category: data.categoria,
      cnpj: data.documento,
      neighborhood: data.bairro,
      address: `${data.logradouro}, ${data.numero}${data.complemento ? ' - ' + data.complemento : ''} - ${data.cidade}/${data.uf}`,
    },
  })

  return reply.status(201).send({ id: partner.id })
}