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
    
    // Aesthetic Controls
    const [light, setLight] = useState(1.05);
    const [color, setColor] = useState(0); 
    const [grain, setGrain] = useState(0.45);
    const [focus, setFocus] = useState(0.5);

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
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                requestRef.current = requestAnimationFrame(renderFrame);
            }
        } catch (err) {
            console.error("Camera Error:", err);
        }
    };

    const renderFrame = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
            requestRef.current = requestAnimationFrame(renderFrame);
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

            applyProAesthetics(ctx, w, h);
        }
        requestRef.current = requestAnimationFrame(renderFrame);
    };

    const applyProAesthetics = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Base Adjustments (Sliders)
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = `brightness(${light}) hue-rotate(${color}deg) blur(${focus}px)`;
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';

        // High Fidelity Grain
        if (grain > 0) {
            ctx.globalAlpha = grain * 0.45;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 600; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        }

        // Effect Specific Engine
        switch (activeVibe) {
            case 'vhs':
                // Scanlines & Magenta distortion
                ctx.fillStyle = 'rgba(255, 0, 255, 0.02)';
                for (let i = 0; i < h; i += 6) ctx.fillRect(0, i, w, 1);
                ctx.font = 'bold 36px monospace';
                ctx.fillStyle = '#00f2ff';
                ctx.fillText(`PLAY ${new Date().toLocaleTimeString()}`, 60, h - 120);
                break;
            case 'ccd':
                // Overexposed Bloom
                ctx.globalCompositeOperation = 'screen';
                ctx.filter = 'blur(12px) contrast(1.2) brightness(1.1)';
                ctx.globalAlpha = 0.2;
                ctx.drawImage(ctx.canvas, 0, 0);
                ctx.globalAlpha = 1.0;
                ctx.globalCompositeOperation = 'source-over';
                ctx.filter = 'none';
                break;
            case 'cinema':
                // Anamorphic Leaks
                const grd = ctx.createLinearGradient(0, h/2, w, h/2);
                grd.addColorStop(0, 'rgba(0, 50, 255, 0.1)');
                grd.addColorStop(0.5, 'transparent');
                grd.addColorStop(1, 'rgba(0, 50, 255, 0.1)');
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, w, h);
                break;
            case 'm6':
                // Kodak Gold Warmth
                ctx.fillStyle = 'rgba(255, 180, 0, 0.12)';
                ctx.fillRect(0, 0, w, h);
                ctx.filter = 'contrast(1.1) saturate(1.2)';
                ctx.drawImage(ctx.canvas, 0, 0);
                ctx.filter = 'none';
                break;
            case 'noir':
                ctx.filter = 'grayscale(1) contrast(1.4) brightness(0.9)';
                ctx.drawImage(ctx.canvas, 0, 0);
                ctx.filter = 'none';
                break;
        }

        // Pro Vignette
        const vin = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.85);
        vin.addColorStop(0, 'transparent');
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
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.95));
        stopCamera();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-sans">
            {/* UI Overlay: HUD */}
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none">
                <div className="flex flex-col gap-3 pointer-events-auto">
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white active:scale-90 transition-all">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5}/></svg>
                    </button>
                </div>

                <div className="flex flex-col items-center gap-1 opacity-60">
                    <div className="flex items-center gap-2 bg-black/40 px-4 py-1 rounded-full border border-white/5">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                        <span className="text-[10px] text-white font-black uppercase tracking-[0.3em]">REC</span>
                    </div>
                </div>

                <div className="flex flex-col gap-4 pointer-events-auto">
                    <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white active:rotate-180 transition-all duration-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth={2}/></svg>
                    </button>
                    <button onClick={() => setShowAdjustments(!showAdjustments)} className={`w-12 h-12 flex items-center justify-center backdrop-blur-xl rounded-full border border-white/10 transition-all ${showAdjustments ? 'bg-sky-500 text-white' : 'bg-black/40 text-white'}`}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeWidth={2}/></svg>
                    </button>
                </div>
            </header>

            {/* Main Viewfinder */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                <video ref={videoRef} className="hidden" />
                <canvas ref={canvasRef} className={`w-full h-full object-cover transition-all duration-1000 ${capturedImage ? 'hidden' : 'scale-[1.02]'}`} />
                {capturedImage && <img src={capturedImage} className="w-full h-full object-cover animate-fade-in" />}
                
                {showFlash && <div className="absolute inset-0 bg-white z-[100] animate-pulse"></div>}

                {/* Adjustments Panel (Glassmorphism) */}
                {!capturedImage && showAdjustments && (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-10 bg-black/40 backdrop-blur-[40px] p-8 rounded-[3rem] border border-white/10 z-[60] animate-slide-right shadow-2xl">
                        <div className="flex flex-col gap-4">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Luz</span>
                            <input type="range" min="0.5" max="1.8" step="0.01" value={light} onChange={e => setLight(parseFloat(e.target.value))} className="accent-white h-1.5 w-32 appearance-none bg-white/10 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Cor</span>
                            <input type="range" min="-180" max="180" step="1" value={color} onChange={e => setColor(parseFloat(e.target.value))} className="accent-sky-500 h-1.5 w-32 appearance-none bg-white/10 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Grão</span>
                            <input type="range" min="0" max="1" step="0.01" value={grain} onChange={e => setGrain(parseFloat(e.target.value))} className="accent-zinc-300 h-1.5 w-32 appearance-none bg-white/10 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Foco</span>
                            <input type="range" min="0" max="5" step="0.1" value={focus} onChange={e => setFocus(parseFloat(e.target.value))} className="accent-white/20 h-1.5 w-32 appearance-none bg-white/10 rounded-full" />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Console */}
            <footer className="bg-zinc-950 pt-6 pb-12 px-6 z-50 border-t border-white/5 flex flex-col items-center gap-10">
                {!capturedImage ? (
                    <>
                        {/* Vibe Selection Horizontal Swipe */}
                        <div className="w-full overflow-x-auto no-scrollbar snap-x snap-mandatory touch-pan-x">
                            <div className="flex gap-8 px-12 min-w-max mx-auto py-2">
                                {VIBES.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setActiveVibe(v.id)}
                                        className={`flex flex-col items-center gap-3 shrink-0 snap-center transition-all duration-500 ${activeVibe === v.id ? 'scale-110' : 'opacity-20 grayscale'}`}
                                    >
                                        <div className={`w-20 h-24 rounded-[2.5rem] flex flex-col items-center justify-center border-2 transition-all ${activeVibe === v.id ? 'bg-zinc-900 border-white shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'bg-zinc-900/50 border-white/5'}`}>
                                            <CameraIcon type={v.id} active={activeVibe === v.id} />
                                            <span className={`text-[8px] font-black uppercase tracking-tighter mt-2 ${activeVibe === v.id ? 'text-white' : 'text-zinc-600'}`}>{v.label}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className={`text-[10px] font-black uppercase tracking-widest block ${activeVibe === v.id ? v.color : 'text-zinc-700'}`}>{v.name}</span>
                                            <span className="text-[7px] text-zinc-600 font-bold uppercase">{v.sub}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pro Shutter Button */}
                        <div className="relative">
                            <button 
                                onClick={handleCapture} 
                                className="w-24 h-24 rounded-full border-[3px] border-white/20 flex items-center justify-center p-2 group active:scale-90 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full border-2 border-black/5 animate-ping opacity-20"></div>
                                </div>
                            </button>
                            <div className="absolute -inset-4 border border-sky-500/10 rounded-full animate-spin-slow pointer-events-none"></div>
                        </div>
                    </>
                ) : (
                    <div className="flex gap-4 w-full max-w-sm animate-slide-up">
                        <button 
                            onClick={() => { setCapturedImage(null); startCamera(); }} 
                            className="flex-1 py-5 bg-zinc-900 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] rounded-[2rem] border border-white/5 active:scale-95 transition-all"
                        >
                            Refazer
                        </button>
                        <a 
                            href={capturedImage} 
                            download={`neos-paradise-${Date.now()}.jpg`} 
                            className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-[2rem] text-center shadow-xl active:scale-95 transition-all"
                        >
                            Exportar
                        </a>
                    </div>
                )}
            </footer>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slide-right { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
                .animate-slide-right { animation: slide-right 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-spin-slow { animation: spin 12s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
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