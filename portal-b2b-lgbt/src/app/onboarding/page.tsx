import { Building2, Calendar, Check, Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function TipoContaPage() {
  return (
    <div className="min-h-screen bg-[#111217] text-white flex flex-col justify-center items-center p-6">
      <div className="max-w-5xl w-full space-y-8">
        
        {/* Header com Logo */}
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-32">
            <Image
              src="/logo.png"
              alt="Dicas LGBT+ Parceiros"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-gray-400 font-medium text-sm">Parceiros</span>
        </div>

        {/* Título Principal */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Como você quer aparecer no app?
          </h1>
          <p className="text-gray-400 text-base">
            Escolha o tipo de conta — você pode combinar mais de um perfil depois, se precisar.
          </p>
        </div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 - Local / Estabelecimento */}
          <div className="bg-[#1A1B23] border border-[#2A2C38] rounded-2xl p-6 flex flex-col justify-between hover:border-pink-500/50 transition-all">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Local / Estabelecimento</h3>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  Bares, restaurantes, hotéis e outros espaços físicos. Aparece no mapa, nas categorias e pode ganhar destaque.
                </p>
              </div>
              <div className="pt-4 border-t border-[#2A2C38] flex items-center gap-2 text-xs text-gray-300">
                <Check className="w-4 h-4 text-pink-500" />
                <span>Planos de Freemium a Fundador</span>
              </div>
            </div>
            <Link
              href="/cadastro/local"
              className="mt-8 w-full py-3 px-4 rounded-xl font-medium text-sm bg-pink-600 hover:bg-pink-700 text-white text-center transition-colors block"
            >
              Cadastrar meu local
            </Link>
          </div>

          {/* Card 2 - Organizador de Evento */}
          <div className="bg-[#1A1B23] border border-[#2A2C38] rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/50 transition-all">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Organizador de Evento</h3>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  Festas, shows e eventos avulsos — com ou sem local fixo. Divulgação pontual, com opção de venda de ingresso.
                </p>
              </div>
              <div className="pt-4 border-t border-[#2A2C38] flex items-center gap-2 text-xs text-gray-300">
                <Check className="w-4 h-4 text-purple-400" />
                <span>Pacotes avulsos, sem mensalidade</span>
              </div>
            </div>
            <Link
              href="/cadastro/evento"
              className="mt-8 w-full py-3 px-4 rounded-xl font-medium text-sm bg-[#161720] border border-[#2A2C38] hover:bg-[#222430] text-white text-center transition-colors block"
            >
              Cadastrar um evento
            </Link>
          </div>

          {/* Card 3 - Parceiro Institucional */}
          <div className="bg-[#1A1B23] border border-[#2A2C38] rounded-2xl p-6 flex flex-col justify-between hover:border-yellow-500/50 transition-all">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Parceiro Institucional</h3>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  Marcas e negócios que não são um espaço físico do app (ex.: petshop, seguradora). Comissão sobre indicações fechadas.
                </p>
              </div>
              <div className="pt-4 border-t border-[#2A2C38] flex items-center gap-2 text-xs text-gray-300">
                <Check className="w-4 h-4 text-yellow-400" />
                <span>Fechado por atendimento direto</span>
              </div>
            </div>
            <Link
              href="/contato"
              className="mt-8 w-full py-3 px-4 rounded-xl font-medium text-sm bg-[#161720] border border-[#2A2C38] hover:bg-[#222430] text-white text-center transition-colors block"
            >
              Falar com o time
            </Link>
          </div>

        </div>

        {/* Rodapé / Link para Login */}
        <div className="text-center pt-4">
          <p className="text-sm text-gray-400">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-pink-500 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}