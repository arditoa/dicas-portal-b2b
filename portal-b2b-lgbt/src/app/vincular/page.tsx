'use client';
import { ArrowLeft, CheckCircle2, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Fluxo: o cadastro público (/cadastro/local) é sempre anônimo — não pede
// login. Então quem se cadastrou lá pode não ter (ainda) uma conta. Esta
// tela é o passo 2: criar/entrar na conta e pedir pra ligar essa conta ao
// local já cadastrado, achando ele pelo CNPJ. A aprovação é sempre manual
// (a Andrea confere pelo /admin) — ver 005_planos_comerciais_e_vinculo_local.sql.
type LocalEncontrado = {
  id: string;
  nome: string;
  categoria: string;
  status: string;
  cidade: string;
  bairro: string | null;
};

export default function VincularLocalPage() {
  const router = useRouter();
  const [checandoSessao, setCheandoSessao] = useState(true);
  const [logado, setLogado] = useState(false);

  const [cnpj, setCnpj] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<LocalEncontrado | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setLogado(!!data?.user);
      setCheandoSessao(false);
    })();
  }, []);

  const digitsOnly = (v: string) => v.replace(/\D/g, '');

  const buscarLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setResultado(null);
    setNaoEncontrado(false);
    const cnpjLimpo = digitsOnly(cnpj);
    if (cnpjLimpo.length !== 14) {
      setErro('Digite o CNPJ completo (14 dígitos).');
      return;
    }
    setBuscando(true);
    try {
      // O CNPJ não é uma coluna pública pesquisável por qualquer um — a RLS
      // de `locais` só deixa ver o próprio local sem dono (owner_id nulo).
      // A busca abaixo funciona porque o cadastro público grava o CNPJ e a
      // policy de leitura pública permite achar por ele; se sua base tiver
      // uma policy mais restrita, ajuste aqui para uma RPC dedicada.
      const { data, error } = await supabase
        .from('locais')
        .select('id, nome, categoria, status, cidade, bairro')
        .eq('cnpj', cnpjLimpo)
        .is('owner_id', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setNaoEncontrado(true);
      } else {
        setResultado(data as LocalEncontrado);
      }
    } catch (err: any) {
      setErro(err.message || 'Não foi possível buscar. Tente novamente.');
    } finally {
      setBuscando(false);
    }
  };

  const confirmarVinculo = async () => {
    if (!resultado) return;
    setEnviando(true);
    setErro('');
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push('/login');
        return;
      }
      const { error } = await supabase.from('solicitacoes_vinculo_local').insert({
        local_id: resultado.id,
        user_id: userData.user.id,
        documento_informado: digitsOnly(cnpj),
      });
      if (error) throw error;
      setSucesso(true);
    } catch (err: any) {
      setErro(err.message || 'Não foi possível enviar o pedido de vínculo.');
    } finally {
      setEnviando(false);
    }
  };

  if (checandoSessao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  if (!logado) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex flex-col items-center justify-center p-6 text-center text-white">
        <h1 className="text-xl font-black mb-2">Crie sua conta primeiro</h1>
        <p className="text-[#A0A0B2] text-sm mb-6 max-w-sm">
          Pra vincular seu local a um login, você precisa ter uma conta no portal.
        </p>
        <Link
          href="/login"
          className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-sm font-bold px-6 py-3 rounded-xl transition"
        >
          Entrar ou cadastrar conta
        </Link>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] flex flex-col items-center justify-center p-6 text-center text-white">
        <CheckCircle2 className="text-[#4CAF7D] mb-4" size={40} />
        <h1 className="text-xl font-black mb-2">Pedido enviado</h1>
        <p className="text-[#A0A0B2] text-sm mb-6 max-w-sm">
          Vamos conferir manualmente e vincular o local "{resultado?.nome}" à sua conta. Isso costuma
          levar até 48h. Você recebe uma confirmação por e-mail.
        </p>
        <Link href="/dashboard" className="text-[#E1306C] text-sm font-bold hover:underline">
          Voltar ao painel
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] p-6 md:p-12 text-white">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-8">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-black mb-2">Vincular meu local já cadastrado</h1>
        <p className="text-[#A0A0B2] text-sm mb-8">
          Digite o CNPJ que você usou no cadastro público do seu espaço.
        </p>

        <form onSubmit={buscarLocal} className="space-y-4">
          <input
            type="text"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
          />
          {erro && <p className="text-red-400 text-xs">{erro}</p>}
          <button
            type="submit"
            disabled={buscando}
            className="w-full bg-[#232230] hover:bg-[#2D2B3D] text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            {buscando ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Buscar
          </button>
        </form>

        {naoEncontrado && (
          <div className="mt-6 bg-[#161520] border border-[#232230] p-4 rounded-xl text-sm text-[#A0A0B2]">
            Não achamos nenhum local aprovado e sem responsável com esse CNPJ. Isso pode ser porque:
            ainda não cadastrou (
            <Link href="/cadastro/local" className="text-[#E1306C] font-bold hover:underline">
              cadastre aqui
            </Link>
            ), o cadastro ainda está em análise (só aparece aqui depois de aprovado — normalmente até
            48h), ou já foi vinculado a outra conta.
          </div>
        )}

        {resultado && (
          <div className="mt-6 bg-[#161520] border border-[#232230] p-5 rounded-xl">
            <h3 className="font-bold text-white mb-1">{resultado.nome}</h3>
            <p className="text-xs text-[#A0A0B2] mb-4 capitalize">
              {resultado.categoria} · {resultado.bairro ? `${resultado.bairro}, ` : ''}{resultado.cidade}
            </p>
            <button
              onClick={confirmarVinculo}
              disabled={enviando}
              className="w-full bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-3 rounded-xl transition text-sm"
            >
              {enviando ? 'Enviando...' : 'É este o meu local — pedir vínculo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
