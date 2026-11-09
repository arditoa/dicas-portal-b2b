'use client';

// Componente compartilhado (Rodada 35) -- usado em /cadastro/rapido (no
// cadastro anônimo) e em /dashboard/perfil (edição pelo dono já logado).
//
// Redesenhado para ficar fácil de entender (pedido da Andrea: "está difícil de
// entender"):
//  - cada dia vira um cartão; ao marcar o dia já vêm horários sugeridos,
//    porque o <input type="time"> do iPhone mostra a hora ATUAL quando está
//    vazio e isso parecia "já preenchido";
//  - "Abre" e "Fecha" sempre com rótulo visível (antes só aparecia no desktop)
//    e em duas colunas que não estouram a tela do celular;
//  - música ao vivo deixou de ser um "terceiro horário misterioso": agora é
//    uma pergunta clara ("Tem música ao vivo neste dia?") que, ao ligar,
//    mostra "Começa às".
// O formato gravado em `locais.horario_funcionamento` NÃO mudou
// (aberto / abre / fecha / musica_ao_vivo), então nada precisa migrar.
import { DIAS_SEMANA, HorarioFuncionamento } from '../lib/horarios';

const ABRE_PADRAO = '18:00';
const FECHA_PADRAO = '23:00';
const MUSICA_PADRAO = '21:00';

const inputClass =
  'block w-full min-w-0 max-w-full bg-[#161520] border border-[#232230] rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C] disabled:opacity-40';

// colorScheme dark: sem isso o relógio do <input type="time"> fica quase
// invisível em cima do fundo escuro (Rodada 56). appearance/minHeight evitam
// o campo "estourar" a largura no Safari do iPhone.
const inputStyle = {
  colorScheme: 'dark' as const,
  WebkitAppearance: 'none' as const,
  appearance: 'none' as const,
  minHeight: 40,
};

type Props = {
  value: HorarioFuncionamento;
  onChange: (novo: HorarioFuncionamento) => void;
  disabled?: boolean;
};

export default function CampoHorarioFuncionamento({ value, onChange, disabled }: Props) {
  const atualizarDia = (chave: string, patch: Partial<HorarioFuncionamento[string]>) => {
    onChange({
      ...value,
      [chave]: { ...value[chave], ...patch },
    });
  };

  const marcarDia = (chave: string, aberto: boolean) => {
    const atual = value[chave] || { aberto: false };
    if (!aberto) {
      atualizarDia(chave, { aberto: false });
      return;
    }
    // Ao abrir o dia, sugere horários se ainda estiverem vazios.
    atualizarDia(chave, {
      aberto: true,
      abre: atual.abre || ABRE_PADRAO,
      fecha: atual.fecha || FECHA_PADRAO,
    });
  };

  const ligarMusica = (chave: string, ligada: boolean) => {
    atualizarDia(chave, { musica_ao_vivo: ligada ? MUSICA_PADRAO : undefined });
  };

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-[#9A9AAE] leading-snug">
        Marque os dias em que o local abre. Os horários já vêm sugeridos — é só ajustar.
      </p>

      {DIAS_SEMANA.map((dia) => {
        const info = value[dia.chave] || { aberto: false };
        const temMusica = !!info.musica_ao_vivo;
        return (
          <div
            key={dia.chave}
            className="bg-[#13121A] border border-[#232230] rounded-xl px-3 py-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-white font-medium">
                <input
                  type="checkbox"
                  checked={info.aberto}
                  disabled={disabled}
                  onChange={(e) => marcarDia(dia.chave, e.target.checked)}
                  className="w-5 h-5 accent-[#E1306C]"
                />
                {dia.label}
              </label>
              {!info.aberto && <span className="text-[13px] text-[#626274]">Fechado</span>}
            </div>

            {info.aberto && (
              <div className="mt-2.5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block min-w-0">
                    <span className="block text-[12px] text-[#9A9AAE] mb-1">Abre às</span>
                    <input
                      type="time"
                      className={inputClass}
                      style={inputStyle}
                      disabled={disabled}
                      value={info.abre || ''}
                      onChange={(e) => atualizarDia(dia.chave, { abre: e.target.value })}
                      aria-label={`Horário de abertura, ${dia.label}`}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="block text-[12px] text-[#9A9AAE] mb-1">Fecha às</span>
                    <input
                      type="time"
                      className={inputClass}
                      style={inputStyle}
                      disabled={disabled}
                      value={info.fecha || ''}
                      onChange={(e) => atualizarDia(dia.chave, { fecha: e.target.value })}
                      aria-label={`Horário de fechamento, ${dia.label}`}
                    />
                  </label>
                </div>

                <div className="border-t border-[#232230] pt-2.5">
                  <label className="flex items-center gap-2 text-[13px] text-white">
                    <input
                      type="checkbox"
                      checked={temMusica}
                      disabled={disabled}
                      onChange={(e) => ligarMusica(dia.chave, e.target.checked)}
                      className="w-5 h-5 accent-[#E1306C]"
                    />
                    <span>
                      <span className="text-[#E1306C] font-medium">♪ Música ao vivo</span> neste dia
                    </span>
                  </label>

                  {temMusica && (
                    <label className="block mt-2 max-w-[50%] min-w-0">
                      <span className="block text-[12px] text-[#9A9AAE] mb-1">Começa às</span>
                      <input
                        type="time"
                        className={inputClass}
                        style={inputStyle}
                        disabled={disabled}
                        value={info.musica_ao_vivo || ''}
                        onChange={(e) =>
                          atualizarDia(dia.chave, { musica_ao_vivo: e.target.value || MUSICA_PADRAO })
                        }
                        aria-label={`Início da música ao vivo, ${dia.label}`}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
