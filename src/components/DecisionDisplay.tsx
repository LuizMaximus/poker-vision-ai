import React, { useState } from 'react';
import { StrategicRecommendation, PrimaryAction } from '../utils/pokerTypes';
import { Sparkles, ShieldAlert, Award, ChevronRight, Zap } from 'lucide-react';

interface DecisionDisplayProps {
  decision: StrategicRecommendation;
  onDeepAnalysisRequested?: () => Promise<void>;
  deepAnalysisLoading?: boolean;
  deepAnalysisResult?: {
    main_line: string;
    sizing_advice: string;
    gto_rationale: string;
    exploits_and_traps?: string;
    next_street_plan?: string;
  } | null;
}

export const DecisionDisplay: React.FC<DecisionDisplayProps> = ({
  decision,
  onDeepAnalysisRequested,
  deepAnalysisLoading = false,
  deepAnalysisResult = null,
}) => {
  const [showDeepTab, setShowDeepTab] = useState(false);

  // Primary action styling
  const actionConfig: Record<
    PrimaryAction,
    { label: string; bgGradient: string; textClass: string; borderClass: string; badgeClass: string; icon: string }
  > = {
    FOLD: {
      label: 'FOLD',
      bgGradient: 'from-slate-800 to-rose-950/80',
      textClass: 'text-rose-200',
      borderClass: 'border-rose-700/50',
      badgeClass: 'bg-rose-900/60 text-rose-300 border-rose-600/50',
      icon: '✕',
    },
    CHECK: {
      label: 'CHECK',
      bgGradient: 'from-emerald-950 to-sky-950',
      textClass: 'text-sky-200',
      borderClass: 'border-sky-700/50',
      badgeClass: 'bg-sky-900/60 text-sky-300 border-sky-600/50',
      icon: '✓',
    },
    CALL: {
      label: 'CHECK / CALL',
      bgGradient: 'from-emerald-950 to-cyan-950',
      textClass: 'text-cyan-200',
      borderClass: 'border-cyan-700/50',
      badgeClass: 'bg-cyan-900/60 text-cyan-300 border-cyan-600/50',
      icon: '◎',
    },
    RAISE: {
      label: 'RAISE',
      bgGradient: 'from-[#14301d] via-[#1f3f22] to-[#2a290d]',
      textClass: 'text-amber-300',
      borderClass: 'border-amber-400',
      badgeClass: 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black',
      icon: '▲',
    },
    ALL_IN: {
      label: 'ALL-IN / SHOVE',
      bgGradient: 'from-purple-950 via-rose-950 to-amber-950',
      textClass: 'text-amber-200',
      borderClass: 'border-amber-400 ring-2 ring-amber-400/50',
      badgeClass: 'bg-gradient-to-r from-rose-500 via-amber-500 to-purple-600 text-white font-black',
      icon: '⚡',
    },
  };

  const currentAction = actionConfig[decision.primaryAction];

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Main Action Hero Card */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${currentAction.bgGradient} border-2 ${currentAction.borderClass} p-5 shadow-2xl shadow-black/60`}
      >
        {/* Glow corner */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[11px] uppercase font-bold tracking-widest text-emerald-300/80 mb-0.5">
              Decisão Estratégica Recomendada
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentAction.icon}</span>
              <h2 className={`text-3xl sm:text-4xl font-black font-serif tracking-tight ${currentAction.textClass}`}>
                {currentAction.label}
              </h2>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
              Dimensionamento
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-amber-300 bg-black/40 px-2.5 py-1 rounded-lg border border-amber-400/30">
              {decision.recommendedBetSize}
            </span>
          </div>
        </div>

        {/* Hand strength bar & Category */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3 border border-white/10 mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              {decision.handCategory}
            </span>
            <span className="font-mono font-bold text-amber-400">
              Força do Range: {decision.handStrengthPercent}%
            </span>
          </div>
          {/* Progress gauge */}
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                decision.handStrengthPercent >= 80
                  ? 'bg-gradient-to-r from-amber-500 via-amber-300 to-emerald-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                  : decision.handStrengthPercent >= 55
                  ? 'bg-gradient-to-r from-sky-500 to-emerald-400'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
              style={{ width: `${Math.max(decision.handStrengthPercent, 5)}%` }}
            />
          </div>
        </div>

        {/* Tactical Justification */}
        <div className="text-sm text-slate-100 leading-relaxed font-medium bg-black/20 rounded-xl p-3 border-l-4 border-amber-400">
          <p className="italic">"{decision.tacticalJustification}"</p>
        </div>

        {/* Key risk alert if present */}
        {decision.keyRiskAlert && (
          <div className="mt-2.5 flex items-center gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-600/40 rounded-lg p-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{decision.keyRiskAlert}</span>
          </div>
        )}

        {/* Action Frequencies GTO Split Bar */}
        <div className="mt-3.5 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mb-1">
            <span>Frequência Teórica (GTO Mix):</span>
            <span className="text-amber-300 font-bold">
              {decision.actionFrequencies.raise > 0 && `Raise ${decision.actionFrequencies.raise}% `}
              {decision.actionFrequencies.allIn > 0 && `All-in ${decision.actionFrequencies.allIn}% `}
              {decision.actionFrequencies.checkCall > 0 && `Call ${decision.actionFrequencies.checkCall}% `}
              {decision.actionFrequencies.fold > 0 && `Fold ${decision.actionFrequencies.fold}%`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-900 border border-slate-700/60">
            {decision.actionFrequencies.raise > 0 && (
              <div
                style={{ width: `${decision.actionFrequencies.raise}%` }}
                className="bg-amber-400 h-full"
                title={`Raise ${decision.actionFrequencies.raise}%`}
              />
            )}
            {decision.actionFrequencies.allIn > 0 && (
              <div
                style={{ width: `${decision.actionFrequencies.allIn}%` }}
                className="bg-purple-500 h-full"
                title={`All-in ${decision.actionFrequencies.allIn}%`}
              />
            )}
            {decision.actionFrequencies.checkCall > 0 && (
              <div
                style={{ width: `${decision.actionFrequencies.checkCall}%` }}
                className="bg-cyan-500 h-full"
                title={`Call ${decision.actionFrequencies.checkCall}%`}
              />
            )}
            {decision.actionFrequencies.fold > 0 && (
              <div
                style={{ width: `${decision.actionFrequencies.fold}%` }}
                className="bg-rose-700 h-full"
                title={`Fold ${decision.actionFrequencies.fold}%`}
              />
            )}
          </div>
        </div>
      </div>

      {/* 2. Deep Strategic Analysis (Gemini Flash AI) */}
      <div className="bg-[#0a2318]/90 border border-emerald-700/40 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-amber-300">
              Aprofundamento Tático (Gemini Flash)
            </h4>
          </div>

          {onDeepAnalysisRequested && (
            <button
              type="button"
              disabled={deepAnalysisLoading}
              onClick={async () => {
                setShowDeepTab(true);
                await onDeepAnalysisRequested();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-bold shadow-md hover:shadow-amber-400/40 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {deepAnalysisLoading ? (
                <>
                  <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Analisando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>{deepAnalysisResult ? 'Atualizar GTO' : 'Aprofundar Análise'}</span>
                </>
              )}
            </button>
          )}
        </div>

        {deepAnalysisResult && (
          <div className="mt-3.5 pt-3 border-t border-emerald-800/60 flex flex-col gap-2.5 text-xs text-slate-200">
            <div className="bg-emerald-950/60 rounded-xl p-3 border border-emerald-700/50">
              <span className="font-bold text-amber-300 block mb-1">
                Raciocínio GTO & Ranges:
              </span>
              <p className="leading-relaxed text-slate-200">{deepAnalysisResult.gto_rationale}</p>
            </div>

            {deepAnalysisResult.exploits_and_traps && (
              <div className="bg-amber-950/30 rounded-xl p-3 border border-amber-700/40">
                <span className="font-bold text-amber-300 block mb-1">
                  Desvios Exploratórios & Armadilhas:
                </span>
                <p className="leading-relaxed text-amber-100">{deepAnalysisResult.exploits_and_traps}</p>
              </div>
            )}

            {deepAnalysisResult.next_street_plan && (
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/60">
                <span className="font-bold text-cyan-300 block mb-1">
                  Plano para a Próxima Street:
                </span>
                <p className="leading-relaxed text-slate-300">{deepAnalysisResult.next_street_plan}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
