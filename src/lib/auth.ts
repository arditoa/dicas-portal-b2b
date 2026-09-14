import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SEGREDO_JWT = process.env.JWT_SECRET;
const HORAS_VALIDADE_TOKEN = 12;

if (!SEGREDO_JWT && process.env.NODE_ENV !== 'test') {
  throw new Error(
    'JWT_SECRET não está definido nas variáveis de ambiente do backend.'
  );
}

export interface PayloadToken {
  usuarioId: string;
  papel: 'moderador' | 'admin';
}

export async function gerarHashSenha(senhaEmTexto: string): Promise<string> {
  return bcrypt.hash(senhaEmTexto, 12);
}

export async function conferirSenha(senhaEmTexto: string, hashGuardado: string): Promise<boolean> {
  return bcrypt.compare(senhaEmTexto, hashGuardado);
}

export function gerarTokenSessao(payload: PayloadToken): string {
  return jwt.sign(payload, SEGREDO_JWT as string, { expiresIn: `${HORAS_VALIDADE_TOKEN}h` });
}

export function verificarTokenSessao(token: string): PayloadToken {
  return jwt.verify(token, SEGREDO_JWT as string) as PayloadToken;
}
