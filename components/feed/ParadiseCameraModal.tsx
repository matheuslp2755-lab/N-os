import React, { useState, useRef, useEffect } from 'react';
import { auth, db, doc, updateDoc, serverTimestamp } from '../../firebase';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'memory' | 'analog2k' | 'filmsad' | 'vhs' | 'noir' | 'retro' | 'cybershot' | 'disposable';
type LensDistance = '20cm' | '30cm' | '50cm' | 'auto';

interface VibeConfig {
    id: VibeEffect;
    name: string;
    label: string;
    sub: string;
    color: string;
}

const VIBES: VibeConfig[] = [
    { id: 'disposable', name: 'Disposable', label: 'FUJI 400', sub: 'Single Use', color: 'text-green-400' },
    { id: 'memory', name: 'Nostalgia', label: 'MEMORY', sub: 'Tumblr 2014', color: 'text-amber-200' },
    { id: 'analog2k', name: 'Analog 2k', label: 'CAMCORDER', sub: 'CCD Sensor', color: 'text-emerald-300' },
    { id: 'cybershot', name: 'Cyber-shot', label: 'SONY 2012', sub: 'Digital Retro', color: 'text-sky-300' },
    { id: 'filmsad', name: 'Film Sad', label: 'MOOD', sub: 'Expired 35mm', color: 'text-slate-400' },
    { id: 'vhs', name: 'VHS Soft', label: 'GLITCH', sub: 'Handycam', color: 'text-sky-400' },
    { id: 'retro', name: 'Retro Gold', label: 'VINTAGE', sub: 'Kodak Portra', color: 'text-orange-300' },
    { id: 'noir', name: 'Silent Noir', label: 'SILENT', sub: 'B&W Grain', color: 'text-white' },
];

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect>('disposable');
    const [activeLens, setActiveLens] = useState<LensDistance>('auto');
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [viewingGallery, setViewingGallery] = useState(false);
    const [showAdjustments, setShowAdjustments] = useState(false);
    const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
    const [countdown, setCountdown] = useState<0 | 3 | 10>(0);
    const [isCounting, setIsCounting] = useState(false);
    const [currentCount, setCurrentCount] = useState(0);
    const [handDetectionEnabled, setHandDetectionEnabled] = useState(false);
    const [showFlashAnim, setShowFlashAnim] = useState(false);
    
    // Sliders de Estética Analógica
    const [light, setLight] = useState(1.0);
    const [grain, setGrain] = useState(0.4);
    const [focus, setFocus] = useState(0.5);
    const [color, setColor] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number>(null);
    const lastBrightnessRef = useRef<number>(0);

    const aestheticParams = useRef({ light, grain, focus, color, activeVibe, facingMode, activeLens, flashMode });
    
    useEffect(() => {
        aestheticParams.current = { light, grain, focus, color, activeVibe, facingMode, activeLens, flashMode };
    }, [light, grain, focus, color, activeVibe, facingMode, activeLens, flashMode]);

    const startCamera = async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1920 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                requestRef.current = requestAnimationFrame(renderLoop);
            }
        } catch (err) {
            console.error("Néos Camera Error:", err);
        }
    };

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
            const params = aestheticParams.current;

            ctx.save();
            if (params.facingMode === 'user') {
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0, w, h);
            ctx.restore();

            applyCazzCamAesthetics(ctx, w, h, params);
        }
        requestRef.current = requestAnimationFrame(renderLoop);
    };

    const applyCazzCamAesthetics = (ctx: CanvasRenderingContext2D, w: number, h: number, p: any) => {
        let brightness = p.light;
        let blur = p.focus;
        let contrast = 1.0;
        let saturation = 1.0;
        let blacksLift = 0;
        let dateColor = "#EAB308"; // Amarelo clássico

        // PRESETS ENGINE
        switch (p.activeVibe) {
            case 'disposable':
                contrast = 1.1; saturation = 1.2; blur += 0.4;
                break;
            case 'memory':
                contrast = 0.85; saturation = 0.7; blacksLift = 15;
                break;
            case 'vhs':
                contrast = 1.2; saturation = 0.6; blur += 2.0;
                break;
            case 'noir':
                saturation = 0; contrast = 1.4;
                break;
            case 'retro':
                contrast = 1.05; saturation = 1.1; blacksLift = 10;
                break;
        }

        // 1. Filtros Base
        ctx.globalCompositeOperation = 'source-over';
        const filterStr = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) blur(${blur}px) hue-rotate(${p.color}deg)`;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w; tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.filter = filterStr;
            tempCtx.drawImage(ctx.canvas, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
        }

        // 2. Blacks Lift (Estética de filme lavado)
        if (blacksLift > 0) {
            ctx.fillStyle = `rgba(50, 50, 50, ${blacksLift / 100})`;
            ctx.globalCompositeOperation = 'lighten';
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
        }

        // 3. Grão Orgânico (Noise Dinâmico)
        if (p.grain > 0) {
            ctx.globalAlpha = p.grain * 0.35;
            for (let i = 0; i < 300; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
            }
            ctx.globalAlpha = 1.0;
        }

        // 4. Vinheta Óptica (Suave)
        const grd = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.8);
        grd.addColorStop(0, 'transparent');
        grd.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        // 5. Date Stamp (Estilo CazzCam)
        const now = new Date();
        const dateStr = `'${now.getFullYear().toString().slice(-2)} ${ (now.getMonth()+1).toString().padStart(2,'0') } ${ now.getDate().toString().padStart(2,'0') }`;
        ctx.font = 'bold 32px Courier New, monospace';
        ctx.fillStyle = dateColor;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(dateStr, w - 220, h - 80);
        ctx.shadowBlur = 0;

        // 6. Watermark Minimalista
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillText('NÉOS ANALOG PRO', 40, 60);
    };

    useEffect(() => {
        if (isOpen && !viewingGallery) startCamera();
        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isOpen, facingMode, viewingGallery]);

    const handleCapture = () => {
        if (isCounting) return;
        if (countdown > 0) {
            setIsCounting(true);
            setCurrentCount(countdown);
            const timer = setInterval(() => {
                setCurrentCount(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedImages(prev => [...prev, dataUrl]);
        setIsCounting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-sans h-[100dvh]">
            {showFlashAnim && <div className="fixed inset-0 bg-white z-[1000] animate-flash-out"></div>}

            {/* HUD SUPERIOR - CAZZCAM STYLE */}
            <header className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-50">
                <div className="flex gap-3">
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white">&times;</button>
                    <button 
                        onClick={() => setFlashMode(prev => prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off')}
                        className={`w-10 h-10 flex items-center justify-center backdrop-blur-md rounded-full border border-white/10 transition-all ${flashMode !== 'off' ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/40 text-white/60'}`}
                    >
                        ⚡
                    </button>
                </div>
                
                {isCounting && <div className="text-4xl font-black text-white italic animate-pulse">{currentCount}</div>}

                <div className="flex gap-3">
                    <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
            </header>

            {/* VIEWPORT - SEM BORDAS */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center overflow-hidden">
                {viewingGallery ? (
                    <div className="absolute inset-0 z-[200] bg-black flex flex-col animate-fade-in">
                        <header className="p-4 flex justify-between items-center bg-zinc-900 border-b border-white/5">
                            <button onClick={() => setViewingGallery(false)} className="text-white font-black uppercase text-[10px] tracking-widest">Voltar</button>
                            <h3 className="text-white font-black text-xs uppercase tracking-widest">{capturedImages.length} Capturas</h3>
                            <button onClick={() => setCapturedImages([])} className="text-red-500 text-[10px] font-black uppercase tracking-widest">Limpar</button>
                        </header>
                        <div className="flex-grow overflow-y-auto p-4 grid grid-cols-2 gap-4 no-scrollbar">
                            {capturedImages.map((img, i) => (
                                <div key={i} className="aspect-[3/4] relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <a href={img} download={`neos-analog-${i}.jpg`} className="absolute bottom-3 right-3 bg-white text-black p-3 rounded-full shadow-xl">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={3}/></svg>
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} className="hidden" />
                        <canvas ref={canvasRef} className="w-full h-full object-cover" />
                        
                        {/* SIDEBAR AJUSTES RAPIDOS */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
                             <button 
                                onClick={() => setCountdown(prev => prev === 0 ? 3 : prev === 3 ? 10 : 0)}
                                className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${countdown > 0 ? 'bg-sky-500 text-white border-sky-400' : 'bg-black/40 text-white/40 border-white/5'}`}
                            >
                                <span className="text-[8px] font-black">{countdown ? `${countdown}s` : '⏱'}</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* CONSOLE INFERIOR AJUSTADO PARA MOBILE */}
            <footer className="bg-black px-4 pb-10 pt-4 z-50">
                {!viewingGallery ? (
                    <div className="flex flex-col gap-6">
                        
                        {/* LISTA DE EFEITOS HORIZONTAL - ESTILO CAZZCAM */}
                        <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1 snap-x snap-mandatory">
                            {VIBES.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setActiveVibe(v.id)}
                                    className={`flex flex-col items-center shrink-0 snap-center transition-all duration-300 ${activeVibe === v.id ? 'scale-110 opacity-100' : 'scale-90 opacity-20 grayscale'}`}
                                >
                                    <div className={`w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center border-2 ${activeVibe === v.id ? 'bg-zinc-900 border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-zinc-900/50 border-white/5'}`}>
                                        <span className="text-[7px] font-black uppercase text-white/50">{v.sub}</span>
                                        <span className={`text-[8px] font-black uppercase mt-1 tracking-widest ${activeVibe === v.id ? v.color : 'text-white'}`}>{v.id}</span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase mt-2 text-white/40 tracking-tighter">{v.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* DISPARADOR E AJUSTES */}
                        <div className="flex items-center justify-between px-6">
                            <button 
                                onClick={() => setViewingGallery(true)}
                                className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center group active:scale-95 transition-all"
                            >
                                {capturedImages.length > 0 ? (
                                    <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover opacity-60" />
                                ) : (
                                    <div className="w-6 h-6 border-2 border-white/20 rounded-lg"></div>
                                )}
                            </button>

                            <button 
                                onClick={handleCapture} 
                                className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center p-2 active:scale-90 transition-all"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                    <div className="w-16 h-16 rounded-full border-2 border-black/5"></div>
                                </div>
                            </button>

                            <button 
                                onClick={() => setShowAdjustments(!showAdjustments)}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${showAdjustments ? 'bg-white text-black' : 'bg-zinc-900 text-white/40 border-white/10'}`}
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeWidth={2}/></svg>
                            </button>
                        </div>

                        {/* PAINEL DE AJUSTES FLUTUANTE */}
                        {showAdjustments && (
                            <div className="bg-zinc-900/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 animate-slide-up">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between"><span className="text-[10px] font-black uppercase text-white/40">Exposição</span><span className="text-[10px] text-white">{(light*100).toFixed(0)}%</span></div>
                                        <input type="range" min="0.5" max="1.5" step="0.01" value={light} onChange={e => setLight(parseFloat(e.target.value))} className="accent-white h-1 w-full appearance-none bg-white/10 rounded-full" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between"><span className="text-[10px] font-black uppercase text-white/40">Grão Analógico</span><span className="text-[10px] text-white">{(grain*100).toFixed(0)}%</span></div>
                                        <input type="range" min="0" max="1" step="0.01" value={grain} onChange={e => setGrain(parseFloat(e.target.value))} className="accent-white h-1 w-full appearance-none bg-white/10 rounded-full" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between"><span className="text-[10px] font-black uppercase text-white/40">Soft Focus</span><span className="text-[10px] text-white">{(focus*10).toFixed(1)}</span></div>
                                        <input type="range" min="0" max="5" step="0.1" value={focus} onChange={e => setFocus(parseFloat(e.target.value))} className="accent-white h-1 w-full appearance-none bg-white/10 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-4 w-full animate-slide-up">
                        <button 
                            onClick={() => { setCapturedImages([]); setViewingGallery(false); }} 
                            className="flex-1 py-5 bg-zinc-900 text-white/40 text-[10px] font-black uppercase tracking-widest rounded-3xl border border-white/5"
                        >
                            Reset Session
                        </button>
                        <button 
                            onClick={() => {
                                capturedImages.forEach((img, i) => {
                                    const link = document.createElement('a');
                                    link.download = `neos-analog-${i}.jpg`;
                                    link.href = img;
                                    link.click();
                                });
                                onClose();
                            }}
                            className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-3xl shadow-2xl active:scale-95 transition-all"
                        >
                            Save All
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
                    height: 18px; width: 18px;
                    border-radius: 50%; background: white;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;