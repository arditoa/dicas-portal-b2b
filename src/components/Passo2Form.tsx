// Exemplo no seu App.tsx
import { useState } from 'react';
import { Passo2Form } from './components/Passo2Form';

export function App() {
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [partnerId, setPartnerId] = useState<string>('');

  // Chamado quando o Passo 1 responde com sucesso (retornando o partnerId)
  const handlePasso1Sucesso = (idGerado: string) => {
    setPartnerId(idGerado);
    setEtapa(2); // Muda a tela para o Passo 2
  };

  // Chamado quando o Passo 2 é concluído e enviado
  const handlePasso2Sucesso = () => {
    setEtapa(3); // Tela de confirmação / sucesso
  };

  return (
    <div>
      {etapa === 1 && (
        <MeuFormularioPasso1 onSuccess={handlePasso1Sucesso} />
      )}

      {etapa === 2 && (
        <Passo2Form partnerId={partnerId} onSuccess={handlePasso2Sucesso} />
      )}

      {etapa === 3 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          🎉 Cadastrado com sucesso! Seu perfil está em análise e será publicado em breve.
        </div>
      )}
    </div>
  );
}