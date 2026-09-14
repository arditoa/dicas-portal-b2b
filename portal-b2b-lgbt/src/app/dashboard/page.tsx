'use client';
import { Plus, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({ views: 4812, clicks: 693, cupons: 57 });

  return (
    <div className="p-8">
      {/* HEADER DASBOARD */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Olá, Bar Aurora</h1>
          <p className="text-[#A0A0B2] text-xs mt-1">Aqui está o resumo do seu espaço este mês.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-[#E1306C]/10 text-[#E1306C] border border-[#E1306C]/30 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5">
            ⚡ Plano Premium
          </span>
          <Link
            href="/cadastrar-evento"
            className="bg-[#E1306C] hover:bg-[#C2285C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
          >
            <Plus size={14} /> Fazer upgrade
          </Link>
        </div>
      </div>

      {/* 4 CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#161520] border border-[#232230] p-5 rounded-2xl">
          <span className="text-xs text-[#A0A0B2] font-semibold block mb-2">Visualizações do perfil</span>
          <div className="text-3xl font-black text-white mb-2">{metrics.views.toLocaleString()}</div>
          <span className="text-[#4CAF7D] text-[11px] font-bold flex items-center gap-1">
            <TrendingUp size={12} /> ↑ 18% vs. mês anterior
          </span>
        </div>

        <div className="bg-[#161520] border border-[#232230] p-5 rounded-2xl">
          <span className="text-xs text-[#A0A0B2] font-semibold block mb-2">Cliques no Instagram</span>
          <div className="text-3xl font-black text-white mb-2">{metrics.clicks}</div>
          <span className="text-[#4CAF7D] text-[11px] font-bold flex items-center gap-1">
            <TrendingUp size={12} /> ↑ 9% vs. mês anterior
          </span>
        </div>

        <div className="bg-[#161520] border border-[#232230] p-5 rounded-2xl">
          <span className="text-xs text-[#A0A0B2] font-semibold block mb-2">Cupons resgatados</span>
          <div className="text-3xl font-black text-white mb-2">{metrics.cupons}</div>
          <span className="text-[#626274] text-[11px]">de cupons ilimitados</span>
        </div>

        <div className="bg-[#161520] border border-[#232230] p-5 rounded-2xl">
          <span className="text-xs text-[#A0A0B2] font-semibold block mb-2">Posição no "Em Alta"</span>
          <div className="text-3xl font-black text-white mb-2">
            3º <span className="text-xs text-[#A0A0B2] font-normal">de 5 visíveis</span>
          </div>
          <span className="text-[#626274] text-[11px]">pool rotativo de 20 contas</span>
        </div>
      </div>

      {/* BLOCO DUPLO: SEU PLANO ATUAL + PRÓXIMOS EVENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* SEU PLANO ATUAL */}
        <div className="md:col-span-2 bg-[#161520] border border-[#232230] p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-white">Seu plano atual</h2>
              <span className="text-xs font-bold text-[#E1306C]">Premium — R$599/mês</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-xs text-[#D0D0E0]">
              <div className="flex items-center gap-2">
                <span className="text-[#4CAF7D]">✓</span> Seção "Em Alta" rotativa
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#4CAF7D]">✓</span> 3 tags — Top 5
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#4CAF7D]">✓</span> Cupons ilimitados
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#4CAF7D]">✓</span> 1 push mensal
              </div>
            </div>
          </div>

          <div>
            <Link
              href="/planos"
              className="inline-block bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-[#232230] transition"
            >
              Ver todos os planos
            </Link>
          </div>
        </div>

        {/* PRÓXIMOS EVENTOS */}
        <div className="bg-[#161520] border border-[#232230] p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-white">Próximos eventos</h2>
            <Link href="/cadastrar-evento" className="text-xs text-[#E1306C] font-bold hover:underline">
              + Cadastrar evento
            </Link>
          </div>

          <div className="space-y-3">
            <div className="bg-[#0B0B0E] p-3 rounded-xl border border-[#232230] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white">Sunset Sessions</h3>
                <p className="text-[10px] text-[#A0A0B2]">Sáb, 20h — Lista VIP: 12/15 vagas</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#E1306C]"></span>
            </div>

            <div className="bg-[#0B0B0E] p-3 rounded-xl border border-[#232230] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white">Noite Drag — Especial</h3>
                <p className="text-[10px] text-[#A0A0B2]">Dom, 22h — venda de ingresso ativa</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#7E57C2]"></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}