import cors from '@fastify/cors';
import Fastify from 'fastify';

const app = Fastify({ logger: true });

// Configuração do CORS
app.register(cors, {
  origin: [
    'https://dicas-portal-b2b.vercel.app', // Sua URL da Vercel em Produção
    'http://localhost:3000',               // Para desenvolvimento local
    'http://localhost:8081',               // Para Expo Web local (se aplicável)
    /^https:\/\/dicas-portal-b2b-.*\.vercel\.app$/ // Suporta URLs de Preview/Branch da Vercel
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
});

// Suas rotas continuam aqui...