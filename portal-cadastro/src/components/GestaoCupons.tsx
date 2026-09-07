import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Cupom {
  id: string;
  codigo: string;
  descricao: string;
  desconto_porcentagem: number;
  limite_usos: number;
  usos_atuais: number;
  ativo: boolean;
  validade: string;
}

export default function GestaoCupons({ partnerId }: { partnerId: string }) {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [desconto, setDesconto] = useState(10);
  const [limite, setLimite] = useState(50);
  const [validade, setValidade] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    carregarCupons();
  }, [partnerId]);

  const carregarCupons = async () => {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (data) setCupons(data);
  };

  const criarCupom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem('');

    const { error } = await supabase.from('coupons').insert({
      partner_id: partnerId,
      codigo: codigo.toUpperCase(),
      descricao,
      desconto_porcentagem: desconto,
      limite_usos: limite,
      usos_atuais: 0,
      validade: validade || null,
      ativo: true
    });

    if (error) {
      setMensagem('Erro ao criar cupom. Verifique se o código já existe.');
    } else {
      setMensagem('Cupom criado com sucesso!');
      setCodigo('');
      setDescricao('');
      carregarCupons();
    }
    setCarregando(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-800 text-slate-100 rounded-2xl border border-slate-700 shadow-xl">
      <h2 className="text-2xl font-bold mb-2 text-purple-400">🏷️ Gestão de Cupons & Benefícios</h2>
      <p className="text-sm text-slate-400 mb-6">Crie vantagens exclusivas para atrair a comunidade até o seu espaço.</p>

      {mensagem && (
        <div className="mb-4 p-3 rounded bg-purple-900/50 border border-purple-500 text-purple-200 text-sm">
          {mensagem}
        </div>
      )}

      <form onSubmit={criarCupom} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-slate-900/60 p-4 rounded-xl border border-slate-700">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">CÓDIGO DO CUPOM *</label>
          <input
            type="text"
            placeholder="EX: DICAS10"
            required
            className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">DESCONTO (%)</label>
          <input
            type="number"
            min="1"
            max="100"
            required
            className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
            value={desconto}
            onChange={(e) => setDesconto(Number(e.target.value))}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-300 mb-1">DESCRIÇÃO DO BENEFÍCIO *</label>
          <input
            type="text"
            placeholder="Ex: 10% OFF no consumo total ou Welcome Drink"
            required
            className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">LIMITE DE RESGATES</label>
          <input
            type="number"
            min="1"
            className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
            value={limite}
            onChange={(e) => setLimite(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">VALIDADE (OPCIONAL)</label>
          <input
            type="date"
            className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:border-purple-500 focus:outline-none"
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
          />
        </div>

        <div className="md:col-span-2 mt-2">
          <button
            type="submit"
            disabled={carregando}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-purple-600/30"
          >
            {carregando ? 'Criando Cupom...' : 'Criar Novo Cupom'}
          </button>
        </div>
      </form>

      <div className="border-t border-slate-700 pt-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Seus Cupons Ativos</h3>
        {cupons.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum cupom cadastrado até o momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cupons.map((c) => (
              <div key={c.id} className="p-4 bg-slate-900 border border-slate-700 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold bg-purple-900/60 text-purple-300 px-2 py-1 rounded border border-purple-600">
                    {c.codigo}
                  </span>
                  <p className="text-sm font-medium text-white mt-2">{c.descricao}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Resgates: {c.usos_atuais} / {c.limite_usos}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-emerald-400">{c.desconto_porcentagem}% OFF</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
