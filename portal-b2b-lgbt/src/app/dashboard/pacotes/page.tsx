'use client';
import { ArrowLeft, ImagePlus, Loader2, Plane, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

// Pacotes e roteiros — Rodada 61 (fazer direito). Só existe pra locais de
// categoria 'turismo' (a página redireciona quem não for dessa categoria
// de volta pro /dashboard). Mesma lógica de dono/RLS de `cupons`
// (migration 034: pacotes_turismo_write_dono_ou_admin) — o dono do local
// cria/edita/apaga os próprios pacotes sem aprovação da Andrea.

type PacoteItem = {
  id: string;
  nome: string;
  descricao: string | null;
  preco_de: number | null;
  preco_ate: number | null;
  foto_url: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
};

async function enviarFotoPacote(localId: string, arquivo: File): Promise<string> {
  const extensao = arquivo.name.split('.').pop() || 'jpg';
  const caminho = `${localId}/pacotes/${Date.now()}.${extensao}`;
  const { error } = await supabase.storage.from('fotos-locais').upload(caminho, arquivo, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('fotos-locais').getPublicUrl(caminho);
  return data.publicUrl;
}

function formatPreco(v: number | null) {
  if (v == null) return null;
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

export default function PacotesPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [localId, setLocalId] = useState<string | null>(null);
  const [itens, setItens] = useState<PacoteItem[]>([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [precoDe, setPrecoDe] = useState('');
  const [precoAte, setPrecoAte] = useState('');
  const [foto, setFoto] = useState<File | null>(null);

  const carregarItens = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('pacotes_turismo')
      .select('id, nome, descricao, preco_de, preco_ate, foto_url, ordem, ativo, created_at')
      .eq('local_id', id)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false });
    setItens(data || []);
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
        .select('id, categoria')
        .eq('owner_id', userData.user.id)
        .maybeSingle();

      if (!local || local.categoria !== 'turismo') {
        router.push('/dashboard');
        return;
      }
      setLocalId(local.id);
      await carregarItens(local.id);
      setCarregando(false);
    })();
  }, [router, carregarItens]);

  const criarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localId) return;
    setSalvando(true);
    setErro('');

    try {
      let fotoUrl: string | null = null;
      if (foto) {
        fotoUrl = await enviarFotoPacote(localId, foto);
      }

      const { error } = await supabase.from('pacotes_turismo').insert({
        local_id: localId,
        nome,
        descricao: descricao || null,
        preco_de: precoDe ? Number(precoDe) : null,
        preco_ate: precoAte ? Number(precoAte) : null,
        foto_url: fotoUrl,
      });

      if (error) throw error;

      setNome('');
      setDescricao('');
      setPrecoDe('');
      setPrecoAte('');
      setFoto(null);
      setMostrarForm(false);
      await carregarItens(localId);
    } catch (err: any) {
      setErro(err.message || 'Não foi possível salvar esse pacote.');
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (item: PacoteItem) => {
    if (!localId) return;
    await supabase.from('pacotes_turismo').update({ ativo: !item.ativo }).eq('id', item.id);
    await carregarItens(localId);
  };

  const apagarItem = async (id: string) => {
    if (!localId) return;
    await supabase.from('pacotes_turismo').delete().eq('id', id);
    await carregarItens(localId);
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
          <h1 className="text-2xl font-black">Pacotes e roteiros</h1>
          <p className="text-[#A0A0B2] text-xs mt-1">Os pacotes/roteiros que aparecem no seu perfil no app.</p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <Plus size={14} /> Novo pacote
        </button>
      </div>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}

      {mostrarForm && (
        <form onSubmit={criarItem} className="bg-[#161520] border border-[#232230] rounded-2xl p-6 mb-8 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Nome do pacote</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Roteiro Orla Gay 3 dias"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Preço a partir de (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precoDe}
                onChange={(e) => setPrecoDe(e.target.value)}
                placeholder="299.00"
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Preço até (opcional, R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precoAte}
                onChange={(e) => setPrecoAte(e.target.value)}
                placeholder="599.00"
                className="w-full bg-[#0B0B0E] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Foto (opcional)</label>
            <label className="flex items-center gap-3 border border-dashed border-[#232230] rounded-xl p-4 cursor-pointer hover:border-[#E1306C]/50 transition">
              {foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(foto)} alt="Pré-visualização" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[#0B0B0E] border border-[#232230] flex items-center justify-center">
                  <ImagePlus className="w-5 h-5 text-[#A0A0B2]" />
                </div>
              )}
              <span className="text-xs text-[#A0A0B2]">{foto ? foto.name : 'Escolher foto do pacote'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFoto(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-[#232230] hover:bg-[#2D2B3D] text-white font-bold py-3 rounded-xl transition text-sm"
          >
            {salvando ? 'Salvando...' : 'Adicionar pacote'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {itens.length === 0 && <p className="text-xs text-[#626274]">Nenhum pacote cadastrado ainda.</p>}
        {itens.map((item) => (
          <div key={item.id} className="bg-[#161520] border border-[#232230] rounded-xl p-4 flex justify-between items-start gap-4">
            <div className="flex gap-3">
              {item.foto_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.foto_url}
                  alt={item.nome}
                  className="rounded-lg object-cover w-14 h-14"
                />
              )}
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Plane size={14} className="text-[#E1306C]" /> {item.nome}
                  {!item.ativo && <span className="text-[10px] text-[#626274] font-normal">(inativo)</span>}
                </h3>
                {item.descricao && <p className="text-xs text-[#A0A0B2] mt-1">{item.descricao}</p>}
                {(item.preco_de != null || item.preco_ate != null) && (
                  <p className="text-[11px] text-[#626274] mt-1">
                    {item.preco_de != null ? `A partir de ${formatPreco(item.preco_de)}` : ''}
                    {item.preco_ate != null ? ` até ${formatPreco(item.preco_ate)}` : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => alternarAtivo(item)}
                className="bg-[#232230] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#2D2B3D]"
              >
                {item.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => apagarItem(item.id)}
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
