'use client';
import { ArrowLeft, Check, KeyRound, Loader2, MapPin, Save, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { buscarCoordenadas } from '../../../lib/geocodificar';
import { telefoneParecCurto } from '../../../lib/parceiroAuth';
import {
  HorarioFuncionamento,
  limparHorarioFuncionamento,
  normalizarHorarioFuncionamento,
} from '../../../lib/horarios';
import CampoHorarioFuncionamento from '../../../components/CampoHorarioFuncionamento';

// Upload de foto real (Rodada 17) — bucket "fotos-locais" (ver
// 007_storage_fotos_locais.sql). Convenção de caminho: "<local_id>/<nome>",
// porque é nesse primeiro segmento que a RLS do bucket se apoia pra saber
// se quem está enviando é o dono daquele local. Bucket é público pra
// LEITURA (o app final não teria como logar pra ver a foto), então
// getPublicUrl já devolve um link direto, sem precisar de signed URL.
const TAMANHO_MAXIMO_MB = 5;

// "Minha Página" — o parceiro edita aqui tudo que a RLS de `locais` já
// deixa o DONO alterar sozinho (ver locais_update_dono_ou_admin em
// 001_migrar_para_locais.sql): nome, categoria, subcategoria, descrição,
// contato, foto de capa, e as próprias tags de público. Campos como
// status/safe_space/plano_destaque continuam só-admin de propósito (o
// trigger protect_admin_fields_locais reverte se o dono tentar mudar) —
// por isso NÃO aparecem aqui como editáveis; aparecem só como informação.

// Espelha a mesma taxonomia reduzida de /cadastro/local e /cadastro/rapido
// (ver src/lib/categorias.ts no app) — categorias sem valor real no enum
// aparecem desabilitadas como "Em breve".
const CATEGORIAS = [
  { value: 'lugares', label: 'Bares', disabled: false },
  { value: 'gastronomia', label: 'Gastronomia', disabled: false },
  { value: 'cultura', label: 'Cultura', disabled: false },
  { value: 'turismo', label: 'Dicas Trip', disabled: false },
  { value: 'beleza', label: 'Beleza', disabled: true },
  { value: 'mais18', label: 'Espaços 18+', disabled: true },
  { value: 'lojas', label: 'Lojas', disabled: true },
  { value: 'servicos', label: 'Serviços', disabled: true },
  { value: 'lazer', label: 'Lazer', disabled: true },
] as const;

// Taxonomia revisada (Rodada 25) — mesma lista usada nos cadastros
// públicos. "todos" não aparece aqui de propósito: nenhuma tag marcada já
// significa "todo mundo" (ver alternarTag abaixo).
const PUBLICO_OPCOES = [
  { slug: 'lesbica', label: 'Mulheres lésbicas' },
  { slug: 'gay', label: 'Homens gays' },
  { slug: 'bi', label: 'Bissexuais' },
  { slug: 'trans', label: 'Trans e travestis' },
  { slug: 'nao_binario', label: 'Não binário' },
  { slug: 'queer', label: 'Queer' },
  { slug: 'ursos', label: 'Ursos' },
  { slug: 'daddy', label: 'Daddy' },
  { slug: 'leather', label: 'Leather' },
  { slug: 'drag', label: 'Drag' },
  { slug: 'misto_lgbt', label: 'Misto LGBT+' },
  { slug: 'aliados', label: 'Aliados' },
] as const;

// Rodada 24 — mesma lista de chips "Escolha pela experiência" da Home do
// app (src/app/(tabs)/index.tsx), tirando "Predominância lésbica/Gay"
// (esses dois já são cobertos pelas tags de público acima, não é a mesma
// coisa) e somando "Pet Friendly"/"Parklet" que a Andrea pediu. Isso é
// SÓ a lista de sugestão pronta — o campo permite tags livres também
// (ver "extra" no estado do formulário).
const TAGS_EXPERIENCIA = [
  'Aniversário',
  'Date',
  'Rolê com amigos',
  'Dançar',
  'Música ao vivo',
  'Karaokê',
  'Drag show',
  'Comer bem',
  'Happy hour',
  'Cultura',
  'Relaxar',
  'Conhecer pessoas',
  'Aula de dança',
  'Aula de forró',
  'Pet Friendly',
  'Parklet',
] as const;

// Rodada 38 — pedido direto da Andrea pra inverter a lógica antiga: TODO
// plano (mesmo freemium) pode preencher tags de experiência, galeria e
// vídeo — o preenchimento nunca foi travado no banco (ver
// 014_tags_experiencia_locais.sql / 020_horario_funcionamento_galeria_e_
// fix_foto_evento.sql), só a UX do portal escondia o campo. O que
// continua exclusivo de Premium/Fundador com plano_comercial_status =
// 'ativo' é aparecer PRO USUÁRIO FINAL no app — ver `publicaRecursosNoApp`,
// usada em business/[id].tsx (app) pra decidir o que mostrar. Isso deixa
// o cadastro completo desde o início (menos fricção, mais dados pra
// Andrea oferecer o upgrade com o perfil já pronto) sem dar de graça o
// que é vendido nos planos pagos.
function limiteTagsExperiencia(): number {
  return 3;
}

// Mesmo espírito da função acima — preencher é livre pra qualquer plano;
// o que aparece no app pro usuário final é decidido por
// `publicaRecursosNoApp`. Vídeo é só LINK (Instagram/Reels/YouTube),
// nunca upload de arquivo — decisão da Andrea pra não gerar custo de
// armazenamento de vídeo.
const LIMITE_GALERIA_FOTOS = 6;

// Única checagem de plano que sobrou nesta tela — não trava preenchimento,
// só decide a frase de aviso que aparece embaixo de cada campo premium
// (a checagem que realmente importa pro usuário final é a mesma regra
// espelhada em business/[id].tsx no app).
function publicaRecursosNoApp(planoComercial: string, planoComercialStatus: string): boolean {
  if (planoComercialStatus !== 'ativo') return false;
  return planoComercial === 'premium' || planoComercial === 'fundador';
}

type Local = {
  id: string;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  descricao: string | null;
  bairro: string | null;
  // Rodada 57 — "bairro para exibir": campo só de apresentação, pedido
  // da Andrea ("Augusta fica melhor que Consolação"). NUNCA usado pra
  // geocodificação/endereço real (buscarCoordenadas continua usando só
  // `bairro`) — só troca o texto mostrado nos cards/telas do app quando
  // preenchido (ver fallback no app: bairro_exibicao || bairro || cidade).
  bairro_exibicao: string | null;
  cidade: string;
  endereco: string | null;
  instagram: string | null;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  foto_capa_url: string | null;
  // Rodada 57 — logo do local (separado da foto de capa), pro banner
  // "Membro Fundador" da Home usar em vez da foto de capa (que costuma
  // ser uma foto do ambiente, não um logo). Opcional — app cai pra
  // foto_capa_url quando não tiver logo_url.
  logo_url: string | null;
  lat: number | null;
  lng: number | null;
  publico_tags: string[];
  tags: string[];
  plano_comercial: string;
  plano_comercial_status: string;
  status: string;
  plano_destaque: string;
  horario_funcionamento: HorarioFuncionamento;
  galeria_fotos: string[];
  video_url: string | null;
};

export default function MinhaPaginaPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [local, setLocal] = useState<Local | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState('');
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);

  // Rodada 22: muita conta de parceiro agora nasce com senha temporária
  // gerada na aprovação (ver /api/aprovar-local) — este bloco é o único
  // lugar onde ele pode trocar essa senha por uma escolhida por ele.
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [senhaTrocada, setSenhaTrocada] = useState(false);
  const [erroSenha, setErroSenha] = useState('');
  const [novaTagLivre, setNovaTagLivre] = useState('');
  const [buscandoCoordenadas, setBuscandoCoordenadas] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const inputLogoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push('/login');
        return;
      }
      const { data, error } = await supabase
        .from('locais')
        .select(
          'id, nome, categoria, subcategoria, descricao, bairro, bairro_exibicao, cidade, endereco, lat, lng, instagram, contato_nome, contato_email, contato_telefone, foto_capa_url, logo_url, publico_tags, tags, plano_comercial, plano_comercial_status, status, plano_destaque, horario_funcionamento, galeria_fotos, video_url'
        )
        .eq('owner_id', userData.user.id)
        .maybeSingle();

      if (error || !data) {
        router.push('/dashboard');
        return;
      }
      setLocal({
        ...(data as Local),
        horario_funcionamento: normalizarHorarioFuncionamento(
          (data as Local).horario_funcionamento
        ),
        galeria_fotos: (data as Local).galeria_fotos || [],
      });
      setCarregando(false);
    })();
  }, [router]);

  const alternarTag = (slug: string) => {
    if (!local) return;
    const atuais = local.publico_tags.filter((t) => t !== 'todos');
    const ligado = atuais.includes(slug);
    const novas = ligado ? atuais.filter((t) => t !== slug) : [...atuais, slug];
    setLocal({ ...local, publico_tags: novas.length > 0 ? novas : ['todos'] });
  };

  const alternarTagExperiencia = (tag: string, limite: number) => {
    if (!local) return;
    const ligado = local.tags.includes(tag);
    if (!ligado && local.tags.length >= limite) return; // limite do plano — botão já vem desabilitado, isso é só reforço
    const novas = ligado ? local.tags.filter((t) => t !== tag) : [...local.tags, tag];
    setLocal({ ...local, tags: novas });
  };

  const adicionarTagLivre = (limite: number) => {
    if (!local) return;
    const texto = novaTagLivre.trim();
    if (!texto || local.tags.length >= limite) return;
    if (local.tags.some((t) => t.toLowerCase() === texto.toLowerCase())) {
      setNovaTagLivre('');
      return;
    }
    setLocal({ ...local, tags: [...local.tags, texto] });
    setNovaTagLivre('');
  };

  const removerTag = (tag: string) => {
    if (!local) return;
    setLocal({ ...local, tags: local.tags.filter((t) => t !== tag) });
  };

  const buscarCoordenadasDoEndereco = async () => {
    if (!local) return;
    const consulta = [local.endereco, local.bairro, local.cidade, 'Brasil'].filter(Boolean).join(', ');
    if (!consulta.trim()) {
      setErro('Preencha ao menos a cidade antes de buscar a localização.');
      return;
    }
    setBuscandoCoordenadas(true);
    setErro('');
    const coordenadas = await buscarCoordenadas(consulta);
    setBuscandoCoordenadas(false);
    if (!coordenadas) {
      setErro('Não encontramos esse endereço automaticamente — pode digitar a latitude/longitude à mão (ex: procurando o local no Google Maps e copiando os números que aparecem na barra de endereço).');
      return;
    }
    setLocal({ ...local, lat: coordenadas.lat, lng: coordenadas.lng });
  };

  const enviarFoto = async (arquivo: File) => {
    if (!local) return;
    setErro('');

    if (!arquivo.type.startsWith('image/')) {
      setErro('Envie um arquivo de imagem (JPG, PNG ou WebP).');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      setErro(`A imagem precisa ter até ${TAMANHO_MAXIMO_MB}MB.`);
      return;
    }

    setEnviandoFoto(true);
    const extensao = arquivo.name.split('.').pop() || 'jpg';
    // nome novo a cada envio (timestamp) — evita cache de CDN mostrando a
    // foto antiga depois de trocar, e não deixa o dono de um local
    // sobrescrever arquivo de outro (a RLS já garante isso, isto é só
    // organização).
    const caminho = `${local.id}/capa-${Date.now()}.${extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from('fotos-locais')
      .upload(caminho, arquivo, { cacheControl: '3600', upsert: false });

    if (erroUpload) {
      setErro(`Não deu pra enviar a foto: ${erroUpload.message}`);
      setEnviandoFoto(false);
      return;
    }

    const { data } = supabase.storage.from('fotos-locais').getPublicUrl(caminho);
    setLocal({ ...local, foto_capa_url: data.publicUrl });
    setEnviandoFoto(false);
  };

  // Rodada 57 — logo do local, mesmo bucket/padrão de enviarFoto (capa),
  // só muda o prefixo do caminho ("logo-" em vez de "capa-") e o campo
  // que recebe a URL (logo_url em vez de foto_capa_url).
  const enviarLogo = async (arquivo: File) => {
    if (!local) return;
    setErro('');

    if (!arquivo.type.startsWith('image/')) {
      setErro('Envie um arquivo de imagem (JPG, PNG ou WebP).');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      setErro(`A imagem precisa ter até ${TAMANHO_MAXIMO_MB}MB.`);
      return;
    }

    setEnviandoLogo(true);
    const extensao = arquivo.name.split('.').pop() || 'jpg';
    const caminho = `${local.id}/logo-${Date.now()}.${extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from('fotos-locais')
      .upload(caminho, arquivo, { cacheControl: '3600', upsert: false });

    if (erroUpload) {
      setErro(`Não deu pra enviar o logo: ${erroUpload.message}`);
      setEnviandoLogo(false);
      return;
    }

    const { data } = supabase.storage.from('fotos-locais').getPublicUrl(caminho);
    setLocal({ ...local, logo_url: data.publicUrl });
    setEnviandoLogo(false);
  };

  const enviarFotoGaleria = async (arquivo: File) => {
    if (!local) return;
    setErro('');
    if (!arquivo.type.startsWith('image/')) {
      setErro('Envie um arquivo de imagem (JPG, PNG ou WebP).');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      setErro(`A imagem precisa ter até ${TAMANHO_MAXIMO_MB}MB.`);
      return;
    }
    if (local.galeria_fotos.length >= LIMITE_GALERIA_FOTOS) {
      setErro(`Limite de ${LIMITE_GALERIA_FOTOS} fotos na galeria.`);
      return;
    }
    setEnviandoFoto(true);
    const extensao = arquivo.name.split('.').pop() || 'jpg';
    const caminho = `${local.id}/galeria-${Date.now()}.${extensao}`;
    const { error: erroUpload } = await supabase.storage
      .from('fotos-locais')
      .upload(caminho, arquivo, { cacheControl: '3600', upsert: false });
    if (erroUpload) {
      setErro(`Não deu pra enviar a foto: ${erroUpload.message}`);
      setEnviandoFoto(false);
      return;
    }
    const { data } = supabase.storage.from('fotos-locais').getPublicUrl(caminho);
    setLocal({ ...local, galeria_fotos: [...local.galeria_fotos, data.publicUrl] });
    setEnviandoFoto(false);
  };

  const removerFotoGaleria = (url: string) => {
    if (!local) return;
    setLocal({ ...local, galeria_fotos: local.galeria_fotos.filter((f) => f !== url) });
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!local) return;
    setSalvando(true);
    setErro('');
    setSalvo(false);

    const { error } = await supabase
      .from('locais')
      .update({
        nome: local.nome,
        categoria: local.categoria,
        subcategoria: local.subcategoria,
        descricao: local.descricao,
        bairro: local.bairro,
        bairro_exibicao: local.bairro_exibicao,
        cidade: local.cidade,
        endereco: local.endereco,
        instagram: local.instagram,
        contato_nome: local.contato_nome,
        contato_email: local.contato_email,
        contato_telefone: local.contato_telefone,
        foto_capa_url: local.foto_capa_url,
        logo_url: local.logo_url,
        lat: local.lat,
        lng: local.lng,
        publico_tags: local.publico_tags,
        tags: local.tags,
        horario_funcionamento: limparHorarioFuncionamento(local.horario_funcionamento),
        galeria_fotos: local.galeria_fotos,
        video_url: local.video_url,
      })
      .eq('id', local.id);

    if (error) {
      setErro(error.message);
    } else {
      setSalvo(true);
    }
    setSalvando(false);
  };

  if (carregando || !local) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#E1306C]" size={28} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#A0A0B2] text-xs hover:text-white transition mb-6">
        <ArrowLeft size={14} /> Voltar
      </Link>

      <h1 className="text-2xl font-black mb-1">Minha Página</h1>
      <p className="text-[#A0A0B2] text-xs mb-2">
        É assim que seu local aparece pro usuário final do app — nome, fotos, categoria e tags.
      </p>
      <p className="text-[11px] text-[#626274] mb-8">
        Selo, destaque e status de aprovação não ficam aqui de propósito — quem confirma isso é a
        Andrea, depois que o pagamento do plano é confirmado (ver <Link href="/planos" className="underline hover:text-white">planos</Link>).
        Hoje: status <b className="text-[#D0D0E0]">{local.status}</b>, destaque{' '}
        <b className="text-[#D0D0E0]">{local.plano_destaque}</b>.
      </p>

      <div className="bg-[#161520] border border-[#232230] rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-bold mb-1 flex items-center gap-2"><KeyRound size={14} className="text-[#E1306C]" /> Segurança da conta</h2>
        <p className="text-[11px] text-[#626274] mb-3">
          Se você entrou com a senha temporária que a Andrea mandou por WhatsApp, troque por uma sua aqui.
        </p>
        {erroSenha && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-lg text-xs mb-3">{erroSenha}</div>}
        {senhaTrocada && (
          <div className="bg-[#4CAF7D]/10 border border-[#4CAF7D]/30 text-[#4CAF7D] p-2.5 rounded-lg text-xs mb-3 flex items-center gap-2">
            <Check size={14} /> Senha atualizada.
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErroSenha('');
            setSenhaTrocada(false);
            if (novaSenha.length < 6) {
              setErroSenha('A senha precisa ter pelo menos 6 caracteres.');
              return;
            }
            if (novaSenha !== confirmarSenha) {
              setErroSenha('As senhas não são iguais.');
              return;
            }
            setTrocandoSenha(true);
            const { error } = await supabase.auth.updateUser({ password: novaSenha });
            setTrocandoSenha(false);
            if (error) {
              setErroSenha(error.message);
              return;
            }
            setNovaSenha('');
            setConfirmarSenha('');
            setSenhaTrocada(true);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="password"
            required
            minLength={6}
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Nova senha"
            className="flex-1 bg-[#0B0B0E] border border-[#232230] rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]"
          />
          <input
            type="password"
            required
            minLength={6}
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            placeholder="Confirmar nova senha"
            className="flex-1 bg-[#0B0B0E] border border-[#232230] rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C]"
          />
          <button
            type="submit"
            disabled={trocandoSenha}
            className="bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-2.5 px-4 rounded-lg text-xs whitespace-nowrap"
          >
            {trocandoSenha ? 'Trocando...' : 'Trocar senha'}
          </button>
        </form>
      </div>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs mb-6">{erro}</div>}
      {salvo && (
        <div className="bg-[#4CAF7D]/10 border border-[#4CAF7D]/30 text-[#4CAF7D] p-3 rounded-xl text-xs mb-6 flex items-center gap-2">
          <Check size={14} /> Salvo.
        </div>
      )}

      <form onSubmit={salvar} className="space-y-6">
        <div>
          <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Foto de capa</label>
          {local.foto_capa_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={local.foto_capa_url}
              alt="Prévia da foto de capa"
              className="w-full h-40 object-cover rounded-xl mb-2 border border-[#232230]"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          )}
          <input
            ref={inputArquivoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) enviarFoto(arquivo);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={enviandoFoto}
            onClick={() => inputArquivoRef.current?.click()}
            className="w-full bg-[#161520] border border-dashed border-[#232230] hover:border-[#E1306C]/50 rounded-xl py-3.5 px-4 text-[#D0D0E0] text-sm font-bold flex items-center justify-center gap-2 transition"
          >
            {enviandoFoto ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            {enviandoFoto ? 'Enviando...' : local.foto_capa_url ? 'Trocar foto' : 'Enviar foto do computador/celular'}
          </button>
          <p className="text-[10px] text-[#626274] mt-1">
            JPG, PNG ou WebP, até {TAMANHO_MAXIMO_MB}MB. A foto já aparece pro usuário final assim que
            você clicar em &quot;Salvar&quot; mais abaixo.
          </p>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Logo do local (opcional)</label>
          {local.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={local.logo_url}
              alt="Prévia do logo"
              className="w-20 h-20 object-cover rounded-full mb-2 border border-[#232230]"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          )}
          <input
            ref={inputLogoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) enviarLogo(arquivo);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={enviandoLogo}
            onClick={() => inputLogoRef.current?.click()}
            className="w-full bg-[#161520] border border-dashed border-[#232230] hover:border-[#E1306C]/50 rounded-xl py-3.5 px-4 text-[#D0D0E0] text-sm font-bold flex items-center justify-center gap-2 transition"
          >
            {enviandoLogo ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            {enviandoLogo ? 'Enviando...' : local.logo_url ? 'Trocar logo' : 'Enviar logo do computador/celular'}
          </button>
          <p className="text-[10px] text-[#626274] mt-1">
            JPG, PNG ou WebP, até {TAMANHO_MAXIMO_MB}MB. Diferente da foto de capa (que costuma ser uma
            foto do ambiente) — o logo é usado onde o app mostra locais em formato de selo/avatar
            pequeno e redondo, como no banner &quot;Membro Fundador&quot;. Sem logo, o app usa a foto de
            capa nesses lugares.
          </p>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Nome do local (como aparece no app)</label>
          <input
            type="text"
            required
            value={local.nome}
            onChange={(e) => setLocal({ ...local, nome: e.target.value })}
            className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
          />
          <p className="text-xs text-[#A0A0B2] mt-2">
            Pode ser diferente da razão social do CNPJ — use o nome que os clientes já
            conhecem.
          </p>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Descrição</label>
          <textarea
            value={local.descricao || ''}
            onChange={(e) => setLocal({ ...local, descricao: e.target.value })}
            rows={4}
            className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Categoria</label>
            <select
              value={local.categoria}
              onChange={(e) => setLocal({ ...local, categoria: e.target.value })}
              className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value} disabled={c.disabled}>
                  {c.label}
                  {c.disabled ? ' (Em breve)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Subcategoria</label>
            <input
              type="text"
              value={local.subcategoria || ''}
              onChange={(e) => setLocal({ ...local, subcategoria: e.target.value })}
              placeholder="Ex: Bar, Balada, Drag..."
              className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">
            Tags de público (aparece nos filtros do app e do mapa)
          </label>
          <div className="flex flex-wrap gap-2">
            {PUBLICO_OPCOES.map((op) => {
              const ligado = local.publico_tags.includes(op.slug);
              return (
                <button
                  type="button"
                  key={op.slug}
                  onClick={() => alternarTag(op.slug)}
                  className={`text-xs font-bold px-3 py-2 rounded-full border transition ${
                    ligado
                      ? 'bg-[#E1306C] border-[#E1306C] text-white'
                      : 'bg-[#161520] border-[#232230] text-[#A0A0B2] hover:border-[#E1306C]/50'
                  }`}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[#626274] mt-2">
            Nenhuma marcada = mostra pra todo mundo, sem tag específica.
          </p>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">
            Horário de funcionamento
          </label>
          <CampoHorarioFuncionamento
            value={local.horario_funcionamento}
            onChange={(h) => setLocal({ ...local, horario_funcionamento: h })}
            disabled={salvando}
          />
        </div>

        <div>
          {(() => {
            const limite = limiteTagsExperiencia();
            const extras = local.tags.filter((t) => !(TAGS_EXPERIENCIA as readonly string[]).includes(t));
            const publicaNoApp = publicaRecursosNoApp(local.plano_comercial, local.plano_comercial_status);
            return (
              <>
                <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">
                  Tags de experiência (aparecem no perfil e no destaque do local)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {TAGS_EXPERIENCIA.map((tag) => {
                    const ligado = local.tags.includes(tag);
                    const desabilitado = !ligado && local.tags.length >= limite;
                    return (
                      <button
                        type="button"
                        key={tag}
                        disabled={desabilitado}
                        onClick={() => alternarTagExperiencia(tag, limite)}
                        className={`text-xs font-bold px-3 py-2 rounded-full border transition ${
                          ligado
                            ? 'bg-[#E1306C] border-[#E1306C] text-white'
                            : desabilitado
                            ? 'bg-[#161520] border-[#232230] text-[#626274] opacity-40 cursor-not-allowed'
                            : 'bg-[#161520] border-[#232230] text-[#A0A0B2] hover:border-[#E1306C]/50'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {extras.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {extras.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => removerTag(tag)}
                        className="text-xs font-bold px-3 py-2 rounded-full border bg-[#E1306C] border-[#E1306C] text-white flex items-center gap-1.5"
                        title="Remover"
                      >
                        {tag} <span className="text-white/70">×</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaTagLivre}
                    onChange={(e) => setNovaTagLivre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        adicionarTagLivre(limite);
                      }
                    }}
                    disabled={local.tags.length >= limite}
                    placeholder="Escreva uma tag sua (ex: Rooftop)"
                    className="flex-1 bg-[#161520] border border-[#232230] rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C] disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => adicionarTagLivre(limite)}
                    disabled={local.tags.length >= limite || !novaTagLivre.trim()}
                    className="bg-[#232230] hover:bg-[#2D2B3D] text-white text-xs font-bold px-4 rounded-xl disabled:opacity-40"
                  >
                    Adicionar
                  </button>
                </div>
                <p className="text-[10px] text-[#626274] mt-2">
                  {local.tags.length}/{limite} tags usadas — escolha das sugeridas ou escreva a sua.
                </p>
                {!publicaNoApp && (
                  <p className="text-xs text-[#E1A93A] bg-[#E1A93A]/10 border border-[#E1A93A]/30 rounded-xl p-3 mt-2">
                    Fica salvo aqui, mas só aparece pros usuários no app quando seu plano for{' '}
                    <b>Premium</b> ou <b>Fundador</b> (ativo). Veja em{' '}
                    <Link href="/planos" className="underline hover:text-white">planos</Link>.
                  </p>
                )}
              </>
            );
          })()}
        </div>

        <div>
          {(() => {
            const publicaNoApp = publicaRecursosNoApp(local.plano_comercial, local.plano_comercial_status);
            return (
              <>
                <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">
                  Galeria de fotos (carrossel no perfil do app)
                </label>
                {local.galeria_fotos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                    {local.galeria_fotos.map((url) => (
                      <div key={url} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Foto da galeria"
                          className="w-full h-24 object-cover rounded-lg border border-[#232230]"
                        />
                        <button
                          type="button"
                          onClick={() => removerFotoGaleria(url)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                          title="Remover"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={inputGaleriaRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    if (arquivo) enviarFotoGaleria(arquivo);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={enviandoFoto || local.galeria_fotos.length >= LIMITE_GALERIA_FOTOS}
                  onClick={() => inputGaleriaRef.current?.click()}
                  className="w-full bg-[#161520] border border-dashed border-[#232230] hover:border-[#E1306C]/50 rounded-xl py-3.5 px-4 text-[#D0D0E0] text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-40"
                >
                  {enviandoFoto ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  {enviandoFoto ? 'Enviando...' : 'Adicionar foto à galeria'}
                </button>
                <p className="text-[10px] text-[#626274] mt-1">
                  {local.galeria_fotos.length}/{LIMITE_GALERIA_FOTOS} fotos — JPG, PNG ou WebP, até {TAMANHO_MAXIMO_MB}MB cada.
                </p>
                {!publicaNoApp && (
                  <p className="text-xs text-[#E1A93A] bg-[#E1A93A]/10 border border-[#E1A93A]/30 rounded-xl p-3 mt-2">
                    Fica salvo aqui, mas só aparece pros usuários no app quando seu plano for{' '}
                    <b>Premium</b> ou <b>Fundador</b> (ativo). Veja em{' '}
                    <Link href="/planos" className="underline hover:text-white">planos</Link>.
                  </p>
                )}
              </>
            );
          })()}
        </div>

        <div>
          {(() => {
            const publicaNoApp = publicaRecursosNoApp(local.plano_comercial, local.plano_comercial_status);
            return (
              <>
                <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">
                  Vídeo (link do Instagram, Reels ou YouTube)
                </label>
                <input
                  type="url"
                  value={local.video_url || ''}
                  onChange={(e) => setLocal({ ...local, video_url: e.target.value })}
                  placeholder="https://instagram.com/reel/..."
                  className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
                />
                <p className="text-[10px] text-[#626274] mt-2">
                  Cole o link de um Reels, vídeo do Instagram ou YouTube. Sem upload de arquivo — só o link.
                </p>
                {!publicaNoApp && (
                  <p className="text-xs text-[#E1A93A] bg-[#E1A93A]/10 border border-[#E1A93A]/30 rounded-xl p-3 mt-2">
                    Fica salvo aqui, mas só aparece pros usuários no app quando seu plano for{' '}
                    <b>Premium</b> ou <b>Fundador</b> (ativo). Veja em{' '}
                    <Link href="/planos" className="underline hover:text-white">planos</Link>.
                  </p>
                )}
              </>
            );
          })()}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Bairro</label>
            <input
              type="text"
              value={local.bairro || ''}
              onChange={(e) => setLocal({ ...local, bairro: e.target.value })}
              className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Cidade</label>
            <input
              type="text"
              required
              value={local.cidade}
              onChange={(e) => setLocal({ ...local, cidade: e.target.value })}
              className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">
            Bairro para exibir no app (opcional)
          </label>
          <input
            type="text"
            value={local.bairro_exibicao || ''}
            onChange={(e) => setLocal({ ...local, bairro_exibicao: e.target.value })}
            placeholder={`Deixe em branco pra mostrar "${local.bairro || 'seu bairro'}"`}
            className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
          />
          <p className="text-[10px] text-[#626274] mt-1">
            Só muda o texto mostrado pro usuário do app — não muda o endereço real nem a localização no
            mapa. Preencha só se um nome mais conhecido representar melhor onde você fica, por exemplo
            &quot;Augusta&quot; em vez de &quot;Consolação&quot;.
          </p>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Endereço</label>
          <input
            type="text"
            value={local.endereco || ''}
            onChange={(e) => setLocal({ ...local, endereco: e.target.value })}
            className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2 flex items-center gap-1.5">
            <MapPin size={12} /> Localização no mapa
          </label>
          <p className="text-[10px] text-[#626274] mb-2">
            É essa coordenada que faz o botão &quot;Ver no mapa&quot; funcionar no app. Sem ela, o
            app mostra &quot;local não informou coordenadas&quot;.
          </p>
          <button
            type="button"
            onClick={buscarCoordenadasDoEndereco}
            disabled={buscandoCoordenadas}
            className="w-full bg-[#161520] border border-dashed border-[#232230] hover:border-[#E1306C]/50 rounded-xl py-3 px-4 text-[#D0D0E0] text-sm font-bold flex items-center justify-center gap-2 transition mb-2"
          >
            {buscandoCoordenadas ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
            {buscandoCoordenadas ? 'Buscando...' : 'Buscar automaticamente pelo endereço'}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="any"
              value={local.lat ?? ''}
              onChange={(e) => setLocal({ ...local, lat: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="Latitude"
              className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
            <input
              type="number"
              step="any"
              value={local.lng ?? ''}
              onChange={(e) => setLocal({ ...local, lng: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="Longitude"
              className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
          </div>
          <p className="text-[10px] text-[#626274] mt-2">
            {local.lat != null && local.lng != null
              ? 'Preenchido — não esqueça de clicar em "Salvar" no fim da página.'
              : 'Ainda sem coordenada — o mapa vai continuar avisando "não informou coordenadas" até preencher.'}
          </p>
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Instagram (@usuário)</label>
          <input
            type="text"
            value={local.instagram || ''}
            onChange={(e) => setLocal({ ...local, instagram: e.target.value })}
            placeholder="@seulocal"
            className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">Contato — nome</label>
            <input
              type="text"
              value={local.contato_nome || ''}
              onChange={(e) => setLocal({ ...local, contato_nome: e.target.value })}
              className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">WhatsApp</label>
            <input
              type="text"
              value={local.contato_telefone || ''}
              onChange={(e) => setLocal({ ...local, contato_telefone: e.target.value })}
              className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
            {telefoneParecCurto(local.contato_telefone || '') && (
              <p className="text-xs text-amber-400 mt-2">
                Esse número parece incompleto — confere se o DDD está incluído? Um WhatsApp
                incompleto faz o link de acesso apontar pro número errado.
              </p>
            )}
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#A0A0B2] uppercase block mb-2">E-mail</label>
            <input
              type="email"
              value={local.contato_email || ''}
              onChange={(e) => setLocal({ ...local, contato_email: e.target.value })}
              className="w-full bg-[#161520] border border-[#232230] rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#E1306C]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-[#E1306C] hover:bg-[#C2285C] text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
        >
          {salvando ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Salvar
        </button>
      </form>
    </div>
  );
}
