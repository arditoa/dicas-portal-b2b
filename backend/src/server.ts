import cors from '@fastify/cors';
import Fastify from 'fastify';

const app = Fastify({
  logger: true,
});

async function main() {
  // 1. Configuração do CORS para aceitar requisições da Vercel e Localhost
  await app.register(cors, {
    origin: (origin, cb) => {
      // Permite requisições sem origin (como mobile ou Postman)
      if (!origin) {
        cb(null, true);
        return;
      }

      // Domínios permitidos: Vercel, Localhost e o próprio Render
      const allowedOrigins = [
        'https://dicas-portal-b2b.vercel.app',
        'http://localhost:3000',
        'http://localhost:3333',
        'http://localhost:8081',
      ];

      // Aceita qualquer subdomínio da Vercel ou os domínios listados
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        cb(null, true);
      } else {
        cb(null, true); // Pode mudar para `cb(new Error("Not allowed by CORS"), false)` se quiser restringir mais
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // 2. Rota de Healthcheck (para o Render e monitoramento)
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // 3. Rota de verificação de duplicidade (CPF/CNPJ)
  app.get('/api/partners/check-duplicate', async (request, reply) => {
    const { documento } = request.query as { documento?: string };

    if (!documento) {
      return reply.status(400).send({ error: 'Documento é obrigatório.' });
    }

    // Exemplo de lógica simples (substitua pela sua consulta no banco se necessário)
    const exists = false; 

    return reply.send({
      exists,
      message: exists ? 'Documento já cadastrado.' : 'Documento disponível.',
    });
  });

  // 4. Rota principal de cadastro
  app.post('/api/partners', async (request, reply) => {
    const body = request.body;

    console.log('Dados do parceiro recebidos:', body);

    // Lógica para salvar no banco de dados viria aqui

    return reply.status(201).send({
      success: true,
      message: 'Cadastro realizado com sucesso!',
      data: body,
    });
  });

  // 5. Inicialização do servidor ajustada para o Render
  const PORT = Number(process.env.PORT) || 3333;
  const HOST = '0.0.0.0'; // Essencial para o Render expor o serviço externamente

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();