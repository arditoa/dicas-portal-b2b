import Passo1Form, { Passo1Data } from '@/components/Passo1Form';
import Passo2Form, { Passo2Data } from '@/components/Passo2Form';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function BusinessRegisterScreen() {
  const [activeTab, setActiveTab] = useState<'b2b' | 'coupons' | 'admin'>('b2b');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Dados Etapa 1
  const [step1Data, setStep1Data] = useState<Passo1Data>({
    document: '',
    responsibleName: '',
    whatsapp: '',
    companyName: '',
    fantasyName: '',
    category: 'bares',
    neighborhood: '',
  });

  // Dados Etapa 2
  const [step2Data, setStep2Data] = useState<Passo2Data>({
    instagram: '',
    diferencial: '',
    selectedExperiences: [],
    selectedMusic: [],
    selectedVibes: [],
  });

  const handleStep1Change = (field: keyof Passo1Data, value: string) => {
    setStep1Data((prev) => ({ ...prev, [field]: value }));
  };

  const handleStep2Change = (field: keyof Passo2Data, value: any) => {
    setStep2Data((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!step2Data.diferencial.trim()) {
      alert('Por favor, informe a descrição/proposta do espaço.');
      return;
    }

    setLoading(true);

    try {
      const slugId =
        step1Data.fantasyName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') +
        '-' +
        Math.floor(1000 + Math.random() * 9000);

      // 1. Grava na tabela 'businesses'
      const { error: bizError } = await supabase.from('businesses').insert({
        id: slugId,
        name: step1Data.fantasyName,
        category: step1Data.category,
        neighborhood: step1Data.neighborhood,
        diferencial: step2Data.diferencial,
        description: step2Data.diferencial,
        instagram: step2Data.instagram
          ? step2Data.instagram.startsWith('@')
            ? step2Data.instagram
            : `@${step2Data.instagram}`
          : null,
        whatsapp: step1Data.whatsapp,
        has_selo_dicas: true,
        plan_id: 'basic',
      });

      if (bizError) throw bizError;

      // 2. Grava as 10 intenções na tabela 'business_experiences'
      if (step2Data.selectedExperiences.length > 0) {
        const experienceLinks = step2Data.selectedExperiences.map((tag) => ({
          business_id: slugId,
          experience_tag: tag,
        }));

        const { error: expError } = await supabase
          .from('business_experiences')
          .insert(experienceLinks);

        if (expError) throw expError;
      }

      setSuccess(true);
    } catch (err: any) {
      alert(`Erro ao cadastrar: ${err.message || 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successCard}>
        <Text style={styles.successTitle}>✨ Cadastro Realizado com Sucesso!</Text>
        <Text style={styles.successSubtitle}>
          Seu espaço foi cadastrado com sucesso e já está configurado com as novas intenções de busca do aplicativo Dicas LGBT+.
        </Text>
        <TouchableOpacity
          style={styles.newRegisterBtn}
          onPress={() => {
            setSuccess(false);
            setStep(1);
          }}
        >
          <Text style={styles.newRegisterBtnText}>Cadastrar Outro Espaço</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {step === 1 ? (
        <Passo1Form
          data={step1Data}
          onChange={handleStep1Change}
          onNext={() => setStep(2)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : (
        <Passo2Form
          data={step2Data}
          onChange={handleStep2Change}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
          loading={loading}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  successCard: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#121118',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#232230',
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#E1306C',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#A0A0B2',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  newRegisterBtn: {
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: '#E1306C',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newRegisterBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});