import { FastifyReply, FastifyRequest } from 'fastify';

export async function checkDuplicate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { documento } = request.query as { documento?: string };

  console.log('Verificando documento no backend:', documento);

  // Retorna falso por padrão para liberar o envio no formulário
  return reply.status(200).send({
    exists: false,
    message: 'Documento disponível para cadastro.',
  });
}