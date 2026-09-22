'use client';

// Componente compartilhado (Rodada 35) -- usado em /cadastro/rapido (no
// cadastro anônimo) e em /dashboard/perfil (edição pelo dono já logado).
// Mesma paleta/classes que o resto do portal já usa (inputClass/labelClass
// inline, igual cadastro/rapido e dashboard/perfil).
import { DIAS_SEMANA, HorarioFuncionamento } from '../lib/horarios';

const inputClass =
  'w-full bg-[#161520] border border-[#232230] rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-[#E1306C] disabled:opacity-40';

// Rodada 56 (2ª rodada de ajuste) — Andrea reportou "está escuro a parte
// horário da banda no cadastro". Dois problemas juntos: (1) sem
// `colorScheme: 'dark'`, o navegador desenha o ícone/relógio do
// `<input type="time">` assumindo tema claro — em cima do fundo escuro
// do input isso fica quase invisível; (2) a coluna de música ao vivo era
// a única das três sem nenhum texto visível (só aria-label), então além
// de "escura" ela não tinha como se identificar. Corrige as duas coisas
// pros três horários (Abre/Fecha/Banda), não só o da banda.
const inputStyle = { colorScheme: 'dark' as const };

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

  return (
    <div className="space-y-2">
      {DIAS_SEMANA.map((dia) => {
        const info = value[dia.chave] || { aberto: false };
        return (
          <div
            key={dia.chave}
            className="grid grid-cols-[88px_1fr] sm:grid-cols-[88px_auto_1fr_1fr_1fr] items-center gap-2 bg-[#13121A] border border-[#232230] rounded-xl px-3 py-2"
          >
            <label className="flex items-center gap-2 text-sm text-white font-medium">
              <input
                type="checkbox"
                checked={info.aberto}
                disabled={disabled}
                onChange={(e) => atualizarDia(dia.chave, { aberto: e.target.checked })}
                className="w-4 h-4 accent-[#E1306C]"
              />
              {dia.label}
            </label>

            {info.aberto ? (
              <>
                <div>
                  <span className="hidden sm:block text-[11px] text-[#626274]">Abre</span>
                  <input
                    type="time"
                    className={inputClass}
                    style={inputStyle}
                    disabled={disabled}
                    value={info.abre || ''}
                    onChange={(e) => atualizarDia(dia.chave, { abre: e.target.value })}
                    aria-label={`Horário de abertura, ${dia.label}`}
                  />
                </div>
                <div>
                  <span className="hidden sm:block text-[11px] text-[#626274]">Fecha</span>
                  <input
                    type="time"
                    className={inputClass}
                    style={inputStyle}
                    disabled={disabled}
                    value={info.fecha || ''}
                    onChange={(e) => atualizarDia(dia.chave, { fecha: e.target.value })}
                    aria-label={`Horário de fechamento, ${dia.label}`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="hidden sm:block text-[11px] text-[#E1306C] font-medium">Banda ao vivo</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      className={inputClass}
                      style={inputStyle}
                      disabled={disabled}
                      value={info.musica_ao_vivo || ''}
                      onChange={(e) => atualizarDia(dia.chave, { musica_ao_vivo: e.target.value })}
                      aria-label={`Início da música ao vivo, ${dia.label} (opcional)`}
                    />
                  </div>
                </div>
              </>
            ) : (
              <span className="col-span-1 sm:col-span-3 text-[13px] text-[#626274]">Fechado</span>
            )}
          </div>
        );
      })}
      <p className="text-[11px] text-[#626274] pt-1">
        O terceiro horário (à direita) é opcional — só preencha se esse dia tiver música ao vivo, e a partir de que horário ela começa.
      </p>
    </div>
  );
}
