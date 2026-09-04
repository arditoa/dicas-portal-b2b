import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const TAGS_VIBE_FECHADAS = [
  'Geral / Todos bem-vindos',
  'Gay',
  'Lésbico',
  'Trans & Não-binário',
  'Bissexual+',
  'Drag',
  'Ursos/Leather',
  'Queer/Alternativo',
  'Ballroom/Vogue',
  'Fetiche'
];

export default function FormUnicoCadastro() {
  // Passo 1: Dados do Parceiro / Espaço
  const [doc, setDoc] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nomeEspaco, setNomeEspaco] = useState('');
  const [categoria, setCategoria] = useState('bar');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);

  // Identificadores salvos após o POST
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);

  // Passo 2: Perfil complementar
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [fotoCapa, setFotoCapa] = useState('');
  const [tagsVibe, setTagsVibe] = useState<string[]>([]);

  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState('');

  // Auto-busca CNPJ (BrasilAPI)
  useEffect(() => {
    const limpo = doc.replace(/\D/g, '');
    if (limpo.length === 14) {
      setLoadingCnpj(true);
      fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`)
        .then(res => res.json())
        .then(data => {
          if (data.nome_fantasia || data.razao_social) {
            setNomeEspaco(data.nome_fantasia || data.razao_social);
          }
          if (data.cep) setCep(data.cep);
          if (data.logradouro) {
            setEndereco(`${data.logradouro}, ${data.bairro || ''} - ${data.municipio || ''}/${data.uf || ''}`);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingCnpj(false));
    }
  }, [doc]);

  // Auto-busca CEP (ViaCEP)
  useEffect(() => {
    const limpo = cep.replace(/\D/g, '');
    if (limpo.length === 8 && !endereco) {
      fetch(`https://viacep.com.br/ws/${limpo}/json/`)
        .then(res => res.json())
        .then(data => {
          if (!data.erro) {
            setEndereco(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
          }
        })
        .catch(() => {});
    }
  }, [cep]);

  // Autosave - Dispara quando a Seção 1 está completa (Rascunho)
  useEffect(() => {
    if (doc && nomeResponsavel && whatsapp && nomeEspaco && endereco && aceitouTermos && !partnerId) {
      salvarRascunhoInicial();
    }
  }, [doc, nomeResponsavel, whatsapp, nomeEspaco, endereco, aceitouTermos]);

  const salvarRascunhoInicial = async () => {
    setMensagemStatus('Salvando rascunho...');
    const { data: partner, error: pErr } = await supabase
      .from('partners')
      .insert({
        nome_responsavel: nomeResponsavel,
        cpf_ou_cnpj: doc,
        whatsapp_comercial: whatsapp,
        status: 'rascunho'
      })
      .select()
      .single();

    if (pErr) {
      setMensagemStatus(`Erro ao criar parceiro: ${pErr.message}`);
      return;
    }

    const { data: venue, error: vErr } = await supabase
      .from('venues')
      .insert({
        partner_id: partner.id,
        nome: nomeEspaco,
        categoria: categoria,
        endereco: endereco
      })
      .select()
      .single();

    if (!vErr && partner && venue) {
      setPartnerId(partner.id);
      setVenueId(venue.id);
      setMensagemStatus('Rascunho salvo com sucesso! Continue preenchendo abaixo.');
    }
  };

  // Disparo automático para MODERAÇÃO (Rascunho -> Pendente)
  useEffect(() => {
    if (venueId && fotoCapa && tagsVibe.length > 0) {
      enviarParaModeracao();
    }
  }, [fotoCapa, tagsVibe]);

  const enviarParaModeracao = async () => {
    if (!venueId || !partnerId) return;

    await supabase
      .from('venues')
      .update({
        bio,
        instagram,
        foto_capa: fotoCapa,
        tags_publico_vibe: tagsVibe
      })
      .eq('id', venueId);

    const { error } = await supabase
      .from('partners')
      .update({ status: 'pendente' })
      .eq('id', partnerId);

    if (!error) {
      setMensagemStatus('🎉 Perfil completo! Enviado automaticamente para a fila de moderação.');
    }
  };

  const toggleTag = (tag: string) => {
    setTagsVibe(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-800 p-8 rounded-2xl border border-slate-700 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Cadastre seu Espaço / Festa</h2>
        <p className="text-sm text-slate-400">Preencha os dados abaixo. O rascunho é salvo automaticamente.</p>
      </div>

      {mensagemStatus && (
        <div className="p-4 bg-purple-900/50 border border-purple-500 rounded-xl text-purple-200 text-sm font-medium">
          {mensagemStatus}
        </div>
      )}

      {/* SEÇÃO 1: IDENTIFICAÇÃO DO PARCEIRO */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-purple-400 border-b border-slate-700 pb-2">1. Identificação</h3>
        
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">CPF ou CNPJ *</label>
          <input
            type="text"
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            placeholder="00.000.000/0001-00"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white"
          />
          {loadingCnpj && <p className="text-xs text-purple-400 mt-1">Consultando CNPJ...</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Responsável *</label>
            <input
              type="text"
              value={nomeResponsavel}
              onChange={(e) => setNomeResponsavel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp Comercial *</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Espaço / Marca *</label>
            <input
              type="text"
              value={nomeEspaco}
              onChange={(e) => setNomeEspaco(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria *</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white"
            >
              <option value="bar">Bar</option>
              <option value="balada">Balada / Festa</option>
              <option value="comer">Restaurante / Comer</option>
              <option value="roteiro">Roteiro Cultural</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">CEP e Endereço Completo *</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="00000-000"
              className="w-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white"
            />
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro - Cidade/UF"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="termos"
            checked={aceitouTermos}
            onChange={(e) => setAceitouTermos(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-purple-600"
          />
          <label htmlFor="termos" className="text-xs text-slate-300">
            Li e aceito os termos de uso e política de privacidade do Dicas LGBT.
          </label>
        </div>
      </div>

      {/* SEÇÃO 2: PERFIL E IDENTIDADE (Desbloqueado após salvar rascunho) */}
      <div className={`space-y-4 pt-4 border-t border-slate-700 ${!partnerId ? 'opacity-40 pointer-events-none' : ''}`}>
        <h3 className="text-lg font-semibold text-purple-400 border-b border-slate-700 pb-2">2. Perfil e Identidade</h3>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Bio / Descrição (até 500 caracteres)</label>
          <textarea
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white h-24"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Link da Foto de Capa (URL) *</label>
          <input
            type="url"
            value={fotoCapa}
            onChange={(e) => setFotoCapa(e.target.value)}
            placeholder="https://exemplo.com/foto.jpg"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Público & Vibe (Selecione ao menos 1) *</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {TAGS_VIBE_FECHADAS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  tagsVibe.includes(tag)
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
