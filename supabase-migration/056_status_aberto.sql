-- Status de relacionamento (opcional, privado): acrescenta "aberto" ao lado de solteiro / comprometido.
-- "Prefiro não informar" continua sendo o valor 'nao_informado'.
-- IMPORTANTE: rode este arquivo SOZINHO no SQL Editor (valor novo de enum não pode ser usado na mesma transação).
alter type public.status_relacionamento add value if not exists 'aberto';
