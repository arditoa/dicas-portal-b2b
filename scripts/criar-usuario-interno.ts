import { prisma } from '../lib/prisma';
import { gerarHashSenha } from '../lib/auth';

async function main() {
  const [nome, email, senha, papel] = process.argv.slice(2);

  if (!nome || !email || !senha || !papel) {
    console.error('Uso: npx tsx scripts/criar-usuario-interno.ts "Nome" email@x.com "senha" moderador|admin');
    process.exit(1);
  }
  if (papel !== 'moderador' && papel !== 'admin') {
    console.error('O último argumento (papel) precisa ser "moderador" ou "admin".');
    process.exit(1);
  }
  if (senha.length < 10) {
    console.error('Use uma senha com pelo menos 10 caracteres.');
    process.exit(1);
  }

  const senhaHash = await gerarHashSenha(senha);

  const usuario = await prisma.internalUser.create({
    data: {
      nome,
      email: email.toLowerCase().trim(),
      senha_hash: senhaHash,
      papel: papel as 'moderador' | 'admin',
    },
  });

  console.log(`Conta criada: ${usuario.nome} <${usuario.email}> — papel: ${usuario.papel}`);
}

main()
  .catch((erro) => {
    console.error('Falha ao criar usuário interno:', erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
