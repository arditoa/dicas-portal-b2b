import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import { SUPORTE_EMAIL } from '../../lib/constants';

export const dynamic = 'force-dynamic';

// Rodada 58 — Guia pede uma página /privacidade com "o texto jurídico
// aprovado". DIFERENTE de /termos (que já existia pronto no portal e só
// precisou de um redirect), uma Política de Privacidade de verdade não
// existia em NENHUM lugar do projeto ainda. Escrevi um texto descrevendo
// só o que o código realmente faz (quais dados os formulários coletam,
// pra que servem, onde ficam — Supabase — e como pedir exclusão,
// reaproveitando o texto já usado em /excluir-conta), publicado
// inicialmente com um aviso visual de rascunho.
//
// Rodada 59 — Andrea: "advogado aprovou o seu rascunho.. pode deixar o
// final." Aviso de rascunho removido, texto abaixo é o oficial.
const DATA_ATUALIZACAO = '22 de setembro de 2026';

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white">
      <Header />

      <section className="w-full max-w-2xl mx-auto px-6 py-14">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#A0A0B2] hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <h1 className="text-2xl sm:text-3xl font-black mb-2">Política de Privacidade</h1>
        <p className="text-xs text-[#626274] mb-8">Última atualização: {DATA_ATUALIZACAO}</p>

        <div className="space-y-6 text-sm text-[#D0D0E0] leading-relaxed">
          <div>
            <h2 className="font-bold text-white mb-2">1. Quem somos</h2>
            <p>
              O Dicas LGBT+ é operado pela Vezpa Bar. Esta política explica quais dados coletamos pelo
              site e pelo aplicativo, para que usamos e como você pode pedir acesso, correção ou
              exclusão.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">2. Dados que coletamos</h2>
            <p>Dependendo de qual formulário você preenche, podemos coletar:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-[#A0A0B2]">
              <li>Nome, e-mail e WhatsApp (lista de lançamento e cadastro de empresa/evento).</li>
              <li>CPF ou CNPJ, nome do negócio, categoria, cidade, bairro e Instagram (cadastro de empresa).</li>
              <li>Fotos enviadas por você para o perfil do seu negócio.</li>
              <li>Dados de navegação usados para entender a origem do cadastro (de qual página ou campanha você veio).</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">3. Para que usamos</h2>
            <p>
              Para analisar e aprovar cadastros de empresas e eventos, avisar sobre o lançamento do
              aplicativo, manter contato sobre o seu cadastro, e exibir o perfil do seu negócio dentro
              do app depois de aprovado. Comunicações promocionais só são enviadas se você marcar essa
              opção — é sempre opcional, separada do restante do cadastro.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">4. Onde os dados ficam</h2>
            <p>
              Os dados são armazenados em banco de dados (Supabase) com acesso restrito à equipe do
              Dicas LGBT+. Não vendemos nem compartilhamos seus dados com terceiros para fins de
              publicidade.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">5. Seus direitos</h2>
            <p>
              Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento. Usuários
              do aplicativo também podem excluir a própria conta diretamente pelo app ou pela nossa{' '}
              <Link href="/excluir-conta" className="underline hover:text-white">
                página de exclusão de conta
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">6. Contato</h2>
            <p>
              Dúvidas sobre seus dados ou esta política:{' '}
              {SUPORTE_EMAIL ? (
                <a href={`mailto:${SUPORTE_EMAIL}`} className="underline hover:text-white">
                  {SUPORTE_EMAIL}
                </a>
              ) : (
                <span className="text-[#FFD54F]">canal de contato ainda não configurado</span>
              )}
              .
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
