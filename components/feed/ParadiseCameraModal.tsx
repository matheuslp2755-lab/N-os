import React, { useState, useRef, useEffect } from 'react';
import { auth, db, doc, updateDoc, serverTimestamp } from '../../firebase';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'cybershot' | 'memory' | 'analog2k' | 'filmsad' | 'vhs' | 'noir' | 'retro';
type LensDistance = '20cm' | '30cm' | '50cm' | 'auto';

interface VibeConfig {
    id: VibeEffect;
    name: string;
    label: string;
    sub: string;
    color: string;
}

const VIBES: VibeConfig[] = [
    { id: 'cybershot', name: 'Cyber-shot', label: 'SONY HX200V', sub: 'Digital 2012', color: 'text-sky-300' },
    { id: 'memory', name: 'Memory', label: 'NOSTALGIA', sub: 'Tumblr 2016', color: 'text-amber-200' },
    { id: 'analog2k', name: 'Analog 2000', label: 'CAMCORDER', sub: 'CCD Sensor', color: 'text-emerald-300' },
    { id: 'filmsad', name: 'Film Sad', label: 'MOOD', sub: '35mm Expired', color: 'text-slate-400' },
    { id: 'vhs', name: 'VHS Photo', label: 'GLITCH', sub: 'Handycam', color: 'text-sky-400' },
    { id: 'retro', name: 'Retro Gold', label: 'VINTAGE', sub: 'Kodak 400', color: 'text-orange-300' },
    { id: 'noir', name: 'Noir Sad', label: 'SILENT', sub: 'B&W Grain', color: 'text-white' },
];

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect>('cybershot');
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
    
    const [light, setLight] = useState(1.05);
    const [color, setColor] = useState(0); 
    const [grain, setGrain] = useState(0.2);
    const [focus, setFocus] = useState(0.4);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number>(null);
    const lastBrightnessRef = useRef<number>(0);

    const aestheticParams = useRef({ light, color, grain, focus, activeVibe, facingMode, activeLens, flashMode });
    
    useEffect(() => {
        let newFocus = focus;
        if (activeLens === '20cm') newFocus = 3.5;
        else if (activeLens === '30cm') newFocus = 2.0;
        else if (activeLens === '50cm') newFocus = 1.0;
        else if (activeLens === 'auto') newFocus = 0.3;
        setFocus(newFocus);
    }, [activeLens]);

    useEffect(() => {
        aestheticParams.current = { light, color, grain, focus, activeVibe, facingMode, activeLens, flashMode };
    }, [light, color, grain, focus, activeVibe, facingMode, activeLens, flashMode]);

    const startCamera = async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
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

            // Detecção de Palma (Simulada por mudança brusca de brilho/bloqueio central)
            if (handDetectionEnabled && !isCounting && !viewingGallery) {
                detectHandGesture(ctx, w, h);
            }

            applyAnalogAesthetics(ctx, w, h, params);
        }
        requestRef.current = requestAnimationFrame(renderLoop);
    };

    const detectHandGesture = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const scanW = 100;
        const scanH = 100;
        const imageData = ctx.getImageData(w/2 - 50, h/2 - 50, scanW, scanH);
        let brightness = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
            brightness += (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
        }
        const avgBrightness = brightness / (scanW * scanH);
        
        // Se houver uma mudança súbita de luz (mão cobrindo a lente parcialmente ou refletindo luz)
        if (lastBrightnessRef.current > 0 && Math.abs(avgBrightness - lastBrightnessRef.current) > 60) {
            handleCapture();
        }
        lastBrightnessRef.current = avgBrightness;
    };

    const applyAnalogAesthetics = (ctx: CanvasRenderingContext2D, w: number, h: number, p: any) => {
        let saturation = 1.0;
        let contrast = 1.0;
        let brightness = p.light;
        let blur = p.focus;
        let tintColor = "transparent";
        let tintOpacity = 0;

        switch (p.activeVibe) {
            case 'cybershot':
                saturation = 1.2; contrast = 1.15; brightness += 0.05;
                tintColor = "rgba(0, 100, 255, 0.03)"; tintOpacity = 0.05;
                blur = Math.max(0.1, blur - 0.2);
                break;
            case 'memory':
                saturation = 0.8; contrast = 0.9;
                tintColor = "rgba(255, 200, 100, 0.15)"; tintOpacity = 0.15;
                blur += 0.5;
                break;
            case 'vhs': saturation = 0.7; contrast = 1.2; blur += 2.0; break;
        }

        ctx.globalCompositeOperation = 'source-over';
        const filterStr = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${p.color}deg) blur(${blur}px)`;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w; tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.filter = filterStr;
            tempCtx.drawImage(ctx.canvas, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
        }

        if (p.grain > 0) {
            ctx.globalAlpha = p.grain * 0.4;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 200; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
            }
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1.0;
        }

        const vin = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.95);
        vin.addColorStop(0, 'rgba(0,0,0,0)'); vin.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vin; ctx.fillRect(0, 0, w, h);
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
        const actualCountdown = countdown || (handDetectionEnabled ? 3 : 0);

        if (actualCountdown > 0) {
            setIsCounting(true);
            setCurrentCount(actualCountdown);
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

        if (flashMode === 'on' || (flashMode === 'auto' && Math.random() > 0.5)) {
            setShowFlashAnim(true);
            setTimeout(() => setShowFlashAnim(false), 150);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImages(prev => [...prev, dataUrl]);
        setIsCounting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-sans h-[100dvh]">
            {showFlashAnim && <div className="fixed inset-0 bg-white z-[1000] animate-flash-out"></div>}

            {/* HUD SUPERIOR COMPACTO */}
            <header className="absolute top-0 left-0 right-0 p-3 sm:p-6 flex justify-between items-center z-50">
                <div className="flex gap-2">
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white">&times;</button>
                    <button 
                        onClick={() => setFlashMode(prev => prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off')}
                        className={`w-10 h-10 flex items-center justify-center backdrop-blur-md rounded-full border border-white/10 transition-all ${flashMode !== 'off' ? 'bg-amber-400 text-black' : 'bg-black/40 text-white/60'}`}
                    >
                        {flashMode === 'off' ? '✕' : flashMode === 'on' ? '⚡' : 'A'}
                    </button>
                </div>
                
                {isCounting && (
                    <div className="text-5xl font-black text-white italic drop-shadow-xl animate-pulse">
                        {currentCount}
                    </div>
                )}

                <div className="flex gap-2">
                    <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button 
                        onClick={() => setHandDetectionEnabled(!handDetectionEnabled)}
                        className={`w-10 h-10 flex items-center justify-center backdrop-blur-md rounded-full border border-white/10 transition-all ${handDetectionEnabled ? 'bg-green-500 text-white' : 'bg-black/40 text-white/60'}`}
                    >
                        ✋
                    </button>
                </div>
            </header>

            {/* VIEWPORT */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center overflow-hidden">
                {viewingGallery ? (
                    <div className="absolute inset-0 z-[200] bg-black flex flex-col animate-fade-in">
                        <header className="p-4 flex justify-between items-center bg-zinc-900 border-b border-white/5">
                            <button onClick={() => setViewingGallery(false)} className="text-white font-black uppercase text-[10px] tracking-widest">Voltar</button>
                            <h3 className="text-white font-black text-xs uppercase tracking-widest">{capturedImages.length} fotos</h3>
                            <button onClick={() => setCapturedImages([])} className="text-red-500 text-[10px] font-black uppercase tracking-widest">Limpar</button>
                        </header>
                        <div className="flex-grow overflow-y-auto p-2 grid grid-cols-3 gap-1 no-scrollbar">
                            {capturedImages.map((img, i) => (
                                <div key={i} className="aspect-[3/4] relative rounded-lg overflow-hidden border border-white/5">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button onClick={() => setCapturedImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 text-white w-5 h-5 rounded-full text-[10px]">&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} className="hidden" />
                        <canvas ref={canvasRef} className="w-full h-full object-cover" />
                        
                        {/* LENTES LATERAIS COMPACTAS */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50 scale-90">
                            {(['20cm', '30cm', '50cm', 'auto'] as LensDistance[]).map(lens => (
                                <button 
                                    key={lens}
                                    onClick={() => setActiveLens(lens)}
                                    className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${activeLens === lens ? 'bg-white text-black border-white' : 'bg-black/40 text-white/40 border-white/5'}`}
                                >
                                    <span className="text-[7px] font-black">{lens}</span>
                                </button>
                            ))}
                            <button 
                                onClick={() => setCountdown(prev => prev === 0 ? 3 : prev === 3 ? 10 : 0)}
                                className={`w-9 h-9 mt-4 rounded-full backdrop-blur-md border flex items-center justify-center ${countdown > 0 ? 'bg-sky-500 text-white' : 'bg-black/40 text-white/40 border-white/5'}`}
                            >
                                <span className="text-[8px] font-black">{countdown || '⏱'}</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* CONSOLE INFERIOR AJUSTADO PARA MOBILE */}
            <footer className="bg-zinc-950 px-4 pb-8 pt-2 z-50 border-t border-white/5">
                {!viewingGallery ? (
                    <div className="flex flex-col gap-4">
                        {/* BOTÕES DE EDIÇÃO */}
                        <div className="flex justify-between items-center px-2">
                             <button 
                                onClick={() => setShowAdjustments(!showAdjustments)} 
                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${showAdjustments ? 'bg-sky-500 text-white border-sky-400' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
                            >
                                Ajustes
                            </button>
                            <span className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em]">Paradise Lenses</span>
                        </div>

                        {showAdjustments && (
                            <div className="bg-zinc-900/90 backdrop-blur-xl p-4 rounded-3xl border border-white/5 animate-slide-up mb-2">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[8px] font-black text-white/40 uppercase w-8">Luz</span>
                                        <input type="range" min="0.5" max="1.5" step="0.01" value={light} onChange={e => setLight(parseFloat(e.target.value))} className="accent-white h-1 flex-grow appearance-none bg-white/10 rounded-full" />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[8px] font-black text-white/40 uppercase w-8">Grão</span>
                                        <input type="range" min="0" max="1" step="0.01" value={grain} onChange={e => setGrain(parseFloat(e.target.value))} className="accent-zinc-400 h-1 flex-grow appearance-none bg-white/10 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* LISTA DE VIBES COMPACTA */}
                        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1">
                            {VIBES.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setActiveVibe(v.id)}
                                    className={`flex flex-col items-center shrink-0 transition-all ${activeVibe === v.id ? 'scale-100 opacity-100' : 'scale-90 opacity-30 grayscale'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${activeVibe === v.id ? 'bg-zinc-900 border-white' : 'bg-zinc-900/50 border-white/5'}`}>
                                        <span className="text-xl">📸</span>
                                    </div>
                                    <span className="text-[7px] font-black uppercase mt-1 text-white truncate w-14 text-center">{v.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* DISPARADOR E GALERIA */}
                        <div className="flex items-center justify-center gap-12 pt-2">
                            <button 
                                onClick={() => setViewingGallery(true)}
                                className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center"
                            >
                                {capturedImages.length > 0 ? (
                                    <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover opacity-50" />
                                ) : (
                                    <span className="text-zinc-700 text-lg">🖼️</span>
                                )}
                            </button>

                            <button 
                                onClick={handleCapture} 
                                disabled={isCounting}
                                className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center p-1.5 active:scale-90 transition-all disabled:opacity-50"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <div className={`w-14 h-14 rounded-full border border-black/5 ${isCounting ? 'animate-ping' : ''}`}></div>
                                </div>
                            </button>

                            <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/30">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3 w-full animate-slide-up">
                        <button 
                            onClick={() => { setCapturedImages([]); setViewingGallery(false); }} 
                            className="flex-1 py-4 bg-zinc-900 text-white/40 text-[9px] font-black uppercase tracking-widest rounded-2xl border border-white/5"
                        >
                            Reset
                        </button>
                        <button 
                            onClick={() => {
                                capturedImages.forEach((img, i) => {
                                    const link = document.createElement('a');
                                    link.download = `paradise-${Date.now()}-${i}.jpg`;
                                    link.href = img;
                                    link.click();
                                });
                                onClose();
                            }}
                            className="flex-1 py-4 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-2xl shadow-xl"
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
                .animate-flash-out { animation: flash-out 0.6s ease-out forwards; }
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