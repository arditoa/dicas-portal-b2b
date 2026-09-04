import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { conferirSenha, gerarTokenSessao } from '../lib/auth';

interface CorpoLogin {
  email: string;
  senha: string;
}

export async function registrarRotaAuth(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const { email, senha } = request.body as CorpoLogin;

    if (!email || !senha) {
      return reply.status(400).send({ erro: 'Informe e-mail e senha.' });
    }

    const usuario = await prisma.internalUser.findUnique({ where: { email: email.toLowerCase().trim() } });
    const credenciaisInvalidas = () => reply.status(401).send({ erro: 'E-mail ou senha incorretos.' });

    if (!usuario || !usuario.ativo) {
      return credenciaisInvalidas();
    }

    const senhaConfere = await conferirSenha(senha, usuario.senha_hash);
    if (!senhaConfere) {
      return credenciaisInvalidas();
    }

    const token = gerarTokenSessao({ usuarioId: usuario.id, papel: usuario.papel });

    await prisma.internalUser.update({
      where: { id: usuario.id },
      data: { ultimo_login: new Date() },
    });

    return reply.send({
      token,
      usuario: { nome: usuario.nome, email: usuario.email, papel: usuario.papel },
    });
  });
}
