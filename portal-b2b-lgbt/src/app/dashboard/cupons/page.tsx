'use client';
import { ArrowLeft, Loader2, Plus, Tag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

// Cupons são 100% do dono do local — a policy `cupons_write_dono_ou_admin`
// (001_migrar_para_locais.sql) já deixa o dono criar/editar/apagar cupom
// do PRÓPRIO local direto, sem precisar de nenhuma aprovação da Andrea.
// Quem resgata (usuário final, no app) grava em `cupons_resgatados` — essa
// tela só mostra quantos já foram resgatados de cada um, pra referência.

type Cupom = {
  id: string;
  titulo: string;
  descricao: string | null;
  codigo: string | null;
  valido_de: string | null;
  valido_ate: string | null;
  limite_uso: number | null;
  ativo: boolean;
  created_at: string;
  resgates?: number;
};

export default function CupomPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [localId, setLocalId] = useState<string | null>(null);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [codigo, setCodigo] = useState('');
  const [validoDe, setValidoDe] = useState('');
  const [validoAte, setValidoAte] = useState('');
  const [limiteUso, setLimiteUso] = useState('');

  const carregarCupons = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('cupons')
      .select('id, titulo, descricao, codigo, valido_de, valido_ate, limite_uso, ativo, created_at, cupons_resgatados(count)')
      .eq('local_id', id)
      .order('created_at', { ascending: false });

    const lista = (data || []).map((c: any) => ({
      ...c,
      resgates: c.cupons_resgatados?.[0]?.count ?? 0,
    }));
    setCupons(lista);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push('/login');
        return;
      }
      const { data: local } = await supabase
        .from('locais')
        .select('id')
        .eq('owner_id', userData.user.id)
        .maybeSingle();

      if (!local) {
        router.push('/dashboard');
        return;
      }
      setLocalId(local.id);
      await carregarCupons(local.id);
      setCarregando(false);
    })();
  }, [router, carregarCupons]);

  const criarCupom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localId) return;
    setSalvando(true);
    setErro('');

    const { error } = await supabase.from('cupons').insert({
      local_id: localId,
      titulo,
      descricao: descricao || null,
      codigo: codigo || null,
      valido_de: validoDe ? new Date(validoDe).toISOString() : null,
      valido_ate: validoAte ? new Date(validoAte).toISOString() : null,
      limite_uso: limiteUso ? Number(limiteUso) : null,
    });

    if (error) {
      setErro(error.message);
    } else {
      setTitulo('');
      setDescricao('');
      setCodigo('');
      setValidoDe('');
      setValidoAte('');
      setLimiteUso('');
      setMostrarForm(false);
      await carregarCupons(localId);
    }
    setSalvando(false);
  };

  const alternarAtivo = async (cupom: Cupom) => {
    if (!localId) return;
    await supabase.from('cupons').update({ ativo: !cupom.ativo }).eq('id', cupom.id);
    await carregarCupons(localId);
  };

  const apagarCupom = async (id: string) => {
    if (!localId) return;
    await supabase.from('cupons').delete().eq('id', id);
    await carregarCupons(localId);
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-6">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black">Cupons</h1>
          <p className="text-[#A0A0B2] text-xs mt-1">Cupons de desconto que aparecem no perfil do seu local no app.</p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <Plus size={14} /> Novo cupom
        </button>
      </div>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      {mostrarForm && (
        <form onSubmit={criarCupom} className="bg-[#161520] border border-[#232230] rounded-2xl p-6 mb-8 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Título</label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: 10% de desconto na primeira visita"
              className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Código (opcional)</label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="LGBT10"
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Válido até</label>
              <input
                type="date"
                value={validoAte}
                onChange={(e) => setValidoAte(e.target.value)}
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Limite de uso</label>
              <input
                type="number"
                min="1"
                value={limiteUso}
                onChange={(e) => setLimiteUso(e.target.value)}
                placeholder="Sem limite"
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-[#232230] hover:bg-[#2D2B3D] text-white font-bold py-3 rounded-xl transition text-sm"
          >
            {salvando ? 'Salvando...' : 'Criar cupom'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {cupons.length === 0 && <p className="text-xs text-[#626274]">Nenhum cupom criado ainda.</p>}
        {cupons.map((c) => (
          <div key={c.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Tag size={14} className="text-[#E1306C]" /> {c.titulo}
                {!c.ativo && <span className="text-[10px] text-[#626274] font-normal">(inativo)</span>}
              </h3>
              {c.descricao && <p className="text-xs text-[#A0A0B2] mt-1">{c.descricao}</p>}
              <p className="text-[11px] text-[#626274] mt-1">
                {c.codigo ? `Código: ${c.codigo} · ` : ''}
                {c.limite_uso ? `${c.resgates}/${c.limite_uso} resgatados` : `${c.resgates} resgatados`}
                {c.valido_ate ? ` · válido até ${new Date(c.valido_ate).toLocaleDateString('pt-BR')}` : ''}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => alternarAtivo(c)}
                className="bg-[#232230] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#2D2B3D]"
              >
                {c.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => apagarCupom(c.id)}
                className="bg-red-500/10 text-red-400 border border-red-500/30 p-2 rounded-lg hover:bg-red-500/20"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
