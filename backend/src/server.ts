import cors from '@fastify/cors';
import Fastify from 'fastify';

const app = Fastify({
  logger: true,
});

async function main() {
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.register(
    async function (partnerRoutes) {
      partnerRoutes.get('/check-duplicate', async (request, reply) => {
        const { documento } = request.query as { documento?: string };
        return reply.status(200).send({
          exists: false,
          message: 'Documento disponível.',
        });
      });

      partnerRoutes.post('/', async (request, reply) => {
        const body = request.body;
        return reply.status(201).send({
          success: true,
          message: 'Cadastro realizado com sucesso!',
        });
      });
    },
    { prefix: '/api/partners' }
  );

  const PORT = Number(process.env.PORT) || 3333;
  const HOST = '0.0.0.0';

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();