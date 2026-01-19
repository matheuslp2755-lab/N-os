import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'disposable' | 'lomo' | 'iso6400' | 'dusty' | 'leak';

interface VibeConfig {
    id: VibeEffect;
    name: string;
    icon: string;
    description: string;
}

const VIBES: VibeConfig[] = [
    { id: 'disposable', name: '90s Flash', icon: '📸', description: 'Descartável com carimbo de data' },
    { id: 'lomo', name: 'Lomo-Fi', icon: '🌈', description: 'Cores vibrantes e cores vazadas' },
    { id: 'iso6400', name: 'Raw Grain', icon: '🌌', description: 'Ruído estético e tons lavados' },
    { id: 'dusty', name: 'Dusty Film', icon: '🎞️', description: 'Riscos, poeira e desfoque' },
    { id: 'leak', name: 'Light Leak', icon: '🔥', description: 'Vazamentos de luz solar' },
];

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const startCamera = async () => {
        stopCamera();
        try {
            const constraints = {
                video: { 
                    facingMode, 
                    width: { ideal: 1080 }, 
                    height: { ideal: 1920 } 
                }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (err) {
            console.error("Paradise Error:", err);
        }
    };

    useEffect(() => {
        if (isOpen && !capturedImage) startCamera();
        return () => stopCamera();
    }, [isOpen, facingMode, capturedImage]);

    const applyAestheticFlaws = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Preservar a imagem original antes dos filtros
        const originalData = ctx.getImageData(0, 0, w, h);

        // 1. ABERRAÇÃO CROMÁTICA (RGB SHIFT) - Sutil nas bordas
        if (activeVibe === 'lomo' || activeVibe === 'disposable') {
            const data = originalData.data;
            const shift = 3;
            for (let i = 0; i < data.length; i += 4) {
                // Aplica mais nas bordas (radial)
                const x = (i / 4) % w;
                const y = Math.floor((i / 4) / w);
                const dist = Math.sqrt(Math.pow(x - w/2, 2) + Math.pow(y - h/2, 2));
                const factor = dist / (w/2);
                
                if (factor > 0.5) {
                    data[i] = data[i + Math.floor(shift * factor)] || data[i]; 
                    data[i + 2] = data[i - Math.floor(shift * factor)] || data[i + 2];
                }
            }
            ctx.putImageData(originalData, 0, 0);
        }

        // 2. CONTRASTE E EXPOSIÇÃO (Evitar pretos 100% fechados)
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'; // Levanta levemente as sombras
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';

        // 3. GRÃO E RUÍDO (Simulação de Filme)
        ctx.globalCompositeOperation = 'overlay';
        const grainOpacity = activeVibe === 'iso6400' ? 0.25 : 0.12;
        ctx.globalAlpha = grainOpacity;
        for (let i = 0; i < (activeVibe === 'iso6400' ? 1200 : 600); i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
            ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
        }
        ctx.globalAlpha = 1.0;

        // 4. EFEITOS ESPECÍFICOS RECALIBRADOS
        switch (activeVibe) {
            case 'disposable':
                ctx.filter = 'saturate(1.1) contrast(0.95) brightness(1.05)';
                ctx.drawImage(ctx.canvas, 0, 0);
                break;

            case 'lomo':
                const lomoVin = ctx.createRadialGradient(w/2, h/2, w/5, w/2, h/2, w*0.85);
                lomoVin.addColorStop(0, 'rgba(0,0,0,0)');
                lomoVin.addColorStop(1, 'rgba(0,0,0,0.5)'); // Vinheta menos agressiva
                ctx.fillStyle = lomoVin;
                ctx.fillRect(0, 0, w, h);
                ctx.filter = 'saturate(1.4) contrast(1.1)';
                break;

            case 'iso6400':
                ctx.globalCompositeOperation = 'lighten';
                ctx.fillStyle = 'rgba(30, 30, 30, 0.1)'; // Lift blacks
                ctx.fillRect(0, 0, w, h);
                ctx.globalCompositeOperation = 'source-over';
                ctx.filter = 'contrast(0.9) grayscale(0.2)';
                break;

            case 'dusty':
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                for(let i=0; i<3; i++) {
                    const x = Math.random() * w;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x + (Math.random()-0.5)*15, h);
                    ctx.stroke();
                }
                // Blur periférico (Centro fica nítido)
                ctx.filter = 'blur(0.5px)';
                break;

            case 'leak':
                const leak = ctx.createLinearGradient(w, 0, w*0.4, h);
                leak.addColorStop(0, 'rgba(255, 60, 0, 0.3)'); // Leak sutil
                leak.addColorStop(0.5, 'rgba(255, 30, 0, 0.1)');
                leak.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = leak;
                ctx.fillRect(0, 0, w, h);
                break;
        }

        // 5. CARIMBO DE DATA ESTÉTICO
        if (activeVibe === 'disposable' || activeVibe === 'dusty') {
            ctx.filter = 'none';
            ctx.font = 'bold 32px "Courier New", monospace';
            ctx.fillStyle = 'rgba(255, 145, 0, 0.8)';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 2;
            const now = new Date();
            const dateStr = `'${String(now.getFullYear()).slice(-2)} ${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}`;
            ctx.fillText(dateStr, w - 220, h - 60);
        }

        // 6. VINHETA DE LENTE (Gradual)
        const finalVin = ctx.createRadialGradient(w/2, h/2, w/3, w/2, h/2, w);
        finalVin.addColorStop(0, 'rgba(0,0,0,0)');
        finalVin.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = finalVin;
        ctx.fillRect(0, 0, w, h);
    };

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 100);

        setIsProcessing(true);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.save();
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0);
            ctx.restore();

            if (activeVibe) applyAestheticFlaws(ctx, canvas.width, canvas.height);

            setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
            setIsProcessing(false);
            stopCamera();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-mono">
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
                <button onClick={onClose} className="text-white/40 hover:text-white text-4xl font-thin active:scale-90 transition-transform">&times;</button>
                <div className="text-center">
                    <span className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-black">NÉOS STUDIO</span>
                </div>
                <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="p-2 text-white/40 active:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </header>

            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                {!capturedImage ? (
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover opacity-80" 
                        style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}}
                    />
                ) : (
                    <img src={capturedImage} className="w-full h-full object-contain animate-fade-in" />
                )}
                
                {/* Overlay de Efeito no Preview (Sutil) */}
                {!capturedImage && activeVibe && (
                    <div className="absolute inset-0 pointer-events-none border-[40px] border-black/10 mix-blend-overlay"></div>
                )}

                {showFlash && <div className="absolute inset-0 bg-white z-[100] animate-pulse"></div>}
                
                {isProcessing && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-50">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <p className="text-white text-[9px] font-black uppercase tracking-[0.3em]">Revelando...</p>
                    </div>
                )}
            </div>

            <footer className="bg-zinc-950 p-6 z-50 flex flex-col items-center gap-8 border-t border-white/5 safe-bottom">
                {!capturedImage && (
                    <>
                        {/* Seletor de Efeitos com Swipe Fluido */}
                        <div className="w-full relative">
                            <div className="flex gap-5 overflow-x-auto no-scrollbar scroll-smooth px-8 py-2 touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                                {VIBES.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setActiveVibe(v.id)}
                                        className={`flex flex-col items-center gap-3 shrink-0 transition-all duration-300 ${activeVibe === v.id ? 'scale-110' : 'opacity-30'}`}
                                    >
                                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl border-2 transition-colors ${activeVibe === v.id ? 'border-sky-500 bg-sky-500/10' : 'border-white/10 bg-zinc-900'}`}>
                                            {v.icon}
                                        </div>
                                        <span className="text-[9px] text-white uppercase font-black tracking-tighter whitespace-nowrap">{v.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {activeVibe && (
                            <button 
                                onClick={handleCapture} 
                                className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center p-1.5 group active:scale-90 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                            >
                                <div className="w-full h-full bg-white rounded-full shadow-inner"></div>
                            </button>
                        )}
                    </>
                )}

                {capturedImage && (
                    <div className="flex gap-4 w-full max-w-xs animate-slide-up">
                        <button 
                            onClick={() => setCapturedImage(null)} 
                            className="flex-1 py-5 bg-zinc-900 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 active:scale-95 transition-all"
                        >
                            Refazer
                        </button>
                        <a 
                            href={capturedImage} 
                            download={`neos-vibe-${Date.now()}.jpg`} 
                            className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl text-center shadow-xl active:scale-95 transition-all"
                        >
                            Salvar
                        </a>
                    </div>
                )}
            </footer>

            <canvas ref={canvasRef} className="hidden" />
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .safe-bottom { padding-bottom: calc(1.5rem + env(safe-area-inset-bottom)); }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;