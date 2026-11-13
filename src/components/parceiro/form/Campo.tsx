// Campo de texto do Modo parceiro: rótulo, ajuda (onde aparece para o público), erro em vermelho e contador.
import { Feather } from '@expo/vector-icons';
import { KeyboardTypeOptions, Text, TextInput, View } from 'react-native';
import { CP } from '../TelaParceiro';
import { f } from './estilo';

export function Campo({
  rotulo, valor, aoMudar, ajuda, erro, max, linhas, teclado, exemplo, icone, autoCapitalize,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  ajuda?: string;
  erro?: string | null;
  max?: number;
  linhas?: boolean;
  teclado?: KeyboardTypeOptions;
  exemplo?: string; // placeholder
  icone?: keyof typeof Feather.glyphMap;
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const input = (
    <TextInput
      style={[f.input, linhas && f.inputLinhas, !!erro && f.inputErro, icone && { flex: 1, borderWidth: 0, paddingHorizontal: 0, backgroundColor: 'transparent' }]}
      value={valor}
      onChangeText={aoMudar}
      maxLength={max}
      multiline={linhas}
      keyboardType={teclado}
      placeholder={exemplo}
      placeholderTextColor={CP.fraco}
      autoCapitalize={autoCapitalize}
      accessibilityLabel={rotulo}
    />
  );
  return (
    <View style={f.bloco}>
      <Text style={f.rotulo}>{rotulo}</Text>
      {icone ? (
        <View style={[f.seletor, !!erro && f.inputErro]}>
          <Feather name={icone} size={15} color={CP.fraco} />
          {input}
        </View>
      ) : (
        input
      )}
      {(!!erro || !!ajuda || !!max) && (
        <View style={f.rodape}>
          {erro ? <Text style={f.erro}>{erro}</Text> : <Text style={f.ajuda}>{ajuda || ''}</Text>}
          {!!max && <Text style={f.contador}>{valor.length}/{max}</Text>}
        </View>
      )}
    </View>
  );
}
