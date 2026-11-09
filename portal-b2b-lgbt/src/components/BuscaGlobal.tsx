'use client';
// Busca global do /admin (nov/2026): um campo fixo no topo de TODAS as telas que acha qualquer item pelo nome —
// local, evento, destino (Trip) ou roteiro — e abre direto a tela de edição dele (com os ticks de Fundador, plano,
// vitrines e "Posição no app"). Atalho: tecla "/" ou Ctrl/Cmd+K.
// Destinos e roteiros só são carregados na primeira vez que a pessoa clica no campo (não pesa a abertura do admin).
import { CalendarDays, Compass, Route as RouteIcon, Search, Store, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export type ItemBuscaLocal = { id: string; nome: string; categoria: string; bairro: string | null; cidade: string; fundador?: boolean };
export type ItemBuscaEvento = { id: string; titulo: string };

type Props = {
  locais: ItemBuscaLocal[];
  eventos: ItemBuscaEvento[];
  rotuloCategoria: (categoria: string) => string;
  onAbrirLocal: (l: ItemBuscaLocal) => void;
  onAbrirEvento: (e: ItemBuscaEvento) => void;
  onAbrirDestino: (slug: string) => void;
  onAbrirRoteiro: (id: string) => void;
};

type Destino = { slug: string; cidade: string; uf: string };
type Roteiro = { id: string; titulo: string; cidade: string | null };

const norm = (t: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const MAX_POR_GRUPO = 6;

export default function BuscaGlobal({ locais, eventos, rotuloCategoria, onAbrirLocal, onAbrirEvento, onAbrirDestino, onAbrirRoteiro }: Props) {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [destinos, setDestinos] = useState<Destino[] | null>(null);
  const [roteiros, setRoteiros] = useState<Roteiro[] | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // Atalhos: "/" ou Ctrl/Cmd+K focam a busca (a menos que a pessoa esteja digitando em outro campo).
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const digitando = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !digitando)) {
        e.preventDefault();
        campo.current?.focus();
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  // Clicar fora fecha a lista.
  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, []);

  const carregarExtras = async () => {
    if (destinos !== null && roteiros !== null) return;
    const [d, r] = await Promise.all([
      supabase.from('destinos').select('slug, cidade, uf').order('cidade'),
      supabase.from('roteiros').select('id, titulo, cidade').order('titulo'),
    ]);
    setDestinos(d.error ? [] : ((d.data as Destino[]) || []));
    setRoteiros(r.error ? [] : ((r.data as Roteiro[]) || []));
  };

  const t = norm(termo);
  const achados = useMemo(() => {
    if (t.length < 2) return null;
    const bate = (...campos: (string | null | undefined)[]) => campos.some((c) => norm(c || '').includes(t));
    return {
      locais: locais.filter((l) => bate(l.nome, l.bairro, l.cidade)).slice(0, MAX_POR_GRUPO),
      eventos: eventos.filter((e) => bate(e.titulo)).slice(0, MAX_POR_GRUPO),
      destinos: (destinos || []).filter((d) => bate(d.cidade, d.uf)).slice(0, MAX_POR_GRUPO),
      roteiros: (roteiros || []).filter((r) => bate(r.titulo, r.cidade)).slice(0, MAX_POR_GRUPO),
    };
  }, [t, locais, eventos, destinos, roteiros]);

  const total = achados ? achados.locais.length + achados.eventos.length + achados.destinos.length + achados.roteiros.length : 0;
  const escolher = (fn: () => void) => {
    fn();
    setAberto(false);
    setTermo('');
    campo.current?.blur();
  };

  const linha = 'w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-[#1D1C29] focus:bg-[#1D1C29] focus:outline-none';
  const titulo = 'px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#626274]';

  return (
    <div ref={caixa} className="relative mb-5 max-w-xl">
      <div className="flex items-center gap-2 bg-[#161520] border border-[#232230] focus-within:border-[#E1306C] rounded-xl px-3 py-2.5">
        <Search size={15} className="text-[#626274] shrink-0" />
        <input
          ref={campo}
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
          }}
          onFocus={() => {
            setAberto(true);
            carregarExtras();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setAberto(false);
              campo.current?.blur();
            }
          }}
          placeholder="Buscar qualquer coisa: local, festa, destino ou roteiro…"
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-[#626274]"
          aria-label="Buscar no painel"
        />
        {termo ? (
          <button onClick={() => setTermo('')} className="text-[#626274] hover:text-white" aria-label="Limpar busca">
            <X size={14} />
          </button>
        ) : (
          <kbd className="hidden md:block text-[10px] text-[#626274] border border-[#232230] rounded px-1.5 py-0.5">/</kbd>
        )}
      </div>

      {aberto && (
        <div className="absolute z-30 left-0 right-0 mt-2 bg-[#12111A] border border-[#232230] rounded-xl shadow-2xl shadow-black/50 max-h-[70vh] overflow-y-auto pb-1.5">
          {!achados && <p className="px-3 py-3 text-xs text-[#8888A0]">Digite pelo menos 2 letras. Ao escolher, abrimos o item já pronto para editar (ticks de Fundador, plano, vitrines e posição no app).</p>}
          {achados && total === 0 && <p className="px-3 py-3 text-xs text-[#8888A0]">Nada encontrado para “{termo}”.</p>}

          {achados && achados.locais.length > 0 && (
            <div>
              <p className={titulo}>Locais</p>
              {achados.locais.map((l) => (
                <button key={l.id} className={linha} onClick={() => escolher(() => onAbrirLocal(l))}>
                  <Store size={14} className="text-[#E1306C] shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{l.nome}</span>
                    <span className="block text-[11px] text-[#8888A0] truncate">
                      {rotuloCategoria(l.categoria)} · {[l.bairro, l.cidade].filter(Boolean).join(', ') || '—'}
                    </span>
                  </span>
                  {l.fundador && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7E57C2]/25 text-[#C9B6FF]">Fundador</span>}
                </button>
              ))}
            </div>
          )}

          {achados && achados.eventos.length > 0 && (
            <div>
              <p className={titulo}>Festas e eventos</p>
              {achados.eventos.map((e) => (
                <button key={e.id} className={linha} onClick={() => escolher(() => onAbrirEvento(e))}>
                  <CalendarDays size={14} className="text-[#E1306C] shrink-0" />
                  <span className="text-sm font-semibold truncate">{e.titulo}</span>
                </button>
              ))}
            </div>
          )}

          {achados && achados.destinos.length > 0 && (
            <div>
              <p className={titulo}>Destinos (Trip)</p>
              {achados.destinos.map((d) => (
                <button key={d.slug} className={linha} onClick={() => escolher(() => onAbrirDestino(d.slug))}>
                  <Compass size={14} className="text-[#E1306C] shrink-0" />
                  <span className="text-sm font-semibold truncate">
                    {d.cidade} <span className="text-[#8888A0] font-normal">· {d.uf}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {achados && achados.roteiros.length > 0 && (
            <div>
              <p className={titulo}>Roteiros</p>
              {achados.roteiros.map((r) => (
                <button key={r.id} className={linha} onClick={() => escolher(() => onAbrirRoteiro(r.id))}>
                  <RouteIcon size={14} className="text-[#E1306C] shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{r.titulo}</span>
                    {r.cidade && <span className="block text-[11px] text-[#8888A0] truncate">{r.cidade}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
