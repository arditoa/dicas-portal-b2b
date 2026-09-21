-- ============================================================================
-- 028 — Contato real (nome/WhatsApp) no evento criado pelo cadastro rápido
-- ============================================================================
-- Bug real reportado pela Andrea: "as festas de cadastro tambem tem que ter
-- acesso ao portal" — organizadores que cadastram a festa pelo CADASTRO
-- RÁPIDO (FormularioCadastroRapido.tsx, aba "Evento/Festa") nunca ganham
-- login automático na aprovação, mesmo preenchendo nome e WhatsApp no
-- formulário.
--
-- Causa raiz: `cadastro_rapido_criar_evento` (017) grava titulo/descricao/
-- data_inicio/estilos_musicais/publico_tags, mas NUNCA gravou as colunas
-- reais `contato_nome`/`contato_whatsapp` (criadas na 015) — o nome e o
-- WhatsApp digitados no cadastro rápido só ficam embutidos como TEXTO
-- dentro de `descricao` ("Contato: nome — whatsapp"), nunca nas colunas de
-- verdade. `/api/aprovar-evento` (Rodada 36) só cria login automático
-- quando `evento.contato_whatsapp` (a coluna) está preenchido — para um
-- evento do cadastro rápido essa coluna está sempre NULL, então a conta do
-- organizador nunca é criada, mesmo aprovando o evento normalmente.
--
-- O cadastro completo (`/cadastro/evento`) já não tem esse problema — ele
-- grava essas colunas direto no insert (015). Só o cadastro rápido, que usa
-- RPC em vez de insert direto, ficou de fora dessa gravação.
--
-- Solução (mesma receita já usada pra foto/horário do cadastro rápido —
-- 017/021): uma função SECURITY DEFINER nova, chamada como passo extra
-- depois de `cadastro_rapido_criar_evento`, restrita à mesma janela segura
-- (evento pendente, sem organizador ainda) — nunca deixamos de propósito a
-- assinatura de `cadastro_rapido_criar_evento` mexida, pra não precisar
-- lidar com overload de função/drop da versão antiga.
-- ============================================================================

create or replace function public.cadastro_rapido_definir_contato_evento(
  p_id uuid,
  p_contato_nome text,
  p_contato_whatsapp text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.eventos
    set contato_nome = p_contato_nome,
        contato_whatsapp = p_contato_whatsapp
    where id = p_id
      and status = 'pendente'
      and criado_por is null;

  return found;
end;
$$;

grant execute on function public.cadastro_rapido_definir_contato_evento(uuid, text, text) to anon, authenticated;
