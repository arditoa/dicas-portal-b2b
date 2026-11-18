-- TESTE (não é migração): troca a ação "Teste" do Vezpa para "Sorvete Kibon free".
-- A ação aparece para todo mundo no app enquanto "mostrar_no_app" estiver ligado.
-- Para desfazer no fim do teste, rode o bloco do final.
update public.acoes_marca
   set marca = 'Kibon', nome = 'Sorvete Kibon free', chamada = 'Sorvete Kibon free', cor = '#E63935'
 where marca = 'Teste';

select id, marca, nome, chamada, cor, inicio, fim, mostrar_no_app from public.acoes_marca where marca = 'Kibon';

-- Desfazer depois do teste:
-- update public.acoes_marca set mostrar_no_app = false where marca = 'Kibon' and nome = 'Sorvete Kibon free';

-- Depois da migração 128: brinde próprio, para os 100 primeiros (o app mostra "Restam 100").
update public.acoes_marca
   set brinde = 'Sorvete Kibon', limite_total = 100, regra = 'Mostre a tela no balcão', brinde_opcoes = array['Morango', 'Chocolate', 'Limão'], brinde_pergunta = 'Qual sabor você quer?'
 where marca = 'Kibon';
select marca, brinde, limite_total, public.contagem_acao(id) from public.acoes_marca where marca = 'Kibon';
