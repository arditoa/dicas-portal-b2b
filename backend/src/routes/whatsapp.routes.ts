import { FastifyInstance } from 'fastify'
import { z } from 'zod'

export async function whatsappRoutes(app: FastifyInstance) {
  // 1. Validação de Webhook (Meta Developer Verification Challenge)
  app.get('/webhook/whatsapp', async (request, reply) => {
    const querySchema = z.object({
      'hub.mode': z.string().optional(),
      'hub.verify_token': z.string().optional(),
      'hub.challenge': z.string().optional(),
    })

    const query = querySchema.parse(request.query)
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'meu_token_secreto'

    if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === verifyToken) {
      return reply.status(200).send(query['hub.challenge'])
    }

    return reply.status(403).send({ message: 'Token de verificação inválido.' })
  })

  // 2. Recebimento de Mensagens do Bot
  app.post('/webhook/whatsapp', async (request, reply) => {
    const body = request.body as any

    // Extração básica de mensagens (Padrão Cloud API Meta)
    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const message = value?.messages?.[0]

    if (message) {
      const phone = message.from
      const text = message.text?.body

      console.log(`📱 [WhatsApp] Mensagem de ${phone}: "${text}"`)

      // Aqui entra a lógica de resposta do Bot ou enfileiramento na tabela whatsapp_sessions
    }

    // Retorna 200 OK imediatamente para a API do WhatsApp não tentar reenviar
    return reply.status(200).send({ status: 'EVENT_RECEIVED' })
  })
}