import React, { useState, useRef, useEffect } from 'react';
import { auth, db, doc, updateDoc, serverTimestamp } from '../../firebase';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'memory' | 'analog2k' | 'filmsad' | 'vhs' | 'noir' | 'retro';

interface VibeConfig {
    id: VibeEffect;
    name: string;
    label: string;
    sub: string;
    color: string;
}

const VIBES: VibeConfig[] = [
    { id: 'memory', name: 'Memory', label: 'NOSTALGIA', sub: 'Tumblr 2016', color: 'text-amber-200' },
    { id: 'analog2k', name: 'Analog 2000', label: 'CAMCORDER', sub: 'CCD Sensor', color: 'text-emerald-300' },
    { id: 'filmsad', name: 'Film Sad', label: 'MOOD', sub: '35mm Expired', color: 'text-slate-400' },
    { id: 'vhs', name: 'VHS Photo', label: 'GLITCH', sub: 'Handycam', color: 'text-sky-400' },
    { id: 'retro', name: 'Retro Gold', label: 'VINTAGE', sub: 'Kodak 400', color: 'text-orange-300' },
    { id: 'noir', name: 'Noir Sad', label: 'SILENT', sub: 'B&W Grain', color: 'text-white' },
];

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect>('memory');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [showAdjustments, setShowAdjustments] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    
    // Sliders de Estética (Estados que disparam re-render do canvas)
    const [light, setLight] = useState(1.0);
    const [color, setColor] = useState(0); 
    const [grain, setGrain] = useState(0.5);
    const [focus, setFocus] = useState(0.8); // Começa levemente desfocado para estética analógica

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number>(null);

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

            ctx.save();
            if (params.facingMode === 'user') {
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0, w, h);
            ctx.restore();

            applyAnalogAesthetics(ctx, w, h, params);
        }
        requestRef.current = requestAnimationFrame(renderLoop);
    };

    const applyAnalogAesthetics = (ctx: CanvasRenderingContext2D, w: number, h: number, p: any) => {
        // 1. Definição de presets de processamento de pixel
        let saturation = 1.0;
        let contrast = 1.0;
        let brightness = p.light;
        let blur = p.focus;
        let tintColor = "transparent";
        let tintOpacity = 0;

        switch (p.activeVibe) {
            case 'memory':
                saturation = 0.8;
                contrast = 0.9;
                tintColor = "rgba(255, 200, 100, 0.15)"; // Tom quente amarelado
                tintOpacity = 0.15;
                blur += 0.5;
                break;
            case 'analog2k':
                saturation = 1.3;
                contrast = 1.1;
                tintColor = "rgba(100, 255, 150, 0.1)"; // Tom esverdeado clássico CCD
                tintOpacity = 0.1;
                blur += 1.2;
                break;
            case 'filmsad':
                saturation = 0.6;
                contrast = 0.8;
                tintColor = "rgba(50, 50, 100, 0.1)"; // Tom frio azulado
                tintOpacity = 0.1;
                blur += 0.2;
                break;
            case 'vhs':
                saturation = 0.7;
                contrast = 1.2;
                blur += 2.0;
                break;
            case 'noir':
                saturation = 0;
                contrast = 1.4;
                blur += 0.5;
                break;
        }

        // 2. Aplicação do Pipeline Visual
        ctx.globalCompositeOperation = 'source-over';
        
        // Camada de Filtros Básicos + Preset
        const filterStr = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${p.color}deg) blur(${blur}px)`;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.filter = filterStr;
            tempCtx.drawImage(ctx.canvas, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
        }

        // Camada de Tint (Cor do Preset)
        if (tintOpacity > 0) {
            ctx.fillStyle = tintColor;
            ctx.globalAlpha = tintOpacity;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1.0;
        }

        // 3. Grão Analógico (Noise Real)
        if (p.grain > 0) {
            ctx.globalAlpha = p.grain * 0.4;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 600; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const size = Math.random() * 2 + 1;
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(x, y, size, size);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        }

        // 4. Efeitos Específicos por Vibe (Pós-processamento)
        if (p.activeVibe === 'vhs') {
            // Scanlines e ruído horizontal
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            for (let i = 0; i < h; i += 10) {
                if (Math.random() > 0.3) ctx.fillRect(0, i + Math.random() * 2, w, 1.5);
            }
            // Distortion nas bordas
            ctx.globalAlpha = 0.2;
            ctx.drawImage(ctx.canvas, 4, 0, w, h);
            ctx.globalAlpha = 1.0;
        }

        // 5. Vinheta Óptica (Suave nas bordas)
        const vin = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.95);
        vin.addColorStop(0, 'rgba(0,0,0,0)');
        vin.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vin;
        ctx.fillRect(0, 0, w, h);

        // Watermark Néos
        ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText('NÉOS PARADISE', 50, 80);
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-sans">
            {/* HUD Minimalista Superior */}
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none">
                <div className="pointer-events-auto">
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white active:scale-90 transition-all">&times;</button>
                </div>
                
                <div className="flex flex-col items-center opacity-60">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span className="text-[10px] text-white font-black uppercase tracking-[0.3em]">Analog Engine</span>
                    </div>
                </div>

                <div className="flex flex-col gap-4 pointer-events-auto">
                    <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white active:rotate-180 transition-all duration-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={() => setShowAdjustments(!showAdjustments)} className={`w-12 h-12 flex items-center justify-center backdrop-blur-xl rounded-full border border-white/10 transition-all ${showAdjustments ? 'bg-amber-400 text-black' : 'bg-black/40 text-white/60'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    </button>
                </div>
            </header>

            {/* Viewfinder Main (Câmera) */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                <video ref={videoRef} className="hidden" />
                <canvas ref={canvasRef} className={`w-full h-full object-cover transition-opacity duration-1000 ${capturedImage ? 'hidden' : 'opacity-100'}`} />
                {capturedImage && <img src={capturedImage} className="w-full h-full object-cover animate-fade-in" />}
                
                {showFlash && <div className="absolute inset-0 bg-white z-[100] animate-pulse"></div>}

                {/* Painel Flutuante de Ajustes (Glassmorphism) */}
                {!capturedImage && showAdjustments && (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-8 bg-black/30 backdrop-blur-[40px] p-8 rounded-[3rem] border border-white/10 z-[60] animate-slide-right shadow-2xl">
                        <div className="flex flex-col gap-3">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Brilho</span>
                            <input type="range" min="0.5" max="1.5" step="0.01" value={light} onChange={e => setLight(parseFloat(e.target.value))} className="accent-white h-1 w-28 appearance-none bg-white/10 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Matiz</span>
                            <input type="range" min="-180" max="180" step="1" value={color} onChange={e => setColor(parseFloat(e.target.value))} className="accent-amber-400 h-1 w-28 appearance-none bg-white/10 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Grão</span>
                            <input type="range" min="0" max="1" step="0.01" value={grain} onChange={e => setGrain(parseFloat(e.target.value))} className="accent-zinc-400 h-1 w-28 appearance-none bg-white/10 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Lente (Blur)</span>
                            <input type="range" min="0" max="5" step="0.1" value={focus} onChange={e => setFocus(parseFloat(e.target.value))} className="accent-white/20 h-1 w-28 appearance-none bg-white/10 rounded-full" />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Control Station */}
            <footer className="bg-zinc-950 pt-4 pb-12 px-6 z-50 flex flex-col items-center gap-6 border-t border-white/5">
                {!capturedImage ? (
                    <>
                        {/* Swipe de Presets Analógicos */}
                        <div className="w-full relative overflow-hidden">
                            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-12 py-2 touch-pan-x">
                                {VIBES.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setActiveVibe(v.id)}
                                        className={`flex flex-col items-center gap-3 shrink-0 snap-center transition-all duration-500 ${activeVibe === v.id ? 'scale-110' : 'opacity-20 grayscale'}`}
                                    >
                                        <div className={`w-20 h-24 rounded-[2rem] flex flex-col items-center justify-center border-2 transition-all ${activeVibe === v.id ? 'bg-zinc-900 border-white shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'bg-zinc-900/50 border-white/5'}`}>
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center shadow-inner">
                                                <svg className="w-6 h-6 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3z"/></svg>
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-tighter mt-3 ${activeVibe === v.id ? 'text-white' : 'text-zinc-600'}`}>{v.label}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className={`text-[9px] font-black uppercase tracking-widest block ${activeVibe === v.id ? v.color : 'text-zinc-700'}`}>{v.name}</span>
                                            <span className="text-[7px] text-zinc-600 font-bold uppercase">{v.sub}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Obturador Pro */}
                        <div className="relative">
                            <button 
                                onClick={handleCapture} 
                                className="w-24 h-24 rounded-full border-2 border-white/20 flex items-center justify-center p-2 group active:scale-95 transition-all"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)]">
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
                            Refazer
                        </button>
                        <a 
                            href={capturedImage} 
                            download={`memory-${Date.now()}.jpg`} 
                            className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-[2rem] text-center shadow-xl active:scale-95 transition-all"
                        >
                            Salvar
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
                    height: 18px;
                    width: 18px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0,0,0,0.3);
                }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;