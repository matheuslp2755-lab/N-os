import React, { useState, useRef, useEffect, useCallback } from 'react';
import { auth, db, doc, updateDoc, serverTimestamp } from '../../firebase';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'vhs2003' | 'digicam' | 'ccdcool' | 'eightmm' | 'asteric' | 'y2kmirror' | 'polaroid' | 'lowfinight' | 'tumblr2009' | 'aestheticy2k' | 'digicam2006' | 'myspaceflash';

interface EffectConfig {
    id: VibeEffect;
    name: string;
    label: string;
    grain: number;
    blur: number;
    temp: number;
    glow: number;
    saturation: number;
    contrast: number;
    tint: string;
}

const PRESETS: Record<VibeEffect, EffectConfig> = {
    vhs2003: { id: 'vhs2003', name: 'VHS 2003', label: 'TAPE', grain: 0.6, blur: 1.5, temp: 5, glow: 0.2, saturation: 0.7, contrast: 1.2, tint: 'rgba(0,0,50,0.05)' },
    digicam: { id: 'digicam', name: 'Digicam', label: 'SONY', grain: 0.2, blur: 0.1, temp: 0, glow: 0.4, saturation: 1.3, contrast: 1.4, tint: 'rgba(255,255,255,0.05)' },
    ccdcool: { id: 'ccdcool', name: 'CCD Cool', label: 'DIGI', grain: 0.1, blur: 0.3, temp: -25, glow: 0.1, saturation: 1.1, contrast: 1.1, tint: 'rgba(0,100,255,0.08)' },
    eightmm: { id: 'eightmm', name: '8mm Reel', label: 'FILM', grain: 0.8, blur: 0.8, temp: 15, glow: 0.3, saturation: 0.6, contrast: 0.9, tint: 'rgba(100,50,0,0.1)' },
    asteric: { id: 'asteric', name: 'Asteric', label: 'SOFT', grain: 0.1, blur: 2.0, temp: 10, glow: 0.8, saturation: 1.2, contrast: 0.8, tint: 'rgba(255,100,200,0.1)' },
    y2kmirror: { id: 'y2kmirror', name: 'Y2K Mirror', label: 'CYBER', grain: 0.4, blur: 0.5, temp: -10, glow: 0.3, saturation: 0.8, contrast: 0.7, tint: 'rgba(0,255,255,0.05)' },
    polaroid: { id: 'polaroid', name: 'Polaroid', label: 'INSTAX', grain: 0.3, blur: 0.6, temp: 0, glow: 0.2, saturation: 0.9, contrast: 0.8, tint: 'rgba(255,255,255,0.1)' },
    lowfinight: { id: 'lowfinight', name: 'Low-Fi', label: 'NIGHT', grain: 0.9, blur: 1.8, temp: 0, glow: 0.5, saturation: 1.5, contrast: 1.5, tint: 'rgba(128,0,255,0.15)' },
    // Novos efeitos
    tumblr2009: { id: 'tumblr2009', name: 'Tumblr 2009', label: 'SOFT', grain: 0.4, blur: 0.4, temp: -5, glow: 0.1, saturation: 0.7, contrast: 0.9, tint: 'rgba(100,100,120,0.1)' },
    aestheticy2k: { id: 'aestheticy2k', name: 'Aesthetic Y2K', label: 'PURE', grain: 0.15, blur: 0.8, temp: 5, glow: 0.6, saturation: 0.85, contrast: 1.1, tint: 'rgba(255,255,255,0.02)' },
    digicam2006: { id: 'digicam2006', name: 'Digicam 2006', label: 'AUTO', grain: 0.3, blur: 0.2, temp: -15, glow: 0.2, saturation: 1.2, contrast: 1.3, tint: 'rgba(0,50,150,0.05)' },
    myspaceflash: { id: 'myspaceflash', name: 'MySpace Flash', label: 'RAW', grain: 0.5, blur: 0.1, temp: 10, glow: 0.5, saturation: 1.4, contrast: 1.6, tint: 'rgba(255,200,150,0.08)' }
};

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect>('vhs2003');
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [viewingGallery, setViewingGallery] = useState(false);
    const [showAdjustments, setShowAdjustments] = useState(false);
    const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
    const [timer, setTimer] = useState<0 | 3 | 10>(0);
    const [isCounting, setIsCounting] = useState(false);
    const [currentCount, setCurrentCount] = useState(0);
    const [showFlashAnim, setShowFlashAnim] = useState(false);

    const [customConfigs, setCustomConfigs] = useState<Record<VibeEffect, EffectConfig>>(PRESETS);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameId = useRef<number | null>(null);

    const renderState = useRef({ activeVibe, customConfigs, facingMode });
    useEffect(() => {
        renderState.current = { activeVibe, customConfigs, facingMode };
    }, [activeVibe, customConfigs, facingMode]);

    const startCamera = useCallback(async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1920 } },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                if (!frameId.current) {
                    frameId.current = requestAnimationFrame(renderLoop);
                }
            }
        } catch (err) {
            console.error("Paradise Camera Error:", err);
        }
    }, [facingMode]);

    const renderLoop = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (video && canvas && video.readyState >= 2) {
            const ctx = canvas.getContext('2d', { alpha: false });
            if (ctx) {
                const { activeVibe: currentVibe, customConfigs: configs, facingMode: fMode } = renderState.current;
                const config = configs[currentVibe];

                const w = canvas.width = video.videoWidth;
                const h = canvas.height = video.videoHeight;
                
                ctx.save();
                if (fMode === 'user') {
                    ctx.translate(w, 0);
                    ctx.scale(-1, 1);
                }
                ctx.drawImage(video, 0, 0, w, h);
                ctx.restore();

                applyAestheticPipeline(ctx, w, h, config);
            }
        }
        frameId.current = requestAnimationFrame(renderLoop);
    };

    const applyAestheticPipeline = (ctx: CanvasRenderingContext2D, w: number, h: number, c: EffectConfig) => {
        const brightness = 1.05;
        ctx.filter = `brightness(${brightness}) contrast(${c.contrast}) saturate(${c.saturation}) hue-rotate(${c.temp}deg) blur(${c.blur}px)`;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w; tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.drawImage(ctx.canvas, 0, 0);
            ctx.filter = 'none';
            ctx.drawImage(tempCanvas, 0, 0);
        }

        if (c.glow > 0) {
            ctx.save();
            ctx.globalAlpha = c.glow * 0.5;
            ctx.globalCompositeOperation = 'screen';
            ctx.filter = `blur(${15 * c.glow}px) brightness(1.2)`;
            ctx.drawImage(ctx.canvas, 0, 0);
            ctx.restore();
        }

        if (c.grain > 0) {
            ctx.save();
            ctx.globalAlpha = c.grain * 0.4;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 200; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
            }
            ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = c.tint;
        ctx.globalAlpha = 1.0;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        const now = new Date();
        const dateStr = `'${now.getFullYear().toString().slice(-2)} ${ (now.getMonth()+1).toString().padStart(2,'0') } ${ now.getDate().toString().padStart(2,'0') }`;
        ctx.font = 'bold 32px monospace';
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(dateStr, w - 220, h - 80);
        ctx.shadowBlur = 0;

        const grad = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.85);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    };

    useEffect(() => {
        if (isOpen && !viewingGallery) startCamera();
        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (frameId.current) cancelAnimationFrame(frameId.current);
            frameId.current = null;
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

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.save();
            ctx.font = '16px monospace';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillText('Powered by Néos', 60, canvas.height - 80);
            ctx.restore();
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImages(prev => [...prev, dataUrl]);
        setIsCounting(false);
    };

    const updateAdjustment = (key: keyof EffectConfig, value: number) => {
        setCustomConfigs(prev => ({
            ...prev,
            [activeVibe]: { ...prev[activeVibe], [key]: value }
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col overflow-hidden touch-none h-[100dvh] font-sans text-white">
            {showFlashAnim && <div className="fixed inset-0 bg-white z-[1000] animate-flash-out"></div>}

            <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50">
                <div className="flex gap-2">
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 active:scale-90 transition-all text-xl">&times;</button>
                    <button 
                        onClick={() => setFlashMode(prev => prev === 'off' ? 'on' : 'off')}
                        className={`w-10 h-10 flex items-center justify-center backdrop-blur-xl rounded-full border border-white/10 transition-all ${flashMode === 'on' ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/40 text-white/60'}`}
                    >
                        ⚡
                    </button>
                </div>
                
                {isCounting && <div className="text-4xl font-black italic animate-pulse shadow-2xl tracking-tighter">{currentCount}</div>}

                <button 
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 active:scale-90 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </header>

            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center overflow-hidden">
                {viewingGallery ? (
                    <div className="absolute inset-0 z-[200] bg-black flex flex-col animate-fade-in">
                        <header className="p-4 flex justify-between items-center bg-zinc-900/50 backdrop-blur-xl border-b border-white/5">
                            <button onClick={() => setViewingGallery(false)} className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Câmera</button>
                            <h3 className="text-xs font-black uppercase tracking-widest">{capturedImages.length} Capturas</h3>
                            <button onClick={() => setCapturedImages([])} className="text-red-500 text-[10px] font-black uppercase">Limpar</button>
                        </header>
                        <div className="flex-grow overflow-y-auto grid grid-cols-3 gap-0.5 p-0.5 no-scrollbar">
                            {capturedImages.map((img, i) => (
                                <div key={i} className="aspect-[3/4] relative group bg-zinc-900 border border-white/5">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <a href={img} download={`paradise-${i}.jpg`} className="absolute bottom-2 right-2 bg-white text-black p-2 rounded-full scale-75 opacity-80 shadow-xl">
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
                        
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
                            <button 
                                onClick={() => setTimer(prev => prev === 0 ? 3 : prev === 3 ? 10 : 0)}
                                className={`w-10 h-10 rounded-full backdrop-blur-xl border flex items-center justify-center text-[10px] font-black transition-all ${timer > 0 ? 'bg-sky-500 border-sky-400' : 'bg-black/40 border-white/10 text-white/40'}`}
                            >
                                {timer > 0 ? `${timer}s` : '⏲️'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <footer className="bg-black/95 backdrop-blur-3xl px-4 pb-10 pt-4 border-t border-white/5 z-50">
                {!viewingGallery ? (
                    <div className="flex flex-col gap-6">
                        
                        {showAdjustments && (
                            <div className="space-y-5 animate-slide-up bg-zinc-900/60 p-5 rounded-[2.5rem] border border-white/5">
                                {[
                                    { label: 'Intensidade Grão', key: 'grain' as const, max: 1 },
                                    { label: 'Bloom Glow', key: 'glow' as const, max: 1 },
                                    { label: 'Contraste', key: 'contrast' as const, max: 2, min: 0.5 },
                                    { label: 'Nitidez (Blur)', key: 'blur' as const, max: 10, min: 0 }
                                ].map(adj => (
                                    <div key={adj.key} className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[8px] font-black uppercase text-zinc-500 tracking-widest">
                                            {adj.label} <span className="text-white">{(customConfigs[activeVibe][adj.key] * 10).toFixed(1)}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min={adj.min ?? 0} max={adj.max} step="0.01" 
                                            value={customConfigs[activeVibe][adj.key]} 
                                            onChange={e => updateAdjustment(adj.key, parseFloat(e.target.value))} 
                                            className="w-full accent-white h-0.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-4 overflow-x-auto no-scrollbar py-1 snap-x snap-mandatory">
                            {(Object.values(customConfigs) as EffectConfig[]).map((eff) => (
                                <button
                                    key={eff.id}
                                    onClick={() => {
                                        setActiveVibe(eff.id);
                                    }}
                                    onContextMenu={(e) => { e.preventDefault(); setShowAdjustments(!showAdjustments); }}
                                    className={`flex flex-col items-center shrink-0 snap-center transition-all duration-300 ${activeVibe === eff.id ? 'scale-110 opacity-100' : 'scale-90 opacity-20 grayscale'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-colors ${activeVibe === eff.id ? 'bg-zinc-900 border-white shadow-[0_0_25px_rgba(255,255,255,0.15)]' : 'bg-zinc-900/50 border-white/5'}`}>
                                        <span className="text-[7px] font-black uppercase text-white/40 tracking-tighter">{eff.label}</span>
                                        <span className={`text-[8px] font-black uppercase mt-1 tracking-widest ${activeVibe === eff.id ? 'text-white' : 'text-zinc-600'}`}>00{(Object.values(customConfigs) as EffectConfig[]).indexOf(eff)+1}</span>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase mt-2 tracking-tighter transition-colors ${activeVibe === eff.id ? 'text-white' : 'text-zinc-500'}`}>{eff.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center justify-between px-6">
                            <button 
                                onClick={() => setViewingGallery(true)}
                                className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center group active:scale-90 transition-all shadow-inner"
                            >
                                {capturedImages.length > 0 ? (
                                    <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover opacity-60" />
                                ) : (
                                    <div className="w-6 h-6 border-2 border-white/20 rounded-lg group-hover:border-white/40 transition-colors"></div>
                                )}
                            </button>

                            <button 
                                onClick={handleCapture} 
                                className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center p-1.5 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <div className={`w-12 h-12 rounded-full border border-black/5 ${isCounting ? 'animate-ping' : ''}`}></div>
                                </div>
                            </button>

                            <button 
                                onClick={() => setShowAdjustments(!showAdjustments)}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${showAdjustments ? 'bg-white text-black border-white shadow-lg shadow-white/20' : 'bg-zinc-900 text-white/40 border-white/10'}`}
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2 animate-slide-up">
                        <button 
                            onClick={() => { setCapturedImages([]); setViewingGallery(false); }}
                            className="flex-1 py-4 bg-zinc-900 text-zinc-500 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 active:scale-95"
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
                            className="flex-1 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-2xl active:scale-95 transition-all"
                        >
                            Salvar {capturedImages.length} Fotos
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
                    height: 16px; width: 16px;
                    border-radius: 50%; background: white;
                    box-shadow: 0 0 15px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;