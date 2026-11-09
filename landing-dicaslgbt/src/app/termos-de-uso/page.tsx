import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import { INSTAGRAM_URL, SUPORTE_EMAIL, SUPORTE_WHATSAPP, linkWhatsapp } from '../../lib/constants';

export const dynamic = 'force-dynamic';

// Termos de Uso do aplicativo (usuário final) — nov/2026. Exigência da App Store (diretriz 1.2, conteúdo
// de usuários): termos que proíbem conteúdo ofensivo, canal de denúncia e promessa de moderação.
// Diferente de /termos, que são os termos de cadastro de PARCEIRO (empresas), publicados no portal.
const DATA_ATUALIZACAO = '9 de novembro de 2026';

export default function TermosDeUsoPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white">
      <Header />

      <section className="w-full max-w-2xl mx-auto px-6 py-14">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#A0A0B2] hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <h1 className="text-2xl sm:text-3xl font-black mb-2">Termos de Uso do aplicativo</h1>
        <p className="text-xs text-[#626274] mb-8">Última atualização: {DATA_ATUALIZACAO}</p>

        <div className="space-y-6 text-sm text-[#D0D0E0] leading-relaxed">
          <div>
            <h2 className="font-bold text-white mb-2">1. Aceite</h2>
            <p>
              Ao criar uma conta ou usar o aplicativo Dicas LGBT+, você concorda com estes termos e com a nossa{' '}
              <Link href="/privacidade" className="underline hover:text-white">Política de Privacidade</Link>. Se não
              concordar, não use o aplicativo. O Dicas LGBT+ é operado pela Vezpa Bar.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">2. O que é o Dicas LGBT+</h2>
            <p>
              Um guia de lugares, eventos, serviços e roteiros amigáveis à comunidade LGBT+. As informações sobre
              estabelecimentos, preços, horários e ofertas são fornecidas pelos próprios parceiros e podem mudar sem
              aviso. Confirme com o local antes de ir. Não somos responsáveis pelo atendimento, produtos ou serviços
              prestados por terceiros.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">3. Sua conta</h2>
            <ul className="list-disc list-inside space-y-1 text-[#A0A0B2]">
              <li>Você deve ter 18 anos ou mais para usar áreas de conteúdo adulto, e fornecer dados verdadeiros.</li>
              <li>Cuide da sua senha. Você é responsável pelo que acontece na sua conta.</li>
              <li>Você pode excluir a sua conta a qualquer momento em Conta, Preferências e privacidade, Excluir minha conta.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">4. Conteúdo enviado por você</h2>
            <p>
              Avaliações, fotos, relatos, ocorrências e outros conteúdos que você enviar continuam sendo seus, mas você
              nos autoriza a exibi-los no aplicativo enquanto a sua conta existir. Você é responsável por ter o direito
              de publicar o que envia.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">5. Regras de convivência (tolerância zero)</h2>
            <p>Não é permitido enviar ou praticar, dentro ou por meio do aplicativo:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-[#A0A0B2]">
              <li>discurso de ódio, discriminação, ameaça, assédio ou perseguição;</li>
              <li>expor a orientação sexual, identidade de gênero, saúde ou dados pessoais de outra pessoa sem consentimento;</li>
              <li>conteúdo sexual explícito, nudez ou qualquer conteúdo envolvendo menores de idade;</li>
              <li>golpes, spam, avaliações falsas ou se passar por outra pessoa ou empresa;</li>
              <li>conteúdo ilegal, violento ou que viole direitos de terceiros.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">6. Denúncia, bloqueio e moderação</h2>
            <p>
              Em qualquer conteúdo você encontra as opções Denunciar e Bloquear. Bloquear impede que aquela pessoa
              apareça para você. Analisamos as denúncias e, quando houver violação, removemos o conteúdo e podemos
              suspender ou encerrar a conta, sem aviso prévio nos casos graves. Se algo for urgente, fale conosco pelos
              canais abaixo.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">7. Localização</h2>
            <p>
              Usamos a localização só enquanto você usa o app, para mostrar lugares próximos e confirmar check-ins. Ela
              não é mostrada para outras pessoas. Você pode desligá-la nas configurações do aparelho.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">8. Limitação de responsabilidade</h2>
            <p>
              O aplicativo é oferecido como está. Em casos de segurança pessoal, use sempre o seu bom senso e os
              serviços oficiais de emergência. Na extensão permitida em lei, não respondemos por danos decorrentes de
              encontros, eventos ou estabelecimentos listados.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">9. Alterações e lei aplicável</h2>
            <p>
              Podemos atualizar estes termos; a data de atualização fica no topo desta página e o uso continuado indica
              aceite. Estes termos seguem as leis do Brasil.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-white mb-2">10. Contato</h2>
            <ul className="list-disc list-inside space-y-1 text-[#A0A0B2]">
              {SUPORTE_EMAIL && (
                <li>
                  E-mail:{' '}
                  <a href={`mailto:${SUPORTE_EMAIL}`} className="underline hover:text-white">{SUPORTE_EMAIL}</a>
                </li>
              )}
              <li>
                WhatsApp:{' '}
                <a
                  href={linkWhatsapp(SUPORTE_WHATSAPP, 'Olá! Tenho uma dúvida sobre os Termos de Uso do Dicas LGBT+.')}
                  className="underline hover:text-white"
                >
                  +55 11 94294-2028
                </a>
              </li>
              <li>
                Instagram:{' '}
                <a href={INSTAGRAM_URL} className="underline hover:text-white">@dicaslgbt</a>
              </li>
            </ul>
            <p className="mt-3 text-xs text-[#626274]">
              Você é empresa parceira? Os termos de cadastro de parceiro ficam em{' '}
              <Link href="/termos" className="underline hover:text-white">/termos</Link>.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
