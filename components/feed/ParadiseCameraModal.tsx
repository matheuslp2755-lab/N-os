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
    const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
    const [timer, setTimer] = useState<0 | 3 | 10>(0);
    const [isCounting, setIsCounting] = useState(false);
    const [currentCount, setCurrentCount] = useState(0);
    const [showFlashAnim, setShowFlashAnim] = useState(false);

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
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
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
        const hue = c.temp;
        const contrast = 1 + (c.intensity * 0.2);
        const brightness = 1 + (c.intensity * 0.05);
        const saturate = 1 + (c.intensity * 0.3);
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = `contrast(${contrast}) brightness(${brightness}) saturate(${saturate}) hue-rotate(${hue}deg)`;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w; tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.filter = ctx.filter;
            tempCtx.drawImage(ctx.canvas, 0, 0);
            ctx.filter = 'none';
            ctx.drawImage(tempCanvas, 0, 0);
        }

        if (c.grain > 0) {
            ctx.globalAlpha = c.grain * 0.4;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 200; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
            }
        }

        if (c.fade > 0) {
            ctx.globalAlpha = c.fade * 0.5;
            ctx.globalCompositeOperation = 'lighten';
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, w, h);
        }

        if (c.vignette > 0) {
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'multiply';
            const grd = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.9);
            grd.addColorStop(0, 'rgba(255,255,255,1)');
            grd.addColorStop(1, `rgba(0,0,0,${1 - c.vignette})`);
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, w, h);
        }
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
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
        <div className="fixed inset-0 z-[600] bg-black flex flex-col overflow-hidden touch-none h-[100dvh] text-white font-sans">
            {showFlashAnim && <div className="fixed inset-0 bg-white z-[1000] animate-flash-out"></div>}

            {/* TOP HUD - Compact */}
            <header className="absolute top-0 left-0 right-0 p-3 flex justify-between items-center z-50">
                <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full border border-white/10 active:scale-90 transition-all text-lg">&times;</button>
                
                {isCounting && (
                    <div className="text-3xl font-black italic animate-pulse tracking-tighter shadow-2xl">
                        {currentCount}
                    </div>
                )}

                <div className="flex gap-2">
                    <button 
                        onClick={() => setFlashMode(prev => prev === 'off' ? 'on' : 'off')}
                        className={`w-9 h-9 flex items-center justify-center backdrop-blur-md rounded-full border border-white/10 transition-all ${flashMode === 'on' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}
                    >
                        {flashMode === 'on' ? '⚡' : '✕'}
                    </button>
                    <button 
                        onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                        className="w-9 h-9 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full border border-white/10"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
            </header>

            {/* PREVIEW CONTAINER */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center overflow-hidden">
                {viewingGallery ? (
                    <div className="absolute inset-0 z-[200] bg-black flex flex-col animate-fade-in">
                        <header className="p-3 flex justify-between items-center bg-zinc-900/50 backdrop-blur-xl border-b border-white/5">
                            <button onClick={() => setViewingGallery(false)} className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Voltar</button>
                            <h3 className="text-[10px] font-black uppercase tracking-widest">{capturedImages.length} fotos</h3>
                            <div className="w-8"></div>
                        </header>
                        <div className="flex-grow overflow-y-auto grid grid-cols-3 gap-0.5 p-0.5 no-scrollbar">
                            {capturedImages.map((img, i) => (
                                <div key={i} className="aspect-[3/4] relative group bg-zinc-900 border border-white/5">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <a href={img} download={`paradise-${i}.jpg`} className="absolute bottom-1.5 right-1.5 bg-white text-black p-1.5 rounded-full scale-75 shadow-xl">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} className="hidden" />
                        <canvas ref={canvasRef} className="w-full h-full object-cover" />
                        
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                            <button 
                                onClick={() => setTimer(prev => prev === 0 ? 3 : prev === 3 ? 10 : 0)}
                                className={`w-9 h-9 rounded-full backdrop-blur-xl border flex items-center justify-center text-[9px] font-black ${timer > 0 ? 'bg-sky-500 border-sky-400' : 'bg-white/10 border-white/10 text-white/40'}`}
                            >
                                {timer > 0 ? `${timer}s` : '⏲️'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* BOTTOM HUD - Redimensionado para celular */}
            <footer className="bg-black/95 backdrop-blur-3xl px-3 pb-8 pt-3 border-t border-white/5 z-50">
                {!viewingGallery ? (
                    <div className="flex flex-col gap-4">
                        {showSettings && (
                            <div className="space-y-4 animate-slide-up bg-zinc-900/60 p-4 rounded-3xl border border-white/5 mb-1">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    {[
                                        { label: 'Grão', key: 'grain' as const },
                                        { label: 'Fade', key: 'fade' as const },
                                        { label: 'Temp', key: 'temp' as const, min: -50, max: 50 },
                                        { label: 'Vignette', key: 'vignette' as const }
                                    ].map(adj => (
                                        <div key={adj.key} className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[8px] font-black uppercase text-zinc-500 tracking-widest">
                                                {adj.label}
                                            </div>
                                            <input 
                                                type="range" 
                                                min={adj.min ?? 0} max={adj.max ?? 1} step="0.01" 
                                                value={configs[activeVibe][adj.key]} 
                                                onChange={e => updateConfig(adj.key, parseFloat(e.target.value))} 
                                                className="w-full accent-white h-0.5 bg-white/10 rounded-full appearance-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Effects Swiper - Compact */}
                        <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1 snap-x snap-mandatory">
                            {Object.values(configs).map((eff: EffectConfig) => (
                                <button
                                    key={eff.id}
                                    onClick={() => setActiveVibe(eff.id)}
                                    className={`flex flex-col items-center shrink-0 snap-center transition-all duration-300 ${activeVibe === eff.id ? 'scale-105 opacity-100' : 'scale-90 opacity-25'}`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border-2 ${activeVibe === eff.id ? 'bg-zinc-900 border-white' : 'bg-zinc-900/50 border-white/5'}`}>
                                        {eff.icon}
                                    </div>
                                    <span className="text-[7px] font-black uppercase mt-1 tracking-tighter text-zinc-500">{eff.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Trigger Row - Adjusted size */}
                        <div className="flex items-center justify-between px-6 pt-1">
                            <button 
                                onClick={() => setViewingGallery(true)}
                                className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center group active:scale-90 transition-all"
                            >
                                {capturedImages.length > 0 ? (
                                    <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover opacity-60" />
                                ) : (
                                    <div className="w-5 h-5 border border-white/20 rounded-md"></div>
                                )}
                            </button>

                            <button 
                                onClick={handleCapture} 
                                className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center p-1.5 active:scale-90 transition-all"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <div className={`w-10 h-10 rounded-full border border-black/5 ${isCounting ? 'animate-ping' : ''}`}></div>
                                </div>
                            </button>

                            <button 
                                onClick={() => setShowSettings(!showSettings)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${showSettings ? 'bg-white text-black border-white' : 'bg-zinc-900 text-white/40 border-white/10'}`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2 animate-slide-up">
                        <button 
                            onClick={() => { setCapturedImages([]); setViewingGallery(false); }}
                            className="flex-1 py-3 bg-zinc-900 text-zinc-500 text-[9px] font-black uppercase tracking-widest rounded-2xl border border-white/5"
                        >
                            Limpar
                        </button>
                        <button 
                            onClick={() => {
                                capturedImages.forEach((img, i) => {
                                    const link = document.createElement('a');
                                    link.download = `neos-${Date.now()}-${i}.jpg`;
                                    link.href = img;
                                    link.click();
                                });
                                onClose();
                            }}
                            className="flex-1 py-3 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all"
                        >
                            Salvar Tudo
                        </button>
                    </div>
                )}
            </footer>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes flash-out { 0% { opacity: 1; } 100% { opacity: 0; } }
                .animate-flash-out { animation: flash-out 0.8s ease-out forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 14px; width: 14px;
                    border-radius: 50%; background: white;
                }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;