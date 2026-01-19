import React, { useState, useRef, useEffect, useCallback } from 'react';
import { auth, db, doc, updateDoc, serverTimestamp } from '../../firebase';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'classic' | 'ccd' | 'vhs' | 'hoga' | 'eightmm' | 'infrared';

interface EffectConfig {
    id: VibeEffect;
    name: string;
    icon: string;
    intensity: number;
    temp: number;
    grain: number;
    fade: number;
    vignette: number;
    sharpness: number;
}

const DEFAULT_EFFECTS: Record<VibeEffect, EffectConfig> = {
    classic: { id: 'classic', name: 'Classic', icon: '📷', intensity: 0.8, temp: 0, grain: 0.2, fade: 0.1, vignette: 0.3, sharpness: 1.0 },
    ccd: { id: 'ccd', name: 'Digital 2000', icon: '📸', intensity: 1.0, temp: -10, grain: 0.1, fade: 0.0, vignette: 0.2, sharpness: 1.2 },
    vhs: { id: 'vhs', name: 'VHS Tape', icon: '📼', intensity: 0.7, temp: 5, grain: 0.5, fade: 0.3, vignette: 0.4, sharpness: 0.6 },
    hoga: { id: 'hoga', name: 'Hoga Toy', icon: '🖼️', intensity: 0.9, temp: 15, grain: 0.4, fade: 0.2, vignette: 0.8, sharpness: 0.8 },
    eightmm: { id: 'eightmm', name: '8mm Reel', icon: '🎥', intensity: 0.85, temp: 20, grain: 0.6, fade: 0.4, vignette: 0.5, sharpness: 0.7 },
    infrared: { id: 'infrared', name: 'Heat Map', icon: '🌡️', intensity: 1.0, temp: 0, grain: 0.3, fade: 0.0, vignette: 0.6, sharpness: 1.1 }
};

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [activeVibe, setActiveVibe] = useState<VibeEffect>('classic');
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [viewingGallery, setViewingGallery] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showEffects, setShowEffects] = useState(false);
    const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
    const [timer, setTimer] = useState<0 | 3 | 10>(0);
    const [isCounting, setIsCounting] = useState(false);
    const [currentCount, setCurrentCount] = useState(0);
    const [showFlashAnim, setShowFlashAnim] = useState(false);

    // Ajustes Dinâmicos por Efeito
    const [configs, setConfigs] = useState<Record<VibeEffect, EffectConfig>>(DEFAULT_EFFECTS);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number>(null);

    const startCamera = useCallback(async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode, 
                    width: { ideal: 1920 }, 
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60 }
                },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                requestRef.current = requestAnimationFrame(renderLoop);
            }
        } catch (err) {
            console.error("Paradise Camera Error:", err);
        }
    }, [facingMode]);

    const renderLoop = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
            requestRef.current = requestAnimationFrame(renderLoop);
            return;
        }

        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
            const w = canvas.width = video.videoWidth;
            const h = canvas.height = video.videoHeight;
            
            ctx.save();
            if (facingMode === 'user') {
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0, w, h);
            ctx.restore();

            applyAdvancedFilters(ctx, w, h);
        }
        requestRef.current = requestAnimationFrame(renderLoop);
    };

    const applyAdvancedFilters = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const c = configs[activeVibe];
        
        // 1. Filtros CSS dinâmicos
        const hue = c.temp;
        const contrast = 1 + (c.intensity * 0.2);
        const brightness = 1 + (c.intensity * 0.05);
        const saturate = 1 + (c.intensity * 0.3);
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = `contrast(${contrast}) brightness(${brightness}) saturate(${saturate}) hue-rotate(${hue}deg)`;
        
        // Redesenhar com filtros para aplicar processamento nativo
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w; tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.filter = ctx.filter;
            tempCtx.drawImage(ctx.canvas, 0, 0);
            ctx.filter = 'none';
            ctx.drawImage(tempCanvas, 0, 0);
        }

        // 2. Grão de Filme (Noise)
        if (c.grain > 0) {
            ctx.globalAlpha = c.grain * 0.4;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 400; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
            }
        }

        // 3. Fade / Blacks Lift
        if (c.fade > 0) {
            ctx.globalAlpha = c.fade * 0.5;
            ctx.globalCompositeOperation = 'lighten';
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, w, h);
        }

        // 4. Vinheta
        if (c.vignette > 0) {
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'multiply';
            const grd = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.9);
            grd.addColorStop(0, 'rgba(255,255,255,1)');
            grd.addColorStop(1, `rgba(0,0,0,${1 - c.vignette})`);
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, w, h);
        }

        // 5. HUD Sony Alpha Style (Simulado)
        ctx.globalAlpha = 0.4;
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = 'white';
        ctx.fillText('NÉOS P-LOG', 60, 80);
        ctx.fillText(`ISO ${Math.floor(200 + c.intensity * 800)}`, 60, h - 80);
        ctx.fillText(`F ${ (1.8 + (1-c.intensity)).toFixed(1) }`, 180, h - 80);
    };

    useEffect(() => {
        if (isOpen && !viewingGallery) startCamera();
        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isOpen, facingMode, viewingGallery, startCamera]);

    const handleCapture = () => {
        if (isCounting) return;
        if (timer > 0) {
            setIsCounting(true);
            setCurrentCount(timer);
            const countdownInterval = setInterval(() => {
                setCurrentCount(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownInterval);
                        executeCapture();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            executeCapture();
        }
    };

    const executeCapture = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setShowFlashAnim(true);
        setTimeout(() => setShowFlashAnim(false), 150);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImages(prev => [...prev, dataUrl]);
        setIsCounting(false);
    };

    const updateConfig = (key: keyof EffectConfig, val: number) => {
        setConfigs(prev => ({
            ...prev,
            [activeVibe]: { ...prev[activeVibe], [key]: val }
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none h-[100dvh] font-sans text-white">
            {showFlashAnim && <div className="fixed inset-0 bg-white z-[1000] animate-flash-out"></div>}

            {/* BARRA SUPERIOR MINIMALISTA */}
            <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50">
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 backdrop-blur-xl rounded-full border border-white/10 active:scale-90 transition-all">&times;</button>
                
                {isCounting && (
                    <div className="text-4xl font-black italic animate-pulse tracking-tighter shadow-2xl">
                        {currentCount}
                    </div>
                )}

                <div className="flex gap-2">
                    <button 
                        onClick={() => setFlashMode(prev => prev === 'off' ? 'on' : 'off')}
                        className={`w-10 h-10 flex items-center justify-center backdrop-blur-xl rounded-full border border-white/10 transition-all ${flashMode === 'on' ? 'bg-amber-400 text-black' : 'bg-white/5 text-white'}`}
                    >
                        {flashMode === 'on' ? '⚡' : '✕'}
                    </button>
                    <button 
                        onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                        className="w-10 h-10 flex items-center justify-center bg-white/5 backdrop-blur-xl rounded-full border border-white/10"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
            </header>

            {/* PREVIEW TELA CHEIA */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                {viewingGallery ? (
                    <div className="absolute inset-0 z-[200] bg-black flex flex-col animate-fade-in">
                        <header className="p-4 flex justify-between items-center bg-zinc-900/50 backdrop-blur-xl border-b border-white/5">
                            <button onClick={() => setViewingGallery(false)} className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Fechar Galeria</button>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">{capturedImages.length} Sessão</h3>
                            <div className="w-10"></div>
                        </header>
                        <div className="flex-grow overflow-y-auto grid grid-cols-3 gap-1 p-1 no-scrollbar">
                            {capturedImages.map((img, i) => (
                                <div key={i} className="aspect-[3/4] relative group rounded-lg overflow-hidden border border-white/5">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <a href={img} download={`paradise-${i}.jpg`} className="absolute bottom-2 right-2 bg-white text-black p-2 rounded-full scale-75 group-active:scale-100 transition-all shadow-xl">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} className="hidden" />
                        <canvas ref={canvasRef} className="w-full h-full object-cover" />
                        
                        {/* BOTÕES LATERAIS SUSPENSOS */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
                            <button 
                                onClick={() => setTimer(prev => prev === 0 ? 3 : prev === 3 ? 10 : 0)}
                                className={`w-10 h-10 rounded-full backdrop-blur-xl border flex items-center justify-center text-[10px] font-black ${timer > 0 ? 'bg-sky-500 border-sky-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                            >
                                {timer > 0 ? `${timer}s` : '⏲️'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* CONTROLES INFERIORES - ESTILO CamsCam PREMIUM */}
            <footer className="bg-black/90 backdrop-blur-2xl px-6 pb-12 pt-4 border-t border-white/5 z-50">
                {!viewingGallery ? (
                    <div className="flex flex-col gap-6">
                        
                        {/* PAINEL DE AJUSTES PROFISSIONAL (Aparece se Settings for true) */}
                        {showSettings && (
                            <div className="space-y-6 animate-slide-up bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    {[
                                        { label: 'Grain', key: 'grain' as const },
                                        { label: 'Fade', key: 'fade' as const },
                                        { label: 'Temp', key: 'temp' as const, min: -50, max: 50 },
                                        { label: 'Vignette', key: 'vignette' as const }
                                    ].map(adj => (
                                        <div key={adj.key} className="space-y-2">
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase text-zinc-500 tracking-widest">
                                                {adj.label} <span>{configs[activeVibe][adj.key]}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min={adj.min ?? 0} max={adj.max ?? 1} step="0.01" 
                                                value={configs[activeVibe][adj.key]} 
                                                onChange={e => updateConfig(adj.key, parseFloat(e.target.value))} 
                                                className="w-full accent-white h-1 bg-white/10 rounded-full"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SELETOR DE EFEITOS (SWIPER) */}
                        <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1 snap-x snap-mandatory">
                            {/* Fixed type for eff to resolve property access errors */}
                            {Object.values(configs).map((eff: EffectConfig) => (
                                <button
                                    key={eff.id}
                                    onClick={() => setActiveVibe(eff.id)}
                                    onContextMenu={(e) => { e.preventDefault(); setShowSettings(!showSettings); }}
                                    className={`flex flex-col items-center shrink-0 snap-center transition-all duration-300 ${activeVibe === eff.id ? 'scale-110 opacity-100' : 'scale-90 opacity-20'}`}
                                >
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl border-2 ${activeVibe === eff.id ? 'bg-zinc-900 border-white shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'bg-zinc-900/50 border-white/5'}`}>
                                        {eff.icon}
                                    </div>
                                    <span className="text-[9px] font-black uppercase mt-2 tracking-tighter text-zinc-400">{eff.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* DISPARADOR E ATALHOS */}
                        <div className="flex items-center justify-between px-2">
                            <button 
                                onClick={() => setViewingGallery(true)}
                                className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center group active:scale-90 transition-all"
                            >
                                {capturedImages.length > 0 ? (
                                    <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover opacity-60" />
                                ) : (
                                    <div className="w-6 h-6 border-2 border-white/20 rounded-lg"></div>
                                )}
                            </button>

                            <button 
                                onClick={handleCapture} 
                                className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center p-2 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.05)]"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full border border-black/5"></div>
                                </div>
                            </button>

                            <button 
                                onClick={() => setShowSettings(!showSettings)}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${showSettings ? 'bg-white text-black border-white' : 'bg-zinc-900 text-white/40 border-white/10'}`}
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-4 animate-slide-up">
                        <button 
                            onClick={() => { setCapturedImages([]); setViewingGallery(false); }}
                            className="flex-1 py-5 bg-zinc-900 text-zinc-500 text-[10px] font-black uppercase tracking-widest rounded-3xl border border-white/5 active:scale-95"
                        >
                            Limpar Rolo
                        </button>
                        <button 
                            onClick={() => {
                                capturedImages.forEach((img, i) => {
                                    const link = document.createElement('a');
                                    link.download = `neos-studio-${Date.now()}-${i}.jpg`;
                                    link.href = img;
                                    link.click();
                                });
                                onClose();
                            }}
                            className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-3xl shadow-2xl active:scale-95 transition-all"
                        >
                            Salvar Sessão
                        </button>
                    </div>
                )}
            </footer>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes flash-out { 0% { opacity: 1; } 100% { opacity: 0; } }
                .animate-flash-out { animation: flash-out 0.8s ease-out forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 16px; width: 16px;
                    border-radius: 50%; background: white;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;