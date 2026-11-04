'use client';

// Rodada 129 — Subcategoria do local no portal ADMIN.
// Mostra as subcategorias da categoria do local (a mesma lista do app e do
// cadastro) e uma opção "Outra — reescrever" para texto livre. Salva direto em
// `locais.subcategoria`, como já faz a troca de categoria.
//
// Como o app trata o resultado: subcategoria que bate com a lista (ou com um
// sinônimo conhecido) cai no ícone redondo certo; texto que o app não
// reconhece fica em "Outros" dentro da categoria — o local continua aparecendo.
// Para um texto novo ganhar ícone próprio, a subcategoria precisa ser criada na
// lista do app (src/lib/subcategorias.ts + espelho do portal).
import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { SUBCATEGORIAS_APP } from '../lib/subcategoriasApp';
import { supabase } from '../lib/supabase';

const campo =
  'bg-[#0B0B0E] border border-[#232230] rounded-lg text-xs font-bold px-2.5 py-2 disabled:opacity-40 focus:outline-none focus:border-[#E1306C]';

export default function SubcategoriaAdmin({
  localId,
  categoria,
  valor,
  aoSalvar,
}: {
  localId: string;
  categoria: string;
  valor: string | null;
  aoSalvar?: (novo: string | null) => void;
}) {
  const itens = SUBCATEGORIAS_APP[categoria]?.itens ?? [];
  const atual = (valor ?? '').trim();
  const naLista = itens.some((i) => i.rotulo === atual);
  const textoLivreSalvo = !!atual && !naLista;

  const [escrevendo, setEscrevendo] = useState(false);
  const [texto, setTexto] = useState(textoLivreSalvo ? atual : '');
  const [salvando, setSalvando] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState('');

  const gravar = async (novo: string | null) => {
    setSalvando(true);
    setErro('');
    setFeito(false);
    const { error } = await supabase.from('locais').update({ subcategoria: novo }).eq('id', localId);
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    aoSalvar?.(novo);
    setFeito(true);
    setTimeout(() => setFeito(false), 2500);
  };

  const mostrarCampoLivre = escrevendo || textoLivreSalvo || itens.length === 0;
  const valorSelect = escrevendo ? '__outra' : naLista ? atual : textoLivreSalvo ? '__outra' : '';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {itens.length > 0 && (
          <select
            aria-label="Subcategoria"
            value={valorSelect}
            disabled={salvando}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__outra') {
                setEscrevendo(true);
                return;
              }
              setEscrevendo(false);
              gravar(v || null);
            }}
            className={campo}
          >
            <option value="">Sem subcategoria</option>
            {itens.map((i) => (
              <option key={i.chave} value={i.rotulo}>{i.rotulo}</option>
            ))}
            <option value="__outra">Outra — reescrever (texto livre)</option>
          </select>
        )}

        {mostrarCampoLivre && (
          <>
            <input
              type="text"
              maxLength={60}
              value={texto}
              disabled={salvando}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && texto.trim()) {
                  e.preventDefault();
                  gravar(texto.trim());
                }
              }}
              placeholder={itens.length > 0 ? 'Escreva a subcategoria' : 'Subcategoria (texto livre)'}
              aria-label="Subcategoria em texto livre"
              className={`${campo} w-60 font-normal`}
            />
            <button
              type="button"
              disabled={salvando || !texto.trim() || texto.trim() === atual}
              onClick={() => gravar(texto.trim())}
              className="rounded-lg border border-[#E1306C]/50 px-3 py-2 text-xs font-bold text-[#E1306C] transition hover:bg-[#E1306C]/10 disabled:opacity-40"
            >
              Salvar texto
            </button>
            {textoLivreSalvo && (
              <button
                type="button"
                disabled={salvando}
                onClick={() => { setTexto(''); setEscrevendo(false); gravar(null); }}
                className="text-xs text-[#8888A0] underline-offset-2 hover:text-white hover:underline"
              >
                Limpar
              </button>
            )}
          </>
        )}

        {salvando && <Loader2 size={14} className="animate-spin text-[#E1306C]" />}
        {feito && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#4CAF7D]">
            <Check size={13} /> Salvo
          </span>
        )}
      </div>

      {textoLivreSalvo && (
        <p className="text-[11px] leading-relaxed text-[#FFB74D]">
          &quot;{atual}&quot; não está na lista do app: o local aparece em &quot;Outros&quot; dentro da categoria (a menos que o app
          reconheça o nome). Escolha uma da lista para ele cair no ícone certo.
        </p>
      )}
      {erro && <p className="text-[11px] text-red-400">{erro}</p>}
    </div>
  );
}
