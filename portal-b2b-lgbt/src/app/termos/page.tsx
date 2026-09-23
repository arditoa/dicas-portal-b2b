import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Rodada 50 — pedido direto da Andrea: o checkbox "Li e aceito os termos
// de cadastro de parceiro" (em /cadastro/local e no cadastro rápido)
// nunca teve termo nenhum por trás — só a frase, sem link, sem página, em
// lugar nenhum do site (confirmado: nenhuma rota /termos ou arquivo
// mencionando "termos" existia antes desta rodada, fora esse checkbox).
//
// Este texto foi escrito com base no que o cadastro já pede/faz de
// verdade no código (dados coletados, fluxo de aprovação, planos, uso
// de fotos, Selo Dicas). Rodada 60 — Andrea decidiu publicar como termo
// oficial e pediu a remoção do aviso de rascunho. Continua não sendo
// orientação jurídica de um advogado/contador — a decisão de tratar
// este texto como termo oficial foi da Andrea.
export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#A0A0B2] hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="mb-8">
          <div className="relative h-14 w-32 mb-4">
            <Image
              src="/logos-dicasapp-semfundo (2).png"
              alt="Dicas LGBT+ Parceiros"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <span className="text-sm text-[#A0A0B2] font-medium">Termos de cadastro de parceiro</span>
        </div>

        <h1 className="text-2xl font-black mb-2">Termos de cadastro de parceiro</h1>
        <p className="text-xs text-[#626274] mb-6">Última atualização: 23/09/2026.</p>

        <div className="space-y-6 text-sm text-[#D0D0E0] leading-relaxed">
          <section>
            <h2 className="text-white font-bold mb-2">1. O que é este cadastro</h2>
            <p>
              Ao cadastrar seu espaço ou evento no Dicas LGBT+, você está enviando essas
              informações pra análise da nossa equipe. O cadastro não garante aprovação automática
              — cada envio é revisado antes de aparecer publicamente no app, normalmente em poucos
              dias.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">2. Dados que você envia</h2>
            <p>
              Dependendo do formulário, coletamos: CNPJ ou CPF, nome do espaço ou evento,
              categoria, endereço ou bairro/cidade, nome e WhatsApp de contato, público de
              interesse, estilo musical (eventos), e opcionalmente fotos/flier. Usamos o WhatsApp
              informado só pra falar sobre esse cadastro — status da análise, criação do seu acesso
              ao portal do parceiro, e assuntos relacionados a ele.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">3. Seus direitos sobre os dados (LGPD)</h2>
            <p>
              Usamos os dados enviados neste cadastro apenas para os fins descritos aqui — análise
              do cadastro, contato sobre ele e funcionamento do portal do parceiro — e não os
              compartilhamos com terceiros para fins de marketing. De acordo com a Lei Geral de
              Proteção de Dados (LGPD), você pode solicitar acesso, correção ou exclusão dos seus
              dados a qualquer momento, pelo WhatsApp de contato informado no cadastro.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">4. Aprovação, edição e remoção</h2>
            <p>
              O Dicas LGBT+ pode aprovar, recusar, editar (por exemplo corrigir categoria ou
              formato de imagem) ou remover qualquer cadastro, a qualquer momento, especialmente
              quando as informações estiverem incorretas, desatualizadas, ou fora do propósito da
              plataforma (espaços e eventos voltados ao público LGBT+). Você pode pedir a remoção
              do seu próprio cadastro a qualquer momento pelo WhatsApp de contato.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">5. Fotos e conteúdo enviado</h2>
            <p>
              Ao enviar fotos, flier ou outro material, você declara ter o direito de usá-las e
              autoriza o Dicas LGBT+ a exibi-las no app, no site e em materiais de divulgação da
              própria plataforma (redes sociais, por exemplo), sempre relacionados à divulgação do
              seu espaço/evento. Fotos em formatos não suportados pelo app (como HEIC/HEIF) podem
              ser recusadas no envio — nesse caso, pedimos reenvio em JPG, PNG ou WebP.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">6. Planos e cobrança</h2>
            <p>
              O cadastro básico é gratuito. Alguns recursos de visibilidade (destaque, selo
              patrocinado, planos pagos) têm cobrança manual, combinada por Pix ou WhatsApp — não
              há renovação automática nem cobrança em cartão pelo app. Valores e o que cada plano
              inclui estão descritos na página de planos do portal do parceiro.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">7. Selo Dicas LGBT+</h2>
            <p>
              O Selo Dicas LGBT+ é uma curadoria editorial da nossa equipe — nunca é vendido nem
              pode ser comprado, independente do plano contratado.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">8. Alterações nestes termos</h2>
            <p>
              Podemos atualizar este texto conforme o app evolui. A versão vigente é sempre a
              publicada nesta página.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">9. Dúvidas</h2>
            <p>Qualquer dúvida sobre estes termos, fale com a gente pelo WhatsApp de contato do cadastro.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
