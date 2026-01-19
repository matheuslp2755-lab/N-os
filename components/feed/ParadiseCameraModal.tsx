import React, { useState, useRef, useEffect } from 'react';
import { auth, db, doc, updateDoc, serverTimestamp } from '../../firebase';
import Button from '../common/Button';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'memory' | 'analog2k' | 'cybershot' | 'filmsad' | 'vhs' | 'noir' | 'retro';
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
                video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
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

            applyAnalogAesthetics(ctx, w, h, params);
        }
        requestRef.current = requestAnimationFrame(renderLoop);
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

        if (tintOpacity > 0) {
            ctx.fillStyle = tintColor; ctx.globalAlpha = tintOpacity;
            ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1.0;
        }

        if (p.grain > 0) {
            ctx.globalAlpha = p.grain * 0.4;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 400; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
            }
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1.0;
        }

        const vin = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.95);
        vin.addColorStop(0, 'rgba(0,0,0,0)'); vin.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vin; ctx.fillRect(0, 0, w, h);

        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText('NÉOS PARADISE', 50, 80);
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

        if (flashMode === 'on' || (flashMode === 'auto' && Math.random() > 0.5)) {
            setShowFlashAnim(true);
            setTimeout(() => setShowFlashAnim(false), 150);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImages(prev => [...prev, dataUrl]);
        setIsCounting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-sans">
            {/* Flash Animation Layer */}
            {showFlashAnim && <div className="fixed inset-0 bg-white z-[1000] animate-flash-out"></div>}

            {/* Top HUD */}
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none">
                <div className="flex flex-col gap-4 pointer-events-auto">
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white shadow-xl">&times;</button>
                    <button 
                        onClick={() => setFlashMode(prev => prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off')}
                        className={`w-12 h-12 flex items-center justify-center backdrop-blur-xl rounded-full border border-white/10 transition-all ${flashMode !== 'off' ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/40 text-white/60'}`}
                    >
                        {flashMode === 'off' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m0 0L21 21" /></svg>}
                        {flashMode === 'on' && <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                        {flashMode === 'auto' && <span className="text-[9px] font-black">AUTO</span>}
                    </button>
                </div>
                
                <div className="flex flex-col items-center gap-2 pointer-events-auto">
                    <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></div>
                        <span className="text-[10px] text-white font-black uppercase tracking-[0.2em]">Paradise</span>
                    </div>
                    {isCounting && (
                        <div className="text-6xl font-black text-white italic drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-bounce">
                            {currentCount}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4 pointer-events-auto">
                    <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white active:rotate-180 transition-all duration-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button 
                        onClick={() => setCountdown(prev => prev === 0 ? 3 : prev === 3 ? 10 : 0)}
                        className={`w-12 h-12 flex items-center justify-center backdrop-blur-xl rounded-full border border-white/10 transition-all ${countdown > 0 ? 'bg-sky-500 text-white' : 'bg-black/40 text-white/60'}`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {countdown > 0 && <span className="absolute -bottom-1 -right-1 bg-white text-black text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-sky-500">{countdown}s</span>}
                    </button>
                    <button 
                        onClick={() => setHandDetectionEnabled(!handDetectionEnabled)}
                        className={`w-12 h-12 flex items-center justify-center backdrop-blur-xl rounded-full border border-white/10 transition-all ${handDetectionEnabled ? 'bg-green-500 text-white' : 'bg-black/40 text-white/60'}`}
                        title="Captura por Palma da Mão"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0V12m3.024-3.5a1.5 1.5 0 113 0V12m3 1V9a1.5 1.5 0 113 0v5a7 7 0 11-14 0V9a1.5 1.5 0 113 0v2.5" /></svg>
                    </button>
                </div>
            </header>

            {/* Main Viewport */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                {viewingGallery ? (
                    <div className="absolute inset-0 z-[200] bg-black flex flex-col animate-fade-in">
                        <header className="p-6 flex justify-between items-center bg-zinc-900 border-b border-white/5">
                            <button onClick={() => setViewingGallery(false)} className="text-white font-black uppercase text-[10px] tracking-widest">Voltar</button>
                            <h3 className="text-white font-black text-xs uppercase tracking-widest">Sessão: {capturedImages.length} fotos</h3>
                            <div className="w-10"></div>
                        </header>
                        <div className="flex-grow overflow-y-auto p-4 grid grid-cols-2 gap-4 no-scrollbar">
                            {capturedImages.map((img, i) => (
                                <div key={i} className="relative group rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 gap-3">
                                        <a href={img} download={`paradise-${i}.jpg`} className="bg-white text-black p-3 rounded-2xl scale-90 hover:scale-100 transition-transform">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </a>
                                        <button onClick={() => setCapturedImages(prev => prev.filter((_, idx) => idx !== i))} className="bg-red-500 text-white p-3 rounded-2xl scale-90 hover:scale-100 transition-transform">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} className="hidden" />
                        <canvas ref={canvasRef} className="w-full h-full object-cover" />
                        
                        {/* Sidebar: Focus Presets */}
                        <div className="absolute right-6 top-[40%] -translate-y-1/2 flex flex-col gap-4 z-50">
                            {(['20cm', '30cm', '50cm', 'auto'] as LensDistance[]).map(lens => (
                                <button 
                                    key={lens}
                                    onClick={() => setActiveLens(lens)}
                                    className={`w-12 h-12 rounded-full backdrop-blur-xl border flex flex-col items-center justify-center transition-all ${activeLens === lens ? 'bg-white text-black border-white shadow-[0_0_25px_rgba(255,255,255,0.4)] scale-110' : 'bg-black/30 text-white/40 border-white/10'}`}
                                >
                                    <span className="text-[7px] font-black uppercase tracking-tighter">{lens}</span>
                                    <div className={`w-1 h-1 rounded-full mt-1 ${activeLens === lens ? 'bg-black' : 'bg-white/20'}`}></div>
                                </button>
                            ))}
                        </div>

                        {/* Hand Detection Simulation Prompt */}
                        {handDetectionEnabled && !isCounting && (
                            <div 
                                onClick={handleCapture}
                                className="absolute inset-0 z-40 bg-green-500/10 flex items-center justify-center group cursor-pointer"
                            >
                                <div className="bg-black/40 backdrop-blur-xl p-8 rounded-[3rem] border border-green-500/30 text-center animate-pulse group-hover:scale-105 transition-transform">
                                    <svg className="w-20 h-20 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0V12m3.024-3.5a1.5 1.5 0 113 0V12m3 1V9a1.5 1.5 0 113 0v5a7 7 0 11-14 0V9a1.5 1.5 0 113 0v2.5" /></svg>
                                    <p className="text-white font-black uppercase text-xs tracking-widest">Mostre a palma da mão</p>
                                    <p className="text-green-500/60 text-[9px] font-bold uppercase mt-2">(Clique simulado ativado)</p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Bottom Console */}
            <footer className="bg-zinc-950 pt-4 pb-12 px-6 z-50 flex flex-col items-center gap-6 border-t border-white/5 relative">
                {!viewingGallery ? (
                    <>
                        <button 
                            onClick={() => setShowAdjustments(!showAdjustments)} 
                            className={`absolute -top-16 right-6 w-12 h-12 flex items-center justify-center backdrop-blur-3xl rounded-2xl border transition-all z-[100] shadow-2xl ${showAdjustments ? 'bg-sky-500 text-white border-sky-400 scale-110' : 'bg-white/10 text-white/80 border-white/20'}`}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        </button>

                        {showAdjustments && (
                            <div className="w-full bg-zinc-900/80 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/10 animate-slide-up mb-2">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-white/50 uppercase tracking-widest block">Brilho</span>
                                        <input type="range" min="0.5" max="1.5" step="0.01" value={light} onChange={e => setLight(parseFloat(e.target.value))} className="accent-white h-1 w-full appearance-none bg-white/10 rounded-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-white/50 uppercase tracking-widest block">Grão</span>
                                        <input type="range" min="0" max="1" step="0.01" value={grain} onChange={e => setGrain(parseFloat(e.target.value))} className="accent-zinc-400 h-1 w-full appearance-none bg-white/10 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="w-full relative overflow-hidden">
                            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-12 py-2 touch-pan-x">
                                {VIBES.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setActiveVibe(v.id)}
                                        className={`flex flex-col items-center gap-3 shrink-0 snap-center transition-all duration-500 ${activeVibe === v.id ? 'scale-110' : 'opacity-30 grayscale blur-[0.5px]'}`}
                                    >
                                        <div className={`w-20 h-24 rounded-[2.2rem] flex flex-col items-center justify-center border-2 transition-all ${activeVibe === v.id ? 'bg-zinc-900 border-white shadow-[0_0_40px_rgba(255,255,255,0.15)]' : 'bg-zinc-900/50 border-white/5'}`}>
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-black flex items-center justify-center shadow-inner text-white/60">
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-tighter mt-3 ${activeVibe === v.id ? 'text-white' : 'text-zinc-600'}`}>{v.label}</span>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest block ${activeVibe === v.id ? v.color : 'text-zinc-700'}`}>{v.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Capture Controls */}
                        <div className="flex items-center gap-10">
                            <button 
                                onClick={() => setViewingGallery(true)}
                                className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 active:scale-90 transition-all bg-zinc-900"
                            >
                                {capturedImages.length > 0 ? (
                                    <>
                                        <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <span className="text-white text-xs font-black">{capturedImages.length}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/20">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                )}
                            </button>

                            <button 
                                onClick={handleCapture} 
                                disabled={isCounting}
                                className="w-24 h-24 rounded-full border-2 border-white/20 flex items-center justify-center p-2 group active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)] disabled:opacity-50"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <div className={`w-16 h-16 rounded-full border-2 border-black/5 ${isCounting ? 'animate-ping' : ''}`}></div>
                                </div>
                            </button>

                            <button className="w-14 h-14 flex items-center justify-center bg-white/10 rounded-2xl text-white opacity-40">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex gap-4 w-full max-w-sm animate-slide-up py-4">
                        <button 
                            onClick={() => { setCapturedImages([]); setViewingGallery(false); }} 
                            className="flex-1 py-5 bg-zinc-900 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] rounded-[2rem] border border-white/5 active:scale-95"
                        >
                            Descartar Tudo
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
                            className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-[2rem] text-center shadow-2xl active:scale-95"
                        >
                            Exportar Todas
                        </button>
                    </div>
                )}
            </footer>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes flash-out { 0% { opacity: 1; } 100% { opacity: 0; } }
                .animate-flash-out { animation: flash-out 0.8s ease-out forwards; }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 20px; width: 20px;
                    border-radius: 50%; background: white;
                    cursor: pointer; box-shadow: 0 0 15px rgba(0,0,0,0.4); border: 2px solid #000;
                }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;