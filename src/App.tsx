import { useState } from 'react';
import { Passo1Form } from '../components/Passo1Form';
import { Passo2Form } from '../components/Passo2Form';

export function App() {
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [partnerId, setPartnerId] = useState<string>('');

  return (
    <div style={{ padding: 20 }}>
      {etapa === 1 && (
        <Passo1Form 
          onSuccess={(idGerado: string) => {
            setPartnerId(idGerado);
            setEtapa(2);
          }} 
        />
      )}

      {etapa === 2 && (
        <Passo2Form 
          partnerId={partnerId} 
          onSuccess={() => setEtapa(3)} 
        />
      )}

      {etapa === 3 && (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <h2>🎉 Cadastro Concluído!</h2>
          <p>Seu perfil foi enviado para moderação.</p>
        </div>
      )}
    </div>
  );
}
export default App;
