import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'vhs' | 'ccd' | 'cinema' | 'disposable' | 'noir' | 'y2k' | 'polaroid' | 'cyber';

interface VibeConfig {
    id: VibeEffect;
    name: string;
    model: string;
}

const VIBES: VibeConfig[] = [
    { id: 'vhs', name: 'VHS-86', model: 'Handycam' },
    { id: 'ccd', name: 'CCD-04', model: 'Cyber-Shot' },
    { id: 'cinema', name: '35mm Pro', model: 'Leica M6' },
    { id: 'disposable', name: 'QuickSnap', model: 'Fujifilm' },
    { id: 'y2k', name: 'GLITCH-05', model: 'Bloggie' },
    { id: 'polaroid', name: 'Instant-600', model: 'OneStep' },
    { id: 'cyber', name: 'NEON-CITY', model: 'Cyberpunk' },
    { id: 'noir', name: 'Noir Film', model: 'B&W Film' },
];

const CameraIcon = ({ type }: { type: VibeEffect }) => {
    switch (type) {
        case 'vhs': return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5v14h16V5H4zm14 12H6V7h12v10zM17 9h-2v2h2V9zm-4 0h-2v2h2V9zM9 9H7v2h2V9z"/></svg>;
        case 'ccd': return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm7-8h-2V7h2v2z"/></svg>;
        case 'cinema': return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>;
        case 'disposable': return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>;
        case 'y2k': return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16.5c0 .38-.21.71-.53.88l-7.97 4.13c-.31.16-.69.16-1 0L3.53 17.38c-.32-.17-.53-.5-.53-.88V7.5c0-.38.21-.71.53-.88l7.97-4.13c.31-.16.69-.16 1 0l7.97 4.13c.32.17.53.5.53.88v9z"/></svg>;
        case 'polaroid': return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H5V5h14v11z"/></svg>;
        case 'cyber': return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.92 6.92 0 0119 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-1.93.78-3.68 2.04-4.95l-1.42-1.42C4.07 7.16 3 9.45 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.55-1.07-4.84-2.77-6.43z"/></svg>;
        case 'noir': return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>;
    }
};

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect | null>('vhs');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    const [showControls, setShowControls] = useState(false);
    
    // Sliders de ajuste
    const [grain, setGrain] = useState(0.5);
    const [light, setLight] = useState(1.0);
    const [temp, setTemp] = useState(0); // Hue shift
    const [blur, setBlur] = useState(0.2); // Softness

    const videoRef = useRef<HTMLVideoElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
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
                requestRef.current = requestAnimationFrame(renderPreview);
            }
        } catch (err) {
            console.error("Paradise Error:", err);
        }
    };

    const renderPreview = () => {
        const video = videoRef.current;
        const canvas = previewCanvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
            requestRef.current = requestAnimationFrame(renderPreview);
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

            applyAestheticLayer(ctx, w, h);
        }
        requestRef.current = requestAnimationFrame(renderPreview);
    };

    const applyAestheticLayer = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Filtros Base via Sliders
        ctx.filter = `brightness(${light}) hue-rotate(${temp}deg) blur(${blur}px)`;
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.filter = 'none';

        // Grão em Tempo Real
        if (grain > 0) {
            ctx.globalAlpha = grain * 0.3;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 500; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        }

        switch (activeVibe) {
            case 'vhs':
                for (let i = 0; i < h; i += 6) {
                    ctx.fillStyle = 'rgba(0,0,0,0.05)';
                    ctx.fillRect(0, i, w, 1);
                }
                ctx.font = 'bold 30px monospace';
                ctx.fillStyle = '#00f2ff';
                ctx.fillText('REC 00:04:22', 40, h - 80);
                break;
            case 'y2k':
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'rgba(255,255,255,0.05)';
                ctx.fillRect(0,0,w,h);
                ctx.globalCompositeOperation = 'source-over';
                break;
            case 'polaroid':
                ctx.fillStyle = 'rgba(255, 100, 0, 0.1)';
                ctx.fillRect(0,0,w,h);
                break;
            case 'cyber':
                const grd = ctx.createLinearGradient(0, 0, w, h);
                grd.addColorStop(0, 'rgba(255, 0, 255, 0.1)');
                grd.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
                ctx.fillStyle = grd;
                ctx.fillRect(0,0,w,h);
                break;
            case 'disposable':
                ctx.font = 'bold 36px Courier';
                ctx.fillStyle = '#ff9100';
                ctx.fillText("'98 12 25", w - 200, h - 60);
                break;
        }

        // Vinheta
        const vin = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.8);
        vin.addColorStop(0, 'rgba(0,0,0,0)');
        vin.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vin;
        ctx.fillRect(0, 0, w, h);
    };

    useEffect(() => {
        if (isOpen && !capturedImage) startCamera();
        return () => stopCamera();
    }, [isOpen, facingMode, capturedImage]);

    const handleCapture = () => {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 100);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
        stopCamera();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-mono">
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
                <button onClick={onClose} className="text-white/60 hover:text-white text-3xl font-thin active:scale-90 transition-transform">&times;</button>
                <div className="text-center">
                    <span className="text-[10px] text-white/50 uppercase tracking-[0.5em] font-black">NÉOS PARADISE</span>
                </div>
                <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="p-2 text-white/60 active:rotate-180 transition-all duration-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </header>

            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                <video ref={videoRef} className="hidden" />
                <canvas ref={previewCanvasRef} className={`w-full h-full object-contain ${capturedImage ? 'hidden' : 'block'}`} />
                {capturedImage && <img src={capturedImage} className="w-full h-full object-contain animate-fade-in" />}
                
                {showFlash && <div className="absolute inset-0 bg-white z-[100] animate-pulse"></div>}

                {/* Painel de Ajustes ao Vivo */}
                {!capturedImage && showControls && (
                    <div className="absolute right-4 top-1/4 flex flex-col gap-6 bg-black/40 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 z-[60] animate-slide-right">
                        <div className="flex flex-col gap-2">
                             <label className="text-[8px] text-white/60 uppercase font-bold">Luz</label>
                             <input type="range" min="0.5" max="1.5" step="0.05" value={light} onChange={e => setLight(parseFloat(e.target.value))} className="accent-white h-1 w-24" />
                        </div>
                        <div className="flex flex-col gap-2">
                             <label className="text-[8px] text-white/60 uppercase font-bold">Cor</label>
                             <input type="range" min="-180" max="180" step="1" value={temp} onChange={e => setTemp(parseFloat(e.target.value))} className="accent-sky-500 h-1 w-24" />
                        </div>
                        <div className="flex flex-col gap-2">
                             <label className="text-[8px] text-white/60 uppercase font-bold">Grain</label>
                             <input type="range" min="0" max="1" step="0.1" value={grain} onChange={e => setGrain(parseFloat(e.target.value))} className="accent-zinc-400 h-1 w-24" />
                        </div>
                        <div className="flex flex-col gap-2">
                             <label className="text-[8px] text-white/60 uppercase font-bold">Focus</label>
                             <input type="range" min="0" max="2" step="0.1" value={blur} onChange={e => setBlur(parseFloat(e.target.value))} className="accent-indigo-400 h-1 w-24" />
                        </div>
                    </div>
                )}

                {/* Botão para mostrar/esconder controles */}
                {!capturedImage && (
                    <button 
                        onClick={() => setShowControls(!showControls)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all ${showControls ? 'bg-white text-black' : 'bg-black/20 text-white border border-white/10'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeWidth={2}/></svg>
                    </button>
                )}
            </div>

            <footer className="bg-zinc-950 p-6 z-50 flex flex-col items-center gap-8 border-t border-white/5 pb-10">
                {!capturedImage && (
                    <>
                        <div className="w-full overflow-x-auto no-scrollbar scroll-smooth touch-pan-x">
                            <div className="flex gap-6 px-10 py-4 min-w-max mx-auto">
                                {VIBES.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setActiveVibe(v.id)}
                                        className={`flex flex-col items-center gap-3 transition-all duration-500 ${activeVibe === v.id ? 'scale-110' : 'opacity-30'}`}
                                    >
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${activeVibe === v.id ? 'bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.4)]' : 'bg-zinc-900 text-zinc-500 border border-white/10'}`}>
                                            <CameraIcon type={v.id} />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] text-white font-black uppercase tracking-tighter">{v.name}</span>
                                            <span className="text-[7px] text-zinc-600 uppercase font-bold">{v.model}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleCapture} 
                            className="w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center p-1.5 active:scale-90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        >
                            <div className="w-full h-full bg-white rounded-full"></div>
                        </button>
                    </>
                )}

                {capturedImage && (
                    <div className="flex gap-4 w-full max-w-xs animate-slide-up">
                        <button onClick={() => { setCapturedImage(null); startCamera(); }} className="flex-1 py-5 bg-zinc-900 text-white/40 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 active:scale-95 transition-all">Refazer</button>
                        <a href={capturedImage} download={`neos-paradise-${Date.now()}.jpg`} className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl text-center shadow-xl active:scale-95 transition-all">Salvar</a>
                    </div>
                )}
            </footer>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
                @keyframes slide-right { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                .animate-slide-right { animation: slide-right 0.4s ease-out forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;