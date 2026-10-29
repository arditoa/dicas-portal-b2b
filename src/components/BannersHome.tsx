// Banners de patrocínio destaque das páginas da Home (Em Alta, Recomendados, O que fazer hoje, Top da semana, Experiências,
// Serviços): 6 vagas por página, "Banner 1 … Banner 6", girando no carrossel. Cada vaga lê categoria_patrocinio pela chave
// `<pagina>-<n>` (ex.: em-alta-3), a mesma lógica de edição que irá para o portal. Vaga livre aparece escrita só em demonstração.
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, View } from 'react-native';

import CarrosselAnuncios, { Anuncio } from './CarrosselAnuncios';
import { MODO_DEMONSTRACAO } from '../lib/demo';
import { buscarPatrociniosLote, Patrocinio, registrarVitrine } from '../lib/vitrine';

const VAGAS = 6;
const URL_PARCEIRO = 'https://www.dicaslgbt.com.br/parceiro-fundador';
const DEGRADES: [string, string][] = [
  ['#E1306C', '#7E57C2'],
  ['#7E57C2', '#2563EB'],
  ['#0E9F6E', '#0E7490'],
  ['#F59E0B', '#E1306C'],
  ['#6366F1', '#EC4899'],
  ['#2563EB', '#7E57C2'],
];

export default function BannersHome({ slug, nome }: { slug: string; nome: string }) {
  const router = useRouter();
  const [vagas, setVagas] = useState<Record<string, Patrocinio>>({});

  useEffect(() => {
    let vivo = true;
    buscarPatrociniosLote(Array.from({ length: VAGAS }, (_, i) => `${slug}-${i + 1}`)).then((m) => { if (vivo) setVagas(m); });
    return () => { vivo = false; };
  }, [slug]);

  const anuncios = useMemo<Anuncio[]>(() => {
    const lista: Anuncio[] = [];
    for (let n = 1; n <= VAGAS; n++) {
      const p = vagas[`${slug}-${n}`];
      const cor = DEGRADES[(n - 1) % DEGRADES.length];
      if (p) {
        lista.push({
          id: `bh-${slug}-${n}`, chave: `bh-${slug}-${n}`, tag: p.tag, titulo: p.titulo, cta: p.cta, icone: 'award',
          cor: p.cor1, degrade: [p.cor1, p.cor2],
          onPress: () => {
            registrarVitrine(p.local_id, `patrocinio:${slug}-${n}`, 'clique');
            if (p.destino.startsWith('http')) Linking.openURL(p.destino).catch(() => {});
            else if (p.destino.startsWith('local:')) router.push(`/business/${p.destino.slice(6)}` as any);
            else if (p.destino) router.push(p.destino as any);
          },
        });
      } else if (MODO_DEMONSTRACAO) {
        lista.push({
          id: `bh-${slug}-${n}`, chave: `bh-${slug}-${n}`, tag: 'PATROCÍNIO DESTAQUE', titulo: `Banner ${n} ${nome} Home`, cta: 'Quero este espaço',
          icone: 'award', cor: cor[0], degrade: cor, onPress: () => Linking.openURL(URL_PARCEIRO).catch(() => {}),
        });
      }
    }
    return lista;
  }, [vagas, slug, nome, router]);

  if (anuncios.length === 0) return null;
  return (
    <View style={{ marginHorizontal: -16, marginBottom: 6 }}>
      <CarrosselAnuncios anuncios={anuncios} />
    </View>
  );
}
