'use client';
// Rodada 63 — validação dos "locais próximos" que as hospedagens indicam
// no portal (pontos_proximos, migration 036). A equipe confere no mapa se o
// ponto está no lugar certo (dá pra corrigir lat/lng) e aprova ou recusa.
// Só pontos aprovados aparecem no app. Se a tabela ainda não existir, o
// painel simplesmente não aparece.
import { Check, ExternalLink, MapPin, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TIPOS_PROXIMOS } from '../lib/taxonomia';

type Ponto = {
  id: string;
  tipo: string;
  nome: string;
  endereco: string | null;
  lat: number | null;
  lng: number | null;
  locais: { nome: string; cidade: string | null; lat: number | null; lng: number | null } | null;
};

function distancia(a: { lat: number | null; lng: number | null } | null, p: Ponto): string | null {
  if (!a?.lat || !a?.lng || p.lat == null || p.lng == null) return null;
  const rad = (g: number) => (g * Math.PI) / 180;
  const h =
    Math.sin(rad(p.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(p.lat)) * Math.sin(rad(p.lng - a.lng) / 2) ** 2;
  const m = 2 * 6371000 * Math.asin(Math.sqrt(h));
  return m < 1000 ? `${Math.round(m / 50) * 50} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

export default function PainelPontosProximos() {
  const [pontos, setPontos] = useState<Ponto[] | null>(null);
  const [coords, setCoords] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('pontos_proximos')
      .select('id, tipo, nome, endereco, lat, lng, locais(nome, cidade, lat, lng)')
      .eq('status', 'pendente')
      .order('created_at');
    if (error) {
      setPontos(null);
      return;
    }
    setPontos((data as unknown as Ponto[]) || []);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const decidir = async (p: Ponto, status: 'aprovado' | 'recusado') => {
    const update: Record<string, unknown> = { status };
    const texto = coords[p.id]?.trim();
    if (texto) {
      const [lat, lng] = texto.split(',').map((v) => Number(v.trim()));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        update.lat = lat;
        update.lng = lng;
      }
    }
    if (status === 'aprovado' && update.lat == null && p.lat == null) {
      alert('Informe a coordenada (lat, lng) antes de aprovar — copie do Google Maps clicando com o botão direito no ponto.');
      return;
    }
    await supabase.from('pontos_proximos').update(update).eq('id', p.id);
    carregar();
  };

  if (!pontos || pontos.length === 0) return null;

  return (
    <div className="bg-[#161520] border border-[#232230] rounded-2xl p-5 mb-8">
      <h2 className="text-sm font-bold flex items-center gap-2 mb-1">
        <MapPin size={14} className="text-[#E1306C]" /> Locais próximos para validar ({pontos.length})
      </h2>
      <p className="text-xs text-[#A0A0B2] mb-4">
        Confira no mapa se o ponto está no lugar certo. Se estiver errado ou vazio, cole a coordenada certa (lat, lng) antes de aprovar.
      </p>
      <div className="space-y-3">
        {pontos.map((p) => {
          const mapa = p.lat != null
            ? `https://www.google.com/maps?q=${p.lat},${p.lng}`
            : `https://www.google.com/maps/search/${encodeURIComponent([p.endereco || p.nome, p.locais?.cidade].filter(Boolean).join(', '))}`;
          const dist = distancia(p.locais, p);
          return (
            <div key={p.id} className="border border-[#232230] rounded-xl p-4">
              <div className="flex justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-bold">
                    {TIPOS_PROXIMOS.find((t) => t.id === p.tipo)?.label || p.tipo} · {p.nome}
                  </p>
                  <p className="text-xs text-[#A0A0B2] mt-1">
                    Indicado por <b className="text-white">{p.locais?.nome}</b>
                    {p.endereco ? ` · ${p.endereco}` : ''}
                    {dist ? ` · a ${dist} da hospedagem` : ' · sem coordenada'}
                  </p>
                </div>
                <a href={mapa} target="_blank" rel="noreferrer" className="text-xs text-[#B39DDB] font-bold flex items-center gap-1">
                  Ver no mapa <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <input
                  value={coords[p.id] ?? ''}
                  onChange={(e) => setCoords((c) => ({ ...c, [p.id]: e.target.value }))}
                  placeholder={p.lat != null ? `${p.lat.toFixed(5)}, ${p.lng?.toFixed(5)} (corrigir, opcional)` : 'lat, lng (ex: -23.5614, -46.6559)'}
                  className="flex-1 min-w-[220px] bg-[#0B0B0E] border border-[#232230] rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-[#E1306C]"
                />
                <button onClick={() => decidir(p, 'aprovado')} className="bg-[#4CAF7D] text-black text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1">
                  <Check size={12} /> Aprovar
                </button>
                <button onClick={() => decidir(p, 'recusado')} className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1">
                  <X size={12} /> Recusar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
