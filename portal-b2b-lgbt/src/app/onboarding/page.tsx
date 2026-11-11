'use client';

// Rodada 130 — ÚNICA tela de cadastro do parceiro (o "cadastro rápido" saiu
// para não confundir). Duas abas: "Local / Comércio" (categoria, subcategoria,
// sugestão de categoria nova, categorias "em breve" liberadas) e "Eventos e
// Festas" (tipo de festa, estilo, público, Lista VIP). /cadastro/local,
// /cadastro/evento e /cadastro/rapido redirecionam para cá. O card de
// "Parceiro Institucional" (sem espaço físico, atendimento direto) fica abaixo.
import { Building2, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import FormularioFesta from '../../components/cadastro/FormularioFesta';
import FormularioLocal, { type DadosFestaAvulsa } from '../../components/cadastro/FormularioLocal';
import FundoAnimado from '../../components/FundoAnimado';

export default function OnboardingPage() {
  const [aba, setAba] = useState<'local' | 'evento'>('local');
  const [sucesso, setSucesso] = useState(false);
  const [whatsappEnviado, setWhatsappEnviado] = useState('');
  const [nomeEnviado, setNomeEnviado] = useState('');
  const [listaVipPedida, setListaVipPedida] = useState(false);
  const [dadosAvulsa, setDadosAvulsa] = useState<DadosFestaAvulsa | undefined>(undefined);

  // /cadastro/evento redireciona para cá com ?aba=evento.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('aba') === 'evento') setAba('evento');
  }, []);

  return (
    <>
    <FundoAnimado />
    <div className="relative z-10 min-h-screen text-white flex flex-col justify-center items-center p-6">
      <div className="max-w-3xl w-full space-y-8">
        {/* Header com Logo */}
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-48">
            <Image
              src="/logos-dicasapp-semfundo (2).png"
              alt="Dicas LGBT+ Parceiros"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <span className="text-gray-400 font-medium text-sm">Parceiros</span>
        </div>

        {/* Título Principal */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {sucesso ? 'Recebemos seu cadastro!' : 'Como você quer aparecer no app?'}
          </h1>
          {!sucesso && (
            <p className="text-gray-400 text-base">
              Preencha o cadastro abaixo. Mesmo as categorias que ainda estão “em breve” já podem se cadastrar.
            </p>
          )}
        </div>

        {sucesso ? (
          <div className="bg-[#1A1B23] border border-[#2A2C38] rounded-2xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
            <p className="text-gray-300 text-sm leading-relaxed">
              Vamos analisar <strong className="text-white">{nomeEnviado}</strong> e te avisamos pelo
              WhatsApp ({whatsappEnviado}) quando estiver aprovado — costuma ser rapidinho. Com a
              aprovação você recebe o acesso ao portal do parceiro.
            </p>
            {listaVipPedida && (
              <p className="text-gray-300 text-sm leading-relaxed">
                Sua <strong className="text-white">Lista VIP</strong> já nasce aberta assim que a festa for aprovada.
              </p>
            )}
            <Link href="/" className="inline-block text-pink-500 hover:underline text-sm font-medium">
              Voltar para o início
            </Link>
          </div>
        ) : (
          <>
            {aba === 'local' ? (
              <div className="space-y-3 -mt-2">
                <p className="text-gray-400 text-sm">
                  Tem <b className="text-white">bar, restaurante, hotel, loja, serviço, casa noturna ou produtora</b>? Preencha abaixo.
                </p>
                <button
                  type="button"
                  onClick={() => { setDadosAvulsa(undefined); setAba('evento'); }}
                  className="w-full text-left rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-3 hover:bg-purple-500/20 transition-colors"
                >
                  <span className="block text-sm font-bold text-purple-100">Só uma festa com data marcada? Toque aqui</span>
                  <span className="block text-xs text-purple-200/80">É um cadastro mais curto, só para a sua festa.</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3">
                <p className="text-sm text-purple-200">
                  <b>Festa avulsa</b>: divulgação de uma festa com data marcada, com opção de venda de ingresso.
                </p>
                <button type="button" onClick={() => setAba('local')} className="shrink-0 text-xs font-bold text-purple-200 underline hover:text-white">
                  ← Voltar ao cadastro de local
                </button>
              </div>
            )}

            <div>
              {aba === 'local' ? (
                <FormularioLocal
                  key="local"
                  onFestaAvulsa={(dados) => { setDadosAvulsa(dados); setAba('evento'); }}
                  onSucesso={(nome, whatsapp) => {
                    setNomeEnviado(nome);
                    setWhatsappEnviado(whatsapp);
                    setListaVipPedida(false);
                    setSucesso(true);
                  }}
                />
              ) : (
                <FormularioFesta
                  key="evento"
                  inicial={dadosAvulsa}
                  onSucesso={(titulo, whatsapp, listaVip) => {
                    setNomeEnviado(titulo);
                    setWhatsappEnviado(whatsapp);
                    setListaVipPedida(listaVip);
                    setSucesso(true);
                  }}
                />
              )}
            </div>

            {/* Parceiro Institucional — opção secundária, não é um
                cadastro rápido (sempre fechado por atendimento direto). */}
            <div className="bg-[#1A1B23] border border-[#2A2C38] rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Parceiro Institucional</h3>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Marcas e negócios sem espaço físico no app (ex.: petshop, seguradora) — comissão sobre indicações fechadas.
                  </p>
                </div>
              </div>
              <Link
                href="/contato"
                className="shrink-0 py-2.5 px-4 rounded-xl font-medium text-xs bg-[#161720] border border-[#2A2C38] hover:bg-[#222430] text-white text-center transition-colors"
              >
                Falar com o time
              </Link>
            </div>
          </>
        )}

        {/* Rodapé / Link para Login */}
        <div className="text-center pt-4">
          <p className="text-sm text-gray-400">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-pink-500 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
