import { FastifyInstance } from 'fastify';
import { checkDuplicate } from './http/controllers/partners/check-duplicate.js';

export async function appRoutes(app: FastifyInstance) {
  app.register(
    async function (partnerRoutes) {
      // GET /api/partners/check-duplicate
      partnerRoutes.get('/check-duplicate', checkDuplicate);

      // POST /api/partners
      partnerRoutes.post('/', async (request, reply) => {
        const body = request.body;
        console.log('Cadastro recebido:', body);

        return reply.status(201).send({
          success: true,
          message: 'Cadastro realizado com sucesso!',
        });
      });
    },
    { prefix: '/api/partners' }
  );
}