import cors from '@fastify/cors'
import Fastify from 'fastify'
import { appRoutes } from './routes/routes.js'

const app = Fastify({
  logger: true,
})

// Habilita o CORS para permitir requisições vindas do frontend (localhost:5173)
await app.register(cors, {
  origin: true,
})

// Registra as rotas da aplicação
await app.register(appRoutes)

app
  .listen({
    port: 3333,
    host: '0.0.0.0',
  })
  .then(() => {
    console.log('🚀 Servidor rodando em http://localhost:3333')
  })