// Etapa 13 — editor de uma etapa do cadastro da hospedagem (?n=1..8). Salva tudo de uma vez, como o portal.
// Regras em src/lib/parceiro/hospedagem.ts (espelho de dashboard/hospedagem). Só o dono e só turismo.
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarraSalvar, Campo, CampoHora, Chips, FotoUpload, Interruptor, estiloForm as f, useAvisoSairSemSalvar } from '../../components/parceiro/form';
import { CP, ESP, RAIO, TelaParceiro, TituloSecao } from '../../components/parceiro/TelaParceiro';
import { useModoParceiro } from '../../lib/modoParceiro';
import {
  apagar, carregar, criarEspaco, criarPonto, Dados, distanciaTexto, Espaco, ETAPAS, LIMITE_GALERIA, montarChecklist, salvar,
} from '../../lib/parceiro/hospedagem';
import { coordenadasAqui, coordenadasDoEndereco } from '../../lib/parceiro/pagina';
import { paraNumero } from '../../lib/parceiro/catalogo';
import {
  COMPROMISSOS_ACOLHIMENTO, FORMAS_PAGAMENTO, GRUPOS_HOSPEDAGEM, IDIOMAS_ATENDIMENTO, slugTag, TAGS_RESERVADAS, TERMO_ACOLHIMENTO,
  TIPOS_CANCELAMENTO, TIPOS_ESPACO, TIPOS_HOSPEDAGEM, TIPOS_PROXIMOS,
} from '../../lib/taxonomia';

const GRUPOS_ESTRUTURA = ['comodidades', 'quartos', 'acessibilidade', 'servicos', 'bem_estar', 'transporte', 'localizacao', 'perfil'];
const ESPACO_VAZIO = { tipo: 'quarto' as Espaco['tipo'], nome: '', descricao: '', foto_url: null as string | null, capacidade: '', camas: '', preco: '', caracteristicas: [] as string[] };
const alternar = (l: string[], v: string) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);

export default function HospedagemEtapa() {
  const router = useRouter();
  const { n: nTxt } = useLocalSearchParams<{ n?: string }>();
  const n = Math.min(8, Math.max(1, Number(nTxt) || 1));
  const { localAtivo } = useModoParceiro();
  const liberado = !!localAtivo && localAtivo.papel === 'dono' && localAtivo.categoria === 'turismo';
  const [d, setD] = useState<Dados | null>(null);
  const [base, setBase] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [novoEspaco, setNovoEspaco] = useState({ ...ESPACO_VAZIO });
  const [novoPonto, setNovoPonto] = useState({ tipo: TIPOS_PROXIMOS.find((t) => !t.auto)?.id || 'pontos_turisticos', nome: '', endereco: '' });
  const sujo = !!d && JSON.stringify({ l: d.local, p: d.perfil, v: d.validacao, t: d.termoMarcado }) !== base;
  const voltar = useAvisoSairSemSalvar(sujo && !salvando);

  const recarregar = useCallback(async () => {
    if (!liberado || !localAtivo) return;
    try {
      const x = await carregar(localAtivo.local_id);
      setD(x);
      setBase(JSON.stringify({ l: x.local, p: x.perfil, v: x.validacao, t: x.termoMarcado }));
    } catch (e: any) { Alert.alert('Hospedagem', e?.message); router.back(); }
  }, [liberado, localAtivo, router]);
  useEffect(() => { void recarregar(); }, [recarregar]);

  if (!localAtivo || !liberado) return <TelaParceiro titulo="Hospedagem"><Text style={a.aviso}>Só o dono de uma hospedagem (Dicas Trip) mexe aqui.</Text></TelaParceiro>;
  if (!d) return <View style={[a.tela, a.centro]}><ActivityIndicator color={CP.rosa} /></View>;

  const L = (x: Partial<Dados['local']>) => setD({ ...d, local: { ...d.local, ...x } });
  const P = (x: Partial<Dados['perfil']>) => setD({ ...d, perfil: { ...d.perfil, ...x } });
  const atr = (g: string, s: string) => L({ atributos: { ...d.local.atributos, [g]: alternar(d.local.atributos[g] || [], s) } });
  const grupo = (id: string) => GRUPOS_HOSPEDAGEM.find((g) => g.id === id);
  const chipsGrupo = (id: string) => {
    const g = grupo(id);
    if (!g) return null;
    const opcoes = g.tags.map((t) => ({ valor: slugTag(t), rotulo: t })).filter((o) => !TAGS_RESERVADAS.includes(o.valor));
    return <Chips key={id} multiplo rotulo={g.titulo} opcoes={opcoes} valor={(d.local.atributos[id] || []).filter((t) => !TAGS_RESERVADAS.includes(t))} aoMudar={(l) => L({ atributos: { ...d.local.atributos, [id]: [...l, ...(d.local.atributos[id] || []).filter((t) => TAGS_RESERVADAS.includes(t))] } })} />;
  };
  const itens = montarChecklist(d).filter((i) => i.etapa === n);
  const termoTravado = !!d.validacao.termo_aceito_em;
  const num = (v: string) => paraNumero(v);

  const gravar = async () => {
    setSalvando(true);
    try {
      const v = await salvar(d);
      const novo = { ...d, validacao: v };
      setD(novo);
      setBase(JSON.stringify({ l: novo.local, p: novo.perfil, v: novo.validacao, t: novo.termoMarcado }));
      Alert.alert('Salvo', 'Etapa salva.', [{ text: n < 8 ? 'Próxima etapa' : 'Voltar ao resumo', onPress: () => (n < 8 ? router.replace(`/parceiro/hospedagem-etapa?n=${n + 1}` as any) : router.back()) }, { text: 'Ficar aqui', style: 'cancel' }]);
    } catch (e: any) { Alert.alert('Hospedagem', e?.message || 'Não deu para salvar.'); } finally { setSalvando(false); }
  };
  const addEspaco = async () => {
    if (!novoEspaco.nome.trim()) return Alert.alert('Espaço', 'Dê um nome (ex.: Suíte com varanda).');
    if (novoEspaco.preco.trim() && num(novoEspaco.preco) == null) return Alert.alert('Espaço', 'Confira o preço (ex.: 350,00).');
    setBuscando(true);
    try {
      await criarEspaco(d.local.id, {
        tipo: novoEspaco.tipo, nome: novoEspaco.nome, descricao: novoEspaco.descricao, foto_url: novoEspaco.foto_url,
        capacidade: num(novoEspaco.capacidade), camas: novoEspaco.camas, preco_de: num(novoEspaco.preco), caracteristicas: novoEspaco.caracteristicas,
      }, d.espacos.filter((e) => e.tipo === novoEspaco.tipo).length);
      setNovoEspaco({ ...ESPACO_VAZIO, tipo: novoEspaco.tipo });
      const x = await carregar(d.local.id); setD({ ...d, espacos: x.espacos });
    } catch (e: any) { Alert.alert('Espaço', e?.message); } finally { setBuscando(false); }
  };
  const addPonto = async () => {
    if (!novoPonto.nome.trim()) return Alert.alert('Local próximo', 'Escreva o nome do lugar.');
    setBuscando(true);
    try {
      const c = await coordenadasDoEndereco({ endereco: novoPonto.endereco || novoPonto.nome, bairro: '', cidade: d.local.cidade || '' }).catch(() => null);
      await criarPonto(d.local.id, { tipo: novoPonto.tipo, nome: novoPonto.nome, endereco: novoPonto.endereco || null, lat: c?.lat ?? null, lng: c?.lng ?? null });
      setNovoPonto({ ...novoPonto, nome: '', endereco: '' });
      const x = await carregar(d.local.id); setD({ ...d, pontos: x.pontos });
    } catch (e: any) { Alert.alert('Local próximo', e?.message); } finally { setBuscando(false); }
  };
  const remover = (tabela: 'hospedagem_espacos' | 'pontos_proximos', id: string, nome: string) =>
    Alert.alert(`Apagar "${nome}"?`, undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Apagar', style: 'destructive', onPress: async () => { await apagar(tabela, id).catch(() => {}); const x = await carregar(d.local.id); setD({ ...d, espacos: x.espacos, pontos: x.pontos }); } }]);

  return (
    <View style={a.tela}>
      <TelaParceiro titulo={`${n} · ${ETAPAS[n - 1].titulo}`} subtitulo={d.local.nome}>
        <TouchableOpacity style={a.voltar} onPress={voltar} accessibilityRole="button"><Feather name="chevron-left" size={16} color={CP.dim} /><Text style={a.voltarTxt}>Resumo da hospedagem</Text></TouchableOpacity>
        <View style={a.itens}>
          {itens.map((i) => (
            <View key={i.id} style={a.item}><Feather name={i.ok ? 'check-circle' : 'circle'} size={14} color={i.ok ? CP.verde : i.obrigatorio ? '#FFD54F' : CP.fraco} /><Text style={a.itemTxt}>{i.label}{i.obrigatorio ? ' · obrigatório' : ''}</Text></View>
          ))}
        </View>

        {n === 1 && (
          <>
            <Chips rotulo="Tipo de hospedagem" opcoes={TIPOS_HOSPEDAGEM.map((t) => ({ valor: t, rotulo: t }))} valor={d.local.tipo_hospedagem} aoMudar={(v) => L({ tipo_hospedagem: v })} />
            <Campo rotulo="Número do Cadastur" valor={d.perfil.cadastur_numero || ''} aoMudar={(v) => P({ cadastur_numero: v || null })} ajuda="Cadastro obrigatório do Ministério do Turismo." />
            <Campo rotulo="Validade do Cadastur (opcional)" valor={d.perfil.cadastur_validade || ''} aoMudar={(v) => P({ cadastur_validade: v || null })} exemplo="AAAA-MM-DD" />
            <Campo rotulo="CNPJ (opcional)" valor={d.local.cnpj || ''} aoMudar={(v) => L({ cnpj: v.replace(/\D/g, '').slice(0, 14) || null })} teclado="number-pad" />
            <View style={a.duas}>
              <View style={{ flex: 1 }}><CampoHora rotulo="Check-in a partir das" valor={d.perfil.checkin_hora?.slice(0, 5) || null} aoMudar={(v) => P({ checkin_hora: v })} limpar /></View>
              <View style={{ flex: 1 }}><CampoHora rotulo="Check-out até as" valor={d.perfil.checkout_hora?.slice(0, 5) || null} aoMudar={(v) => P({ checkout_hora: v })} limpar /></View>
            </View>
            <Campo rotulo="Total de quartos / unidades" valor={d.perfil.total_quartos ? String(d.perfil.total_quartos) : ''} aoMudar={(v) => P({ total_quartos: v ? Number(v.replace(/\D/g, '')) : null })} teclado="number-pad" />
            <Campo rotulo="Idade mínima (opcional)" valor={d.perfil.idade_minima ? String(d.perfil.idade_minima) : ''} aoMudar={(v) => P({ idade_minima: v ? Number(v.replace(/\D/g, '')) : null })} teclado="number-pad" />
            <Chips multiplo rotulo="Idiomas de atendimento" opcoes={IDIOMAS_ATENDIMENTO.map((t) => ({ valor: t, rotulo: t }))} valor={d.perfil.idiomas} aoMudar={(l) => P({ idiomas: l })} />
            <Campo rotulo="Endereço" valor={d.local.endereco || ''} aoMudar={(v) => L({ endereco: v || null })} exemplo="Rua, número, bairro" />
            <Text style={[f.ajuda, { marginTop: ESP.s }]}>{d.local.lat != null ? `No mapa: ${d.local.lat.toFixed(5)}, ${d.local.lng?.toFixed(5)}` : 'Ainda sem ponto no mapa (obrigatório).'}</Text>
            <View style={[a.duas, { marginTop: ESP.s }]}>
              <TouchableOpacity style={[a.botao, { flex: 1 }]} disabled={buscando} onPress={async () => { setBuscando(true); try { const c = await coordenadasDoEndereco({ endereco: d.local.endereco || '', bairro: '', cidade: d.local.cidade || '' }); if (c) L(c); else Alert.alert('Mapa', 'Não encontramos esse endereço. Confira número, rua e cidade.'); } catch (e: any) { Alert.alert('Mapa', e?.message); } finally { setBuscando(false); } }}>
                {buscando ? <ActivityIndicator color={CP.dim} /> : <Text style={a.botaoTxt}>Achar pelo endereço</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[a.botao, { flex: 1 }]} disabled={buscando} onPress={async () => { try { L(await coordenadasAqui()); } catch (e: any) { Alert.alert('Mapa', e?.message); } }}>
                <Text style={a.botaoTxt}>Estou aqui agora</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {n === 2 && (
          <>
            <FotoUpload rotulo="Foto de capa" valor={d.local.foto_capa_url} aoMudar={(u) => L({ foto_capa_url: u })} bucket="fotos-locais" pasta={d.local.id} prefixo="capa" altura={180} />
            <TituloSecao texto={`Galeria (${d.local.galeria_fotos.length} de ${LIMITE_GALERIA})`} info="Recomendado: 4 fotos ou mais. Fotos de espaços e locais próximos aparecem no app no Premium e no Fundador." />
            <View style={a.galeria}>
              {d.local.galeria_fotos.map((u) => (
                <TouchableOpacity key={u} style={a.foto} onPress={() => Alert.alert('Foto', undefined, [{ text: 'Tirar da galeria', style: 'destructive', onPress: () => L({ galeria_fotos: d.local.galeria_fotos.filter((x) => x !== u) }) }, { text: 'Cancelar', style: 'cancel' }])}>
                  <Image source={{ uri: u }} style={StyleSheet.absoluteFill} />
                </TouchableOpacity>
              ))}
            </View>
            {d.local.galeria_fotos.length < LIMITE_GALERIA && <FotoUpload rotulo="Adicionar à galeria" valor={null} aoMudar={(u) => u && L({ galeria_fotos: [...d.local.galeria_fotos, u].slice(0, LIMITE_GALERIA) })} bucket="fotos-locais" pasta={d.local.id} prefixo="galeria" />}
          </>
        )}

        {n === 3 && (
          <>
            {!d.local.ehPremium && <Text style={a.premium}>As fotos dos espaços aparecem no app nos planos Premium e Fundador.</Text>}
            {TIPOS_ESPACO.map((t) => {
              const lista = d.espacos.filter((e) => e.tipo === t.id);
              if (!lista.length) return null;
              return (
                <View key={t.id}>
                  <TituloSecao texto={t.titulo} />
                  <View style={{ gap: ESP.s }}>
                    {lista.map((e) => (
                      <View key={e.id} style={a.cartao}>
                        <View style={a.thumb}>{e.foto_url ? <Image source={{ uri: e.foto_url }} style={StyleSheet.absoluteFill} /> : <Feather name="image" size={16} color={CP.fraco} />}</View>
                        <View style={{ flex: 1 }}>
                          <Text style={a.titulo}>{e.nome}</Text>
                          <Text style={a.sub} numberOfLines={2}>{[e.capacidade ? `${e.capacidade} pessoas` : null, e.camas, e.preco_de ? `a partir de R$ ${e.preco_de}` : null, e.descricao].filter(Boolean).join(' · ')}</Text>
                        </View>
                        <TouchableOpacity style={a.x} onPress={() => remover('hospedagem_espacos', e.id, e.nome)} accessibilityLabel={`Apagar ${e.nome}`}><Feather name="trash-2" size={15} color="#FF7A7A" /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
            <TituloSecao texto="Adicionar espaço" />
            <Chips preencher opcoes={TIPOS_ESPACO.map((t) => ({ valor: t.id, rotulo: t.titulo }))} valor={novoEspaco.tipo} aoMudar={(v) => setNovoEspaco({ ...novoEspaco, tipo: v as Espaco['tipo'] })} />
            <FotoUpload rotulo="Foto" valor={novoEspaco.foto_url} aoMudar={(u) => setNovoEspaco({ ...novoEspaco, foto_url: u })} bucket="fotos-locais" pasta={d.local.id} prefixo={`espaco-${novoEspaco.tipo}`} altura={140} />
            <Campo rotulo="Nome" valor={novoEspaco.nome} aoMudar={(v) => setNovoEspaco({ ...novoEspaco, nome: v })} exemplo={novoEspaco.tipo === 'quarto' ? 'Ex.: Suíte com varanda' : 'Ex.: Piscina'} />
            <Campo rotulo="Descrição (opcional)" valor={novoEspaco.descricao} aoMudar={(v) => setNovoEspaco({ ...novoEspaco, descricao: v })} linhas max={300} />
            {novoEspaco.tipo === 'quarto' && (
              <>
                <View style={a.duas}>
                  <View style={{ flex: 1 }}><Campo rotulo="Pessoas" valor={novoEspaco.capacidade} aoMudar={(v) => setNovoEspaco({ ...novoEspaco, capacidade: v.replace(/\D/g, '') })} teclado="number-pad" /></View>
                  <View style={{ flex: 1 }}><Campo rotulo="Preço a partir de (R$)" valor={novoEspaco.preco} aoMudar={(v) => setNovoEspaco({ ...novoEspaco, preco: v.replace(/[^\d.,]/g, '') })} teclado="decimal-pad" /></View>
                </View>
                <Campo rotulo="Camas" valor={novoEspaco.camas} aoMudar={(v) => setNovoEspaco({ ...novoEspaco, camas: v })} exemplo="Ex.: 1 cama de casal" />
                {grupo('quartos') && <Chips multiplo rotulo="Características" opcoes={grupo('quartos')!.tags.map((t) => ({ valor: slugTag(t), rotulo: t }))} valor={novoEspaco.caracteristicas} aoMudar={(l) => setNovoEspaco({ ...novoEspaco, caracteristicas: l })} />}
              </>
            )}
            <TouchableOpacity style={[a.add, buscando && { opacity: 0.6 }]} onPress={() => void addEspaco()} disabled={buscando} accessibilityRole="button">{buscando ? <ActivityIndicator color="#FFF" /> : <Text style={a.addTxt}>Adicionar espaço</Text>}</TouchableOpacity>
          </>
        )}

        {n === 4 && GRUPOS_ESTRUTURA.map((g) => chipsGrupo(g))}

        {n === 5 && (
          <>
            <Chips rotulo="Política de cancelamento" opcoes={TIPOS_CANCELAMENTO.map((t) => ({ valor: t.id, rotulo: t.label }))} valor={d.perfil.cancelamento_tipo} aoMudar={(v) => P({ cancelamento_tipo: v })} ajuda={TIPOS_CANCELAMENTO.find((t) => t.id === d.perfil.cancelamento_tipo)?.ajuda} />
            <Campo rotulo="Detalhe da política (opcional)" valor={d.perfil.cancelamento_texto || ''} aoMudar={(v) => P({ cancelamento_texto: v || null })} linhas max={400} />
            <Chips multiplo rotulo="Formas de pagamento" opcoes={FORMAS_PAGAMENTO.map((t) => ({ valor: t, rotulo: t }))} valor={d.perfil.formas_pagamento} aoMudar={(l) => P({ formas_pagamento: l })} />
            {chipsGrupo('politicas')}
            <Campo rotulo="Regras da casa (opcional)" valor={d.perfil.regras_casa || ''} aoMudar={(v) => P({ regras_casa: v || null })} linhas max={600} />
          </>
        )}

        {n === 6 && (
          <>
            <Chips multiplo rotulo="Compromissos de acolhimento" opcoes={COMPROMISSOS_ACOLHIMENTO.map((c) => ({ valor: c.id, rotulo: c.label }))} valor={d.validacao.compromissos} aoMudar={(l) => setD({ ...d, validacao: { ...d.validacao, compromissos: l } })} ajuda="Recomendado: pelo menos 3." />
            {chipsGrupo('diversidade')}
            <TituloSecao texto="Termo de compromisso" />
            <View style={a.termo}><Text style={a.termoTxt}>{TERMO_ACOLHIMENTO}</Text></View>
            <Interruptor titulo={termoTravado ? 'Termo aceito' : 'Li e aceito o termo'} explicacao={termoTravado ? `Aceito em ${new Date(d.validacao.termo_aceito_em!).toLocaleDateString('pt-BR')}. Não dá para desfazer por aqui.` : 'Obrigatório para enviar o cadastro.'} valor={termoTravado || d.termoMarcado} desabilitado={termoTravado} aoMudar={(v) => setD({ ...d, termoMarcado: v })} />
            <Text style={[f.ajuda, { marginTop: ESP.m }]}>Comprovante (política, certificado…): {d.validacao.comprovante_path ? 'enviado.' : 'envie pelo portal, no resumo da hospedagem.'}</Text>
          </>
        )}

        {n === 7 && (
          <>
            <Text style={f.ajuda}>Bares, festas e locais que já estão no Dicas entram sozinhos (até 3 km). Aqui você indica outros lugares; eles ficam em análise pela equipe.</Text>
            <View style={{ gap: ESP.s, marginTop: ESP.m }}>
              {d.pontos.map((p) => (
                <View key={p.id} style={a.cartao}>
                  <View style={{ flex: 1 }}>
                    <Text style={a.titulo}>{TIPOS_PROXIMOS.find((t) => t.id === p.tipo)?.label || p.tipo} · {p.nome}</Text>
                    <Text style={a.sub}>{[p.status === 'pendente' ? 'em análise' : p.status === 'recusado' ? 'recusado' : 'aprovado', distanciaTexto(d.local, p)].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <TouchableOpacity style={a.x} onPress={() => remover('pontos_proximos', p.id, p.nome)} accessibilityLabel={`Apagar ${p.nome}`}><Feather name="trash-2" size={15} color="#FF7A7A" /></TouchableOpacity>
                </View>
              ))}
            </View>
            <TituloSecao texto="Indicar um lugar" />
            <Chips rotulo="Tipo" opcoes={TIPOS_PROXIMOS.filter((t) => !t.auto).map((t) => ({ valor: t.id, rotulo: t.label }))} valor={novoPonto.tipo} aoMudar={(v) => setNovoPonto({ ...novoPonto, tipo: v })} />
            <Campo rotulo="Nome" valor={novoPonto.nome} aoMudar={(v) => setNovoPonto({ ...novoPonto, nome: v })} exemplo="Ex.: Praia Mole" />
            <Campo rotulo="Endereço (opcional)" valor={novoPonto.endereco} aoMudar={(v) => setNovoPonto({ ...novoPonto, endereco: v })} ajuda="Ajuda a calcular a distância até a hospedagem." />
            <TouchableOpacity style={[a.add, buscando && { opacity: 0.6 }]} onPress={() => void addPonto()} disabled={buscando} accessibilityRole="button">{buscando ? <ActivityIndicator color="#FFF" /> : <Text style={a.addTxt}>Indicar lugar</Text>}</TouchableOpacity>
          </>
        )}

        {n === 8 && (
          <>
            <Text style={f.ajuda}>Como o hóspede reserva com vocês (sem comissão). Preencha pelo menos um.</Text>
            <Campo rotulo="Link de reserva" valor={d.perfil.link_reserva || ''} aoMudar={(v) => P({ link_reserva: v || null })} icone="link" teclado="url" autoCapitalize="none" exemplo="https://…" />
            <Campo rotulo="WhatsApp de reservas" valor={d.perfil.whatsapp_reserva || ''} aoMudar={(v) => P({ whatsapp_reserva: v || null })} teclado="phone-pad" exemplo="(48) 90000-0000" />
            <Campo rotulo="E-mail de reservas" valor={d.perfil.email_reserva || ''} aoMudar={(v) => P({ email_reserva: v.trim() || null })} teclado="email-address" autoCapitalize="none" />
            <Campo rotulo="Site" valor={d.perfil.site || ''} aoMudar={(v) => P({ site: v || null })} teclado="url" autoCapitalize="none" exemplo="https://…" />
          </>
        )}
        <View style={{ height: ESP.xl }} />
      </TelaParceiro>
      {![3, 7].includes(n) && <BarraSalvar rotulo="Salvar etapa" salvando={salvando} aoSalvar={() => void gravar()} desabilitado={!sujo} />}
    </View>
  );
}

const a = StyleSheet.create({
  tela: { flex: 1, backgroundColor: CP.bg },
  centro: { alignItems: 'center', justifyContent: 'center' },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: ESP.s, minHeight: 44, alignSelf: 'flex-start' },
  voltarTxt: { color: CP.dim, fontSize: 12, fontWeight: '700' },
  aviso: { color: CP.dim, fontSize: 13, lineHeight: 19, backgroundColor: CP.card, borderRadius: RAIO.m, padding: ESP.m, marginTop: ESP.l },
  itens: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m, gap: 6, marginTop: ESP.s },
  item: { flexDirection: 'row', alignItems: 'center', gap: ESP.s },
  itemTxt: { color: CP.dim, fontSize: 12 },
  premium: { color: '#FFD54F', fontSize: 12, lineHeight: 17, backgroundColor: '#FFD54F14', borderRadius: RAIO.s, padding: ESP.m, marginTop: ESP.m },
  duas: { flexDirection: 'row', gap: ESP.s },
  botao: { minHeight: 46, borderRadius: RAIO.s, borderWidth: 1, borderColor: CP.borda, alignItems: 'center', justifyContent: 'center' },
  botaoTxt: { color: CP.dim, fontSize: 12, fontWeight: '800' },
  galeria: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP.s },
  foto: { width: 96, height: 96, borderRadius: RAIO.s, overflow: 'hidden', backgroundColor: CP.card },
  cartao: { flexDirection: 'row', alignItems: 'center', gap: ESP.m, backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.m, padding: ESP.m },
  thumb: { width: 52, height: 52, borderRadius: RAIO.s, overflow: 'hidden', backgroundColor: '#2A1B3D', alignItems: 'center', justifyContent: 'center' },
  titulo: { color: CP.texto, fontSize: 14, fontWeight: '800' },
  sub: { color: CP.dim, fontSize: 12, marginTop: 2 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  add: { minHeight: 50, borderRadius: RAIO.s, backgroundColor: CP.rosa, alignItems: 'center', justifyContent: 'center', marginTop: ESP.m },
  addTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  termo: { backgroundColor: CP.card, borderColor: CP.borda, borderWidth: 1, borderRadius: RAIO.s, padding: ESP.m },
  termoTxt: { color: '#C8C8D8', fontSize: 12, lineHeight: 18 },
});
