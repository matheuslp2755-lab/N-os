import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'vhs' | 'ccd' | 'film35' | 'polaroid' | 'y2k' | 'cinema' | 'm6' | 'noir';

interface VibeConfig {
    id: VibeEffect;
    name: string;
    label: string;
    sub: string;
    color: string;
}

const VIBES: VibeConfig[] = [
    { id: 'vhs', name: 'VHS-86', label: 'ANALOG', sub: 'Handycam', color: 'text-sky-400' },
    { id: 'ccd', name: 'CCD-04', label: 'DIGITAL', sub: 'Cyber-shot', color: 'text-emerald-400' },
    { id: 'film35', name: '35mm Pro', label: 'CINEMA', sub: 'Leica M6', color: 'text-amber-500' },
    { id: 'polaroid', name: 'Instant', label: 'RETRO', sub: 'OneStep', color: 'text-zinc-200' },
    { id: 'y2k', name: 'GLITCH', label: 'Y2K', sub: 'Bloggie', color: 'text-pink-500' },
    { id: 'cinema', name: 'Panavision', label: 'WIDE', sub: 'Anamorphic', color: 'text-indigo-400' },
    { id: 'm6', name: 'M6 Gold', label: 'VINTAGE', sub: 'Gold 200', color: 'text-yellow-600' },
    { id: 'noir', name: 'Noir', label: 'SILENT', sub: 'B&W Film', color: 'text-white' },
];

const CameraIcon = ({ type, active }: { type: VibeEffect; active: boolean }) => {
    const colorClass = active ? "text-white scale-110" : "text-zinc-600 grayscale opacity-40";
    switch (type) {
        case 'vhs': return <svg className={`w-10 h-10 transition-all duration-300 ${colorClass}`} viewBox="0 0 24 24" fill="currentColor"><path d="M4 5v14h16V5H4zm14 12H6V7h12v10zM17 9h-2v2h2V9z"/></svg>;
        case 'ccd': return <svg className={`w-10 h-10 transition-all duration-300 ${colorClass}`} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>;
        case 'film35': return <svg className={`w-10 h-10 transition-all duration-300 ${colorClass}`} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>;
        default: return <svg className={`w-10 h-10 transition-all duration-300 ${colorClass}`} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="black"/></svg>;
    }
};

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect>('vhs');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [showAdjustments, setShowAdjustments] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    
    // Sliders de Estética (Estados que disparam re-render do canvas)
    const [light, setLight] = useState(1.1);
    const [color, setColor] = useState(0); 
    const [grain, setGrain] = useState(0.4);
    const [focus, setFocus] = useState(0.3);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number>(null);

    // Referências persistentes para os sliders usarem no loop de renderização sem stale closure
    const aestheticParams = useRef({ light, color, grain, focus, activeVibe, facingMode });
    
    useEffect(() => {
        aestheticParams.current = { light, color, grain, focus, activeVibe, facingMode };
    }, [light, color, grain, focus, activeVibe, facingMode]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    const startCamera = async () => {
        stopCamera();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                requestRef.current = requestAnimationFrame(renderLoop);
            }
        } catch (err) {
            console.error("Paradise Start Error:", err);
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

            // 1. Desenhar frame limpo (com flip se frontal)
            ctx.save();
            if (params.facingMode === 'user') {
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0, w, h);
            ctx.restore();

            // 2. Aplicar Pipeline de Filtros Reais
            applyPixelFilters(ctx, w, h, params);
        }
        requestRef.current = requestAnimationFrame(renderLoop);
    };

    const applyPixelFilters = (ctx: CanvasRenderingContext2D, w: number, h: number, p: any) => {
        // Camada 1: Brilho, Cor (Hue) e Soft Focus (Blur)
        // Isso altera a renderização dos próximos draws
        ctx.globalCompositeOperation = 'source-over';
        
        // Aplicamos os ajustes básicos via filter do canvas para performance
        const basicFilters = `brightness(${p.light}) hue-rotate(${p.color}deg) blur(${p.focus}px)`;
        
        // Criar um canvas temporário para aplicar o filtro sem recursão infinita
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.filter = basicFilters;
            tempCtx.drawImage(ctx.canvas, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
        }

        // Camada 2: Grão Analógico (Pixels randômicos)
        if (p.grain > 0) {
            ctx.globalAlpha = p.grain * 0.35;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 800; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        }

        // Camada 3: Motores de Estética Específicos
        switch (p.activeVibe) {
            case 'vhs':
                // Scanlines reais
                ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
                for (let i = 0; i < h; i += 6) ctx.fillRect(0, i, w, 1);
                // Data digital cyan
                ctx.font = 'bold 36px monospace';
                ctx.fillStyle = '#00f2ff';
                ctx.shadowColor = '#00f2ff';
                ctx.shadowBlur = 5;
                ctx.fillText(`REC ${new Date().toLocaleTimeString()}`, 50, h - 100);
                ctx.shadowBlur = 0;
                break;
            case 'ccd':
                // Bloom digital e saturação
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(0, 0, w, h);
                ctx.globalCompositeOperation = 'source-over';
                break;
            case 'polaroid':
                // Wash out (Pretos lavados)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(0,0,w,h);
                ctx.globalCompositeOperation = 'hard-light';
                ctx.fillStyle = 'rgba(100, 50, 0, 0.05)';
                ctx.fillRect(0,0,w,h);
                ctx.globalCompositeOperation = 'source-over';
                break;
            case 'y2k':
                // Aberração cromática simulada por deslocamento
                ctx.globalAlpha = 0.5;
                ctx.drawImage(ctx.canvas, 4, 0);
                ctx.globalAlpha = 1.0;
                break;
        }

        // Camada 4: Vinheta Óptica
        const vin = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.9);
        vin.addColorStop(0, 'rgba(0,0,0,0)');
        vin.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = vin;
        ctx.fillRect(0, 0, w, h);
    };

    useEffect(() => {
        if (isOpen && !capturedImage) startCamera();
        return () => stopCamera();
    }, [isOpen, facingMode, capturedImage]);

    const handleCapture = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 100);

        // Capturamos exatamente o que está no canvas (o preview com efeitos)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(dataUrl);
        stopCamera();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-mono">
            {/* HUD Superior */}
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none">
                <div className="pointer-events-auto">
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white active:scale-90 transition-all">&times;</button>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                        <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]"></div>
                        <span className="text-[10px] text-white font-black uppercase tracking-[0.2em]">Néos Engine 2.0</span>
                    </div>
                </div>

                <div className="flex flex-col gap-4 pointer-events-auto">
                    <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white active:rotate-180 transition-all duration-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={() => setShowAdjustments(!showAdjustments)} className={`w-12 h-12 flex items-center justify-center backdrop-blur-xl rounded-full border border-white/10 transition-all ${showAdjustments ? 'bg-sky-500 text-white' : 'bg-black/40 text-white/60'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    </button>
                </div>
            </header>

            {/* Viewfinder Main */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                <video ref={videoRef} className="hidden" />
                <canvas ref={canvasRef} className={`w-full h-full object-cover transition-transform duration-700 ${capturedImage ? 'hidden' : 'scale-100'}`} />
                {capturedImage && <img src={capturedImage} className="w-full h-full object-cover animate-fade-in" />}
                
                {showFlash && <div className="absolute inset-0 bg-white z-[100] animate-pulse"></div>}

                {/* Adjustments Panel (Glassmorphism) */}
                {!capturedImage && showAdjustments && (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-8 bg-black/40 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/10 z-[60] animate-slide-right shadow-2xl">
                        <div className="flex flex-col gap-3">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Luz</span>
                            <input type="range" min="0.5" max="1.8" step="0.01" value={light} onChange={e => setLight(parseFloat(e.target.value))} className="accent-white h-1 w-28 appearance-none bg-white/10 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Cor</span>
                            <input type="range" min="-180" max="180" step="1" value={color} onChange={e => setColor(parseFloat(e.target.value))} className="accent-sky-500 h-1 w-28 appearance-none bg-white/10 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Grão</span>
                            <input type="range" min="0" max="1" step="0.01" value={grain} onChange={e => setGrain(parseFloat(e.target.value))} className="accent-zinc-400 h-1 w-28 appearance-none bg-white/10 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Foco</span>
                            <input type="range" min="0" max="8" step="0.1" value={focus} onChange={e => setFocus(parseFloat(e.target.value))} className="accent-indigo-400 h-1 w-28 appearance-none bg-white/10 rounded-full" />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Control Station */}
            <footer className="bg-zinc-950 pt-4 pb-12 px-6 z-50 flex flex-col items-center gap-6 border-t border-white/5">
                {!capturedImage ? (
                    <>
                        <div className="w-full relative">
                            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-12 py-2 touch-pan-x">
                                {VIBES.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setActiveVibe(v.id)}
                                        className={`flex flex-col items-center gap-2 shrink-0 snap-center transition-all duration-500 ${activeVibe === v.id ? 'scale-110' : 'opacity-20 grayscale'}`}
                                    >
                                        <div className={`w-20 h-24 rounded-[2rem] flex flex-col items-center justify-center border-2 transition-all ${activeVibe === v.id ? 'bg-zinc-900 border-white shadow-[0_0_30px_rgba(255,255,255,0.15)]' : 'bg-zinc-900/50 border-white/5'}`}>
                                            <CameraIcon type={v.id} active={activeVibe === v.id} />
                                            <span className={`text-[8px] font-black uppercase tracking-tighter mt-2 ${activeVibe === v.id ? 'text-white' : 'text-zinc-600'}`}>{v.label}</span>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${activeVibe === v.id ? v.color : 'text-zinc-700'}`}>{v.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <button 
                                onClick={handleCapture} 
                                className="w-24 h-24 rounded-full border-2 border-white/20 flex items-center justify-center p-2 group active:scale-95 transition-all"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                                    <div className="w-16 h-16 rounded-full border-2 border-black/5 animate-pulse"></div>
                                </div>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex gap-4 w-full max-w-sm animate-slide-up">
                        <button 
                            onClick={() => { setCapturedImage(null); startCamera(); }} 
                            className="flex-1 py-5 bg-zinc-900 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] rounded-[2rem] border border-white/5 active:scale-95 transition-all"
                        >
                            Reset
                        </button>
                        <a 
                            href={capturedImage} 
                            download={`neos-paradise-${Date.now()}.jpg`} 
                            className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-[2rem] text-center shadow-xl active:scale-95 transition-all"
                        >
                            Export
                        </a>
                    </div>
                )}
            </footer>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
                @keyframes slide-right { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
                .animate-slide-right { animation: slide-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 20px;
                    width: 20px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                    box-shadow: 0 0 15px rgba(0,0,0,0.5);
                    border: 2px solid #000;
                }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;