import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, RefreshCw, X, AlertCircle } from 'lucide-react';
import { SAMPLE_SCENARIOS } from '../utils/sampleTables';
import { SampleScenario } from '../utils/pokerTypes';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCaptured: (base64Image: string) => Promise<void>;
  onScenarioSelected: (scenario: SampleScenario) => void;
  isProcessing: boolean;
  analysisError?: string;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  onClose,
  onImageCaptured,
  onScenarioSelected,
  isProcessing,
  analysisError,
}) => {
  const [useLiveCamera, setUseLiveCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen || !useLiveCamera) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, [isOpen, useLiveCamera]);

  const startLiveCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setUseLiveCamera(true);
    } catch (err: any) {
      console.warn('Câmera direta indisponível, usando seletor nativo:', err);
      setCameraError('Câmera direta indisponível. Utilize o botão "Tirar Foto da Mesa".');
      setUseLiveCamera(false);
      cameraInputRef.current?.click();
    }
  };

  // Captura pelo Viewfinder com compressão para 800px
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    const vWidth = videoRef.current.videoWidth || 640;
    const vHeight = videoRef.current.videoHeight || 480;

    const MAX_DIM = 800;
    let width = vWidth;
    let height = vHeight;

    if (width > height && width > MAX_DIM) {
      height *= MAX_DIM / width;
      width = MAX_DIM;
    } else if (height > MAX_DIM) {
      width *= MAX_DIM / height;
      height = MAX_DIM;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.65);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setUseLiveCamera(false);
      onImageCaptured(dataUrl);
    }
  };

  // Upload ou captura nativa com compressão para 800px
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
          onImageCaptured(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="w-full max-w-lg bg-gradient-to-b from-[#0c2419] to-[#05140e] border border-amber-400/40 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl text-slate-100 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-800/60">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            <h3 id="capture-title" className="text-lg font-bold text-amber-300 font-serif">
              Captura Multimodal da Mesa
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar captura"
            className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-slate-300 flex items-center justify-center font-bold text-lg cursor-pointer hover:bg-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isProcessing && (
          <div className="relative rounded-2xl bg-black/60 border border-amber-400/60 p-6 flex flex-col items-center justify-center text-center overflow-hidden my-2">
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent radar-line" />
            <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mb-3" />
            <span className="text-base font-bold text-amber-300">
              Escaneando Mesa com IA...
            </span>
            <span className="text-xs text-emerald-300/80 mt-1">
              Identificando cartas do Hero, board e stacks em tempo real
            </span>
          </div>
        )}

        {useLiveCamera && !isProcessing && (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video sm:aspect-[4/3] flex items-center justify-center border border-amber-400/50">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-6 border-2 border-dashed border-amber-400/50 rounded-xl pointer-events-none flex flex-col justify-between p-2">
              <span className="text-[10px] font-mono text-amber-300/80 uppercase">
                Área de detecção da mesa
              </span>
              <span className="text-[10px] font-mono text-amber-300/80 self-end uppercase">
                Cartas do Hero & Board
              </span>
            </div>
            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
              <button
                type="button"
                onClick={takeSnapshot}
                className="px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-lg shadow-amber-400/50 flex items-center gap-2 cursor-pointer transition-all scale-105"
              >
                <div className="w-4 h-4 rounded-full bg-slate-950" />
                <span>Capturar Foto</span>
              </button>
              <button
                type="button"
                onClick={() => setUseLiveCamera(false)}
                className="px-3 py-2 rounded-full bg-slate-900/80 text-slate-300 text-xs border border-slate-700 cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {(cameraError || analysisError) && (
          <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-600/40 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span role="alert">{analysisError || cameraError}</span>
          </div>
        )}

        {!useLiveCamera && !isProcessing && (
          <div className="flex flex-col gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (cameraInputRef.current) {
                    cameraInputRef.current.click();
                  } else {
                    startLiveCamera();
                  }
                }}
                className="py-4 px-3 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-sm flex flex-col items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <Camera className="w-7 h-7 text-slate-950" />
                <span>Tirar Foto da Mesa</span>
                <span className="text-[10px] font-normal text-slate-900/80 -mt-1">
                  Câmera do celular
                </span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-4 px-3 rounded-2xl bg-emerald-950/80 border border-emerald-600/60 hover:border-amber-400/80 text-emerald-200 font-bold text-sm flex flex-col items-center justify-center gap-2 shadow-md hover:bg-emerald-900/60 transition-all cursor-pointer"
              >
                <Upload className="w-7 h-7 text-emerald-400" />
                <span>Carregar Foto</span>
                <span className="text-[10px] font-normal text-emerald-300/70 -mt-1">
                  Galeria ou arquivo
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={startLiveCamera}
              className="py-2.5 px-4 rounded-xl bg-emerald-900/30 border border-emerald-700/40 text-xs font-semibold text-emerald-300 hover:text-amber-300 hover:border-amber-400/50 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Abrir Câmera em Tempo Real (Viewfinder)</span>
            </button>

            <div className="pt-2 border-t border-emerald-800/60">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block mb-2">
                Ou Teste com Cenários Prontos (1 Toque)
              </span>
              <div className="flex flex-col gap-2">
                {SAMPLE_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => {
                      onScenarioSelected(scenario);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 hover:border-amber-400/80 hover:bg-emerald-900/60 text-left flex items-center justify-between group transition-all cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-200 group-hover:text-amber-300">
                        {scenario.title}
                      </div>
                      <div className="text-[11px] text-emerald-400/70 truncate max-w-[280px]">
                        {scenario.description}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-black/40 px-2 py-1 rounded border border-amber-400/20">
                      {scenario.extraction.hero_hand.join(' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
