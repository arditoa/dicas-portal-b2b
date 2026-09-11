import { CadastroCompletoForm } from './components/CadastroCompletoForm';
// @ts-ignore
import './App.css';

export default function App() {
  // Caminho exato da imagem dentro da pasta public/
  const logoPath = "/logos-dicasapp-semfundo (2).png";

  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#ffffff', fontFamily: 'SF Pro Display, sans-serif' }}>
      {/* Cabeçalho Elegante e Fofinho com o Logo */}
      <header style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 0 16px', // Espaçamento suave
        borderBottom: '1px solid #1c1c1f', // Borda sutil
        backgroundColor: '#09090b',
        position: 'sticky', // Mantém o logo no topo
        top: 0,
        zIndex: 100 // Garante que fique acima do formulário
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src={logoPath} 
            alt="Dicas Parceiros Logo" 
            style={{ height: '40px', objectFit: 'contain' }} // Tamanho perfeito
            onError={(e) => {
              // Fallback elegante caso a imagem falhe (raro em public/)
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </header>

      {/* Conteúdo Principal (Formulário) */}
      <main style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <CadastroCompletoForm />
      </main>
    </div>
  );
}