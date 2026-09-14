import type { FastifyRequest, FastifyReply } from 'fastify';
import { verificarTokenSessao, type PayloadToken } from './auth';

declare module 'fastify' {
  interface FastifyRequest {
    usuario?: PayloadToken;
  }
}

export function requireRole(papeisPermitidos: Array<'moderador' | 'admin'>) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const cabecalho = request.headers.authorization;
    const token = cabecalho?.startsWith('Bearer ') ? cabecalho.slice(7) : null;

    if (!token) {
      return reply.status(401).send({ erro: 'Faça login para acessar esta área.' });
    }

    let payload: PayloadToken;
    try {
      payload = verificarTokenSessao(token);
    } catch {
      return reply.status(401).send({ erro: 'Sessão inválida ou expirada. Faça login de novo.' });
    }

    if (!papeisPermitidos.includes(payload.papel)) {
      return reply.status(403).send({ erro: 'Sua conta não tem permissão para esta ação.' });
    }

    request.usuario = payload;
  };
}
