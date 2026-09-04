import { FastifyInstance } from 'fastify'
import { checkDuplicate } from '../http/controllers/partners/check-duplicate.js'
import { createPartner } from '../http/controllers/partners/create-partner.js'

export async function appRoutes(app: FastifyInstance) {
  // Endpoints consumidos pelo formulário frontend
  app.post('/api/partners', createPartner)
  app.get('/api/partners/check-duplicate', checkDuplicate)
}