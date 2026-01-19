import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'vhs' | 'ccd' | 'cinema' | 'disposable' | 'y2k' | 'polaroid' | 'cyber' | 'noir';

interface VibeConfig {
    id: VibeEffect;
    name: string;
    label: string;
    color: string;
}

const VIBES: VibeConfig[] = [
    { id: 'vhs', name: 'VHS-86', label: 'ANALOG', color: 'text-sky-400' },
    { id: 'ccd', name: 'CCD-04', label: 'DIGITAL', color: 'text-emerald-400' },
    { id: 'cinema', name: '35mm Pro', label: 'CINEMA', color: 'text-amber-500' },
    { id: 'disposable', name: 'Flash 90', label: 'PARTY', color: 'text-orange-500' },
    { id: 'y2k', name: 'GLITCH', label: 'Y2K', color: 'text-pink-500' },
    { id: 'polaroid', name: 'Instant', label: 'RETRO', color: 'text-white' },
    { id: 'cyber', name: 'NEON', label: 'FUTURE', color: 'text-purple-500' },
    { id: 'noir', name: 'Noir', label: 'SILENT', color: 'text-zinc-500' },
];

const CameraIcon = ({ type, active }: { type: VibeEffect; active: boolean }) => {
    const colorClass = active ? "text-white" : "text-zinc-600";
    switch (type) {
        case 'vhs': return <svg className={`w-8 h-8 ${colorClass}`} viewBox="0 0 24 24" fill="currentColor"><path d="M4 5v14h16V5H4zm14 12H6V7h12v10zM17 9h-2v2h2V9z"/></svg>;
        case 'ccd': return <svg className={`w-8 h-8 ${colorClass}`} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>;
        case 'cinema': return <svg className={`w-8 h-8 ${colorClass}`} viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>;
        case 'cyber': return <svg className={`w-8 h-8 ${colorClass}`} viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.92 6.92 0 0119 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-1.93.78-3.68 2.04-4.95l-1.42-1.42z"/></svg>;
        default: return <svg className={`w-8 h-8 ${colorClass}`} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="black"/></svg>;
    }
};

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect>('vhs');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    const [showAdjustments, setShowAdjustments] = useState(false);
    
    // Sliders de Estética
    const [light, setLight] = useState(1.1);
    const [color, setColor] = useState(0); 
    const [grain, setGrain] = useState(0.4);
    const [focus, setFocus] = useState(0.3);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number>(null);

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
            const constraints = {
                video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
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

            ctx.save();
            if (facingMode === 'user') { ctx.translate(w, 0); ctx.scale(-1, 1); }
            ctx.drawImage(video, 0, 0, w, h);
            ctx.restore();

            applyMasterEffects(ctx, w, h);
        }
        requestRef.current = requestAnimationFrame(renderLoop);
    };

    const applyMasterEffects = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // 1. Ajustes de Base (Sliders)
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = `brightness(${light}) hue-rotate(${color}deg) blur(${focus}px)`;
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';

        // 2. Grão Analógico Realista
        if (grain > 0) {
            ctx.globalAlpha = grain * 0.4;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 400; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        }

        // 3. Motores de Estética por Vibe
        switch (activeVibe) {
            case 'vhs':
                ctx.fillStyle = 'rgba(0, 255, 255, 0.03)';
                for (let i = 0; i < h; i += 8) ctx.fillRect(0, i, w, 1);
                ctx.font = 'black 32px monospace';
                ctx.fillStyle = '#00f2ff';
                ctx.fillText('REC 00:24:12', 50, h - 100);
                break;
            case 'cyber':
                const g = ctx.createLinearGradient(0, 0, w, h);
                g.addColorStop(0, 'rgba(255, 0, 255, 0.15)');
                g.addColorStop(1, 'rgba(0, 255, 255, 0.15)');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
                ctx.globalCompositeOperation = 'screen';
                ctx.filter = 'blur(10px)';
                ctx.drawImage(ctx.canvas, 0, 0);
                ctx.globalCompositeOperation = 'source-over';
                ctx.filter = 'none';
                break;
            case 'polaroid':
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(0, 0, w, h);
                ctx.filter = 'contrast(0.8) saturate(0.9)';
                ctx.drawImage(ctx.canvas, 0, 0);
                ctx.filter = 'none';
                break;
        }

        // 4. Vinheta e Moldura Óptica
        const vin = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.85);
        vin.addColorStop(0, 'rgba(0,0,0,0)');
        vin.addColorStop(1, 'rgba(0,0,0,0.5)');
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
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.95));
        stopCamera();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-mono selection:bg-sky-500">
            {/* HUD Superior */}
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none">
                <div className="flex flex-col gap-1 pointer-events-auto">
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-black/20 backdrop-blur-xl rounded-full border border-white/10 text-white/60 active:scale-90 transition-transform">&times;</button>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-1 rounded-full border border-white/5">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                        <span className="text-[10px] text-white font-black uppercase tracking-[0.2em]">Live Render</span>
                    </div>
                </div>

                <div className="flex flex-col gap-4 pointer-events-auto">
                    <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="w-12 h-12 flex items-center justify-center bg-black/20 backdrop-blur-xl rounded-full border border-white/10 text-white/60 active:rotate-180 transition-all duration-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={() => setShowAdjustments(!showAdjustments)} className={`w-12 h-12 flex items-center justify-center backdrop-blur-xl rounded-full border border-white/10 transition-all ${showAdjustments ? 'bg-white text-black' : 'bg-black/20 text-white/60'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    </button>
                </div>
            </header>

            {/* Viewfinder Main */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center p-2 sm:p-4">
                <div className="w-full h-full relative overflow-hidden rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                    <video ref={videoRef} className="hidden" />
                    <canvas ref={canvasRef} className={`w-full h-full object-cover transition-transform duration-700 ${capturedImage ? 'hidden' : 'scale-105'}`} />
                    {capturedImage && <img src={capturedImage} className="w-full h-full object-cover animate-fade-in" />}
                    
                    {/* Efeito de Noise Constante no Visor */}
                    {!capturedImage && <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://media.giphy.com/media/oEI9uWUqWMrBK/giphy.gif')] mix-blend-overlay"></div>}
                    
                    {showFlash && <div className="absolute inset-0 bg-white z-[100] animate-pulse"></div>}

                    {/* Sliders Glass Panel */}
                    {!capturedImage && showAdjustments && (
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-8 bg-black/40 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 z-[60] animate-slide-right shadow-2xl">
                            <div className="flex flex-col gap-3">
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Luz</span>
                                <input type="range" min="0.5" max="1.8" step="0.01" value={light} onChange={e => setLight(parseFloat(e.target.value))} className="accent-white h-1 w-28 appearance-none bg-white/10 rounded-full" />
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Cor</span>
                                <input type="range" min="-180" max="180" step="1" value={color} onChange={e => setColor(parseFloat(e.target.value))} className="accent-sky-500 h-1 w-28 appearance-none bg-white/10 rounded-full" />
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Grain</span>
                                <input type="range" min="0" max="1" step="0.01" value={grain} onChange={e => setGrain(parseFloat(e.target.value))} className="accent-zinc-400 h-1 w-28 appearance-none bg-white/10 rounded-full" />
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Focus</span>
                                <input type="range" min="0" max="4" step="0.1" value={focus} onChange={e => setFocus(parseFloat(e.target.value))} className="accent-white/40 h-1 w-28 appearance-none bg-white/10 rounded-full" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Control Station */}
            <footer className="bg-zinc-950 pt-4 pb-12 px-6 z-50 flex flex-col items-center gap-6">
                {!capturedImage ? (
                    <>
                        {/* Swipe de Vibes */}
                        <div className="w-full relative group">
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

                        {/* Oburador Néos Core */}
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
                            className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-[2rem] text-center shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
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
                .animate-fade-in { animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slide-right { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
                .animate-slide-right { animation: slide-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;