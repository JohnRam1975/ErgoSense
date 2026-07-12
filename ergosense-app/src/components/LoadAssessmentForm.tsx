import type { LoadAssessmentManualInput, GripType, HandlingMode, LoadFrequency } from '../types/loadAssessment';
import { handlingModeLabel, loadFrequencyLabel } from '../utils/loadHandling';
import { profileForContext } from '../data/activityProfiles';
import type { ActivityContext } from '../data/activityProfiles';

interface LoadAssessmentFormProps {
  manual: LoadAssessmentManualInput;
  activityContext: ActivityContext;
  onChange: (patch: Partial<LoadAssessmentManualInput>) => void;
  compact?: boolean;
}

const GRIP_OPTIONS: { id: GripType; label: string }[] = [
  { id: 'boa', label: 'Boa preensão' },
  { id: 'regular', label: 'Regular' },
  { id: 'ruim', label: 'Ruim / instável' },
  { id: 'pinca', label: 'Pinça' },
  { id: 'gancho', label: 'Gancho' },
  { id: 'desconhecida', label: 'Não informada' },
];

const FREQ_OPTIONS: LoadFrequency[] = ['esporadico', 'frequente', 'continuo'];
const HANDLING_OPTIONS: HandlingMode[] = ['individual', 'dois_trabalhadores', 'ajuda_mecanica'];

export function LoadAssessmentForm({ manual, activityContext, onChange, compact }: LoadAssessmentFormProps) {
  const profile = profileForContext(activityContext);
  const suggestLoad = profile.fieldOrPhysical;

  return (
    <div className={`load-form${compact ? ' load-form--compact' : ''}`}>
      <div className="load-form-head">
        <span className="load-form-icon">📦</span>
        <div>
          <div className="load-form-title">Movimentação manual de cargas</div>
          <div className="load-form-sub">
            {suggestLoad
              ? 'Atividade física — informe peso e condições da carga para cálculo de risco.'
              : 'Opcional — ative se houver levantamento ou transporte de carga.'}
          </div>
        </div>
        <label className="load-form-toggle">
          <input
            type="checkbox"
            checked={manual.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          <span>Ativar</span>
        </label>
      </div>

      {manual.enabled && (
        <div className="load-form-grid">
          <label className="lbl">Descrição do objeto</label>
          <input
            className="inp"
            value={manual.objectDescription ?? ''}
            onChange={(e) => onChange({ objectDescription: e.target.value })}
            placeholder="Caixa, saco, ferramenta..."
          />

          <label className="lbl">Peso da carga (kg) *</label>
          <input
            className="inp"
            type="number"
            min={0}
            max={200}
            step={0.5}
            value={manual.weightKg || ''}
            onChange={(e) => onChange({ weightKg: Number(e.target.value) || 0 })}
            placeholder="Ex.: 25"
          />

          <label className="lbl">Tempo estimado da tarefa (min)</label>
          <input
            className="inp"
            type="number"
            min={1}
            max={480}
            value={manual.estimatedTaskMinutes > 0 ? manual.estimatedTaskMinutes : ''}
            onChange={(e) => onChange({ estimatedTaskMinutes: Number(e.target.value) || 0 })}
            placeholder="Digite os minutos"
          />

          <label className="lbl">Exposição nesta avaliação (min)</label>
          <input
            className="inp"
            type="number"
            min={0}
            max={120}
            step={0.5}
            value={manual.exposureMinutes > 0 ? manual.exposureMinutes : ''}
            onChange={(e) => onChange({ exposureMinutes: Number(e.target.value) || 0 })}
            placeholder="Digite os minutos"
          />

          <label className="lbl">Repetições por minuto</label>
          <input
            className="inp"
            type="number"
            min={0}
            max={30}
            value={manual.repetitionsPerMinute > 0 ? manual.repetitionsPerMinute : ''}
            onChange={(e) => onChange({ repetitionsPerMinute: Number(e.target.value) || 0 })}
            placeholder="Digite o RPM"
          />

          <label className="lbl">Frequência da atividade</label>
          <select
            className="inp"
            value={manual.frequency ?? ''}
            onChange={(e) =>
              onChange({ frequency: (e.target.value || undefined) as LoadFrequency | undefined })
            }
          >
            <option value="">Automática (pelo RPM)</option>
            {FREQ_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {loadFrequencyLabel(f)}
              </option>
            ))}
          </select>

          <label className="lbl">Tipo de pega</label>
          <select
            className="inp"
            value={manual.gripType}
            onChange={(e) => onChange({ gripType: e.target.value as GripType })}
          >
            {GRIP_OPTIONS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>

          <label className="lbl">Manuseio</label>
          <select
            className="inp"
            value={manual.handlingMode}
            onChange={(e) => onChange({ handlingMode: e.target.value as HandlingMode })}
          >
            {HANDLING_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {handlingModeLabel(m)}
              </option>
            ))}
          </select>

          <p className="load-form-camera-hint">
            A distância da carga ao corpo será medida automaticamente na câmera (marcar objeto → Medir distância).
          </p>

          <label className="load-form-check">
            <input
              type="checkbox"
              checked={manual.trunkTwist}
              onChange={(e) => onChange({ trunkTwist: e.target.checked })}
            />
            Torção do tronco durante o manuseio
          </label>
          <label className="load-form-check">
            <input
              type="checkbox"
              checked={manual.displacementWithLoad}
              onChange={(e) => onChange({ displacementWithLoad: e.target.checked })}
            />
            Deslocamento com carga nas mãos
          </label>

          {!compact && (
            <>
              <label className="lbl">Observações da carga</label>
              <input
                className="inp"
                value={manual.loadNotes ?? ''}
                onChange={(e) => onChange({ loadNotes: e.target.value })}
                placeholder="Tipo de embalagem, altura de prateleira..."
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
