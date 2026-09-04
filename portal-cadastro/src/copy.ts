// copy.ts
// Todo o texto do formulário de cadastro de parceiro, num lugar só.

export const copy = {
  pagina: {
    titulo: 'Cadastre seu espaço no Dicas LGBT',
    lede: 'Leva menos de 2 minutos. É grátis para começar — sem cartão, sem compromisso.',
  },
  documento: {
    label: 'CPF ou CNPJ',
    placeholder: 'Digite seu CPF ou CNPJ',
    ajuda: 'Ainda não abriu empresa? Sem problema — pode usar seu CPF.',
    erroInvalido: 'Esse CPF/CNPJ não parece válido. Confira os números.',
    buscando: 'Buscando os dados do seu CNPJ...',
    encontrado: 'Encontramos! Confira se está tudo certo — pode editar qualquer campo.',
    naoEncontrado: 'Não encontramos esse CNPJ automaticamente — sem problema, é só preencher os campos abaixo.',
    situacaoIrregular: (situacao: string) =>
      `A Receita mostra a situação "${situacao}" para esse CNPJ. Isso não impede o envio — nosso time só vai olhar com mais atenção na aprovação.`,
  },
  responsavel: {
    label: 'Seu nome',
    placeholder: 'Nome de quem está cadastrando',
  },
  espaco: {
    labelNome: 'Nome do espaço',
    placeholderNome: 'Ex: Bar da Esquina',
    labelCategoria: 'Categoria',
    categorias: [
      { valor: 'bar', rotulo: 'Bar' },
      { valor: 'balada', rotulo: 'Balada' },
      { valor: 'comer', rotulo: 'Comer' },
      { valor: 'roteiro', rotulo: 'Roteiro' },
    ],
  },
  whatsapp: {
    label: 'WhatsApp',
    placeholder: '(11) 99999-9999',
    ajuda: 'É por aqui que a gente confirma seu cadastro e fala de novidades.',
    erroInvalido: 'Confira o número — falta ou sobra dígito.',
  },
  endereco: {
    labelCep: 'CEP',
    placeholderCep: '00000-000',
    ajudaCep: 'Só o CEP — a gente completa o resto.',
    buscandoCep: 'Buscando endereço...',
    cepNaoEncontrado: 'Não achamos esse CEP — confira o número ou preencha o endereço manualmente.',
    labelLogradouro: 'Rua/Avenida',
    labelNumero: 'Número',
    labelComplemento: 'Complemento (opcional)',
    labelBairro: 'Bairro',
    labelCidade: 'Cidade',
    labelUf: 'Estado',
  },
  termos: {
    label: 'Li e aceito os termos de uso do Dicas LGBT',
    erro: 'Precisa aceitar os termos para enviar.',
  },
  envio: {
    botao: 'Enviar cadastro',
    botaoEnviando: 'Enviando...',
    erroGenerico: 'Não deu pra enviar agora. Tenta de novo em instantes.',
    duplicado: 'Esse CPF/CNPJ já está cadastrado.',
    duplicadoAcao: 'Falar com o time no WhatsApp',
  },
  sucesso: {
    titulo: 'Cadastro recebido! 🎉',
    corpo: 'Nosso time confere os dados em até 2 dias úteis. Assim que aprovar, seu espaço já aparece no app — de graça, no plano Básico.',
    ajuda: 'Alguma dúvida enquanto isso? Chama a gente no WhatsApp.',
  },
  entradaWhatsApp: {
    botao: 'Prefere pelo WhatsApp?',
    descricao: 'Manda uma mensagem e a gente te envia o link do cadastro já com seu número preenchido.',
  },
} as const;