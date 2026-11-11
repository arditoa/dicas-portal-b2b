'use client';

import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import FormularioFesta from '../../../../components/cadastro/FormularioFesta';
import { useParceiro } from '../../../../components/parceiro/ParceiroContext';
import { supabase } from '../../../../lib/supabase';

// Novo evento feito POR DENTRO do portal, por quem já tem acesso (organizador ou dono de local).
// Nome e WhatsApp vêm da conta (o login do parceiro é parceiro.<whatsapp>@login.vezpabar.app), então ele não
// preenche o contato de novo. O gatilho do banco (enforce_evento_seguro_insert) grava criado_por = auth.uid(),
// deixa o evento "pendente" e, na aprovação pelo /admin, não cria acesso novo nem manda senha: vai só o aviso.
export default function NovoEventoPage() {
  const router = useRouter();
  const parceiro = useParceiro();
  const [carregando, setCarregando] = useState(true);
  const [organizador, setOrganizador] = useState<{ nome: string; whatsapp: string } | undefined>(undefined);
  const [enviado, setEnviado] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.replace('/login');
        return;
      }
      const m = (user.email || '').match(/^parceiro\.(\d+)@login\.vezpabar\.app$/);
      if (m) {
        // nome: o último contato informado em um evento anterior dele (se houver)
        const { data: anterior } = await supabase
          .from('eventos')
          .select('contato_nome')
          .eq('criado_por', user.id)
          .not('contato_nome', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (vivo) setOrganizador({ nome: (anterior?.contato_nome as string) || '', whatsapp: m[1] });
      }
      if (vivo) setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [router]);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-white">
        <div className="bg-[#161520] border border-[#232230] rounded-2xl p-8 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h1 className="text-xl font-black">Evento enviado para análise</h1>
          <p className="text-sm text-[#A0A0B2]">
            “{enviado}” foi enviado. Nossa equipe confere e, quando aprovar, você recebe o aviso no WhatsApp e o evento
            entra no app. Enquanto isso você já pode ver e editar em “Meus eventos”.
          </p>
          <Link href="/dashboard/eventos" className="inline-block bg-[#E1306C] hover:bg-[#C2285C] text-white text-sm font-bold px-5 py-2.5 rounded-xl">
            Ir para Meus eventos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">
      <Link href="/dashboard/eventos" className="inline-flex items-center gap-2 text-sm text-[#A0A0B2] hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Meus eventos
      </Link>
      <h1 className="text-2xl font-black mb-1">Novo evento{parceiro ? ` · ${parceiro.local.nome}` : ''}</h1>
      <p className="text-xs text-[#A0A0B2] mb-6">
        Preencha os dados da festa. Depois de enviado, ele passa pela análise da equipe antes de aparecer no app.
      </p>
      <FormularioFesta organizador={organizador} localId={parceiro?.local.id} onSucesso={(titulo) => setEnviado(titulo)} />
    </div>
  );
}
