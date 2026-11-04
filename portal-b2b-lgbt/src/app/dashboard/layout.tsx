import ParceiroShell from '../../components/parceiro/ParceiroShell';

// Rodada 129 — todas as telas do painel do parceiro passam por esta casca
// (menu lateral, cabeçalho, lembretes, ajuda).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ParceiroShell>{children}</ParceiroShell>;
}
