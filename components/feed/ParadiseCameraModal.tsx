import React, { useState, useRef, useEffect, useCallback } from 'react';
import { auth, db, doc, updateDoc, serverTimestamp } from '../../firebase';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'vhs2003' | 'digicam' | 'ccdcool' | 'eightmm' | 'asteric' | 'y2kmirror' | 'polaroid' | 'lowfinight';
type LensMM = 24 | 35 | 50 | 85 | 101;

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
    exposure: number;
    tint: string;
}

const PRESETS: Record<VibeEffect, EffectConfig> = {
    vhs2003: { id: 'vhs2003', name: 'VHS 2003', label: 'TAPE', grain: 0.7, blur: 1.5, temp: 5, glow: 0.3, saturation: 0.6, contrast: 1.3, exposure: 1.1, tint: 'rgba(0,30,120,0.1)' },
    digicam: { id: 'digicam', name: 'Digicam', label: 'SONY', grain: 0.2, blur: 0.1, temp: 0, glow: 0.5, saturation: 1.4, contrast: 1.5, exposure: 1.2, tint: 'rgba(255,255,255,0.05)' },
    ccdcool: { id: 'ccdcool', name: 'CCD Cool', label: 'DIGI', grain: 0.1, blur: 0.3, temp: -25, glow: 0.2, saturation: 1.1, contrast: 1.1, exposure: 1.0, tint: 'rgba(0,100,255,0.12)' },
    eightmm: { id: 'eightmm', name: '8mm Reel', label: 'FILM', grain: 0.9, blur: 0.8, temp: 15, glow: 0.3, saturation: 0.6, contrast: 0.9, exposure: 0.9, tint: 'rgba(150,80,0,0.15)' },
    asteric: { id: 'asteric', name: 'Asteric', label: 'SOFT', grain: 0.1, blur: 1.8, temp: 10, glow: 0.8, saturation: 1.2, contrast: 0.8, exposure: 1.1, tint: 'rgba(255,100,200,0.15)' },
    y2kmirror: { id: 'y2kmirror', name: 'Y2K Mirror', label: 'CYBER', grain: 0.4, blur: 0.5, temp: -10, glow: 0.4, saturation: 0.8, contrast: 0.7, exposure: 1.0, tint: 'rgba(0,255,255,0.08)' },
    polaroid: { id: 'polaroid', name: 'Polaroid', label: 'INSTAX', grain: 0.3, blur: 0.6, temp: 0, glow: 0.3, saturation: 0.9, contrast: 0.8, exposure: 1.0, tint: 'rgba(255,255,255,0.2)' },
    lowfinight: { id: 'lowfinight', name: 'Low-Fi', label: 'NIGHT', grain: 0.9, blur: 2.0, temp: 0, glow: 0.6, saturation: 1.5, contrast: 1.6, exposure: 1.4, tint: 'rgba(128,0,255,0.2)' }
};

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect>('vhs2003');
    const [lensMM, setLensMM] = useState<LensMM>(35);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [viewingGallery, setViewingGallery] = useState(false);
    const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
    const [showFlashAnim, setShowFlashAnim] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const requestRef = useRef<number>(null);

    // Zoom factors based on MM (24 is base 1.0)
    const getZoomFactor = (mm: LensMM) => {
        const factors = { 24: 1.0, 35: 1.4, 50: 2.0, 85: 2.8, 101: 3.5 };
        return factors[mm];
    };

    const startCamera = useCallback(async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
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

    const applyAestheticFilters = (ctx: CanvasRenderingContext2D, w: number, h: number, config: EffectConfig) => {
        // 1. Base grading
        ctx.filter = `brightness(${config.exposure}) contrast(${config.contrast}) saturate(${config.saturation}) hue-rotate(${config.temp}deg) blur(${config.blur}px)`;
        
        // Use a temporary canvas to apply filters and keep drawing stack clean
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w; tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.drawImage(ctx.canvas, 0, 0);
            ctx.filter = 'none';
            ctx.drawImage(tempCanvas, 0, 0);
        }

        // 2. Halation / Glow
        if (config.glow > 0) {
            ctx.save();
            ctx.globalAlpha = config.glow * 0.4;
            ctx.globalCompositeOperation = 'screen';
            ctx.filter = `blur(${15 * config.glow}px) brightness(1.2)`;
            ctx.drawImage(ctx.canvas, 0, 0);
            ctx.restore();
        }

        // 3. Digital Grain
        if (config.grain > 0) {
            ctx.save();
            ctx.globalAlpha = config.grain * 0.3;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 300; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
            }
            ctx.restore();
        }

        // 4. Tint
        ctx.save();
        ctx.fillStyle = config.tint;
        ctx.globalAlpha = 1.0;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // 5. Digital Date
        const now = new Date();
        const ds = `'${now.getFullYear().toString().slice(-2)} ${ (now.getMonth()+1).toString().padStart(2,'0') } ${ now.getDate().toString().padStart(2,'0') }`;
        ctx.font = 'bold 32px monospace';
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(ds, w - 220, h - 80);
        ctx.shadowBlur = 0;

        // 6. Vignette
        const grad = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.8);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
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
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            canvas.width = vw;
            canvas.height = vh;

            // PREVIEW FULL DRAW (We will visualize the crop with UI, but the render handles the whole input)
            ctx.save();
            if (facingMode === 'user') {
                ctx.translate(vw, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0, vw, vh);
            ctx.restore();

            applyAestheticFilters(ctx, vw, vh, PRESETS[activeVibe]);
        }
        requestRef.current = requestAnimationFrame(renderLoop);
    };

    useEffect(() => {
        if (isOpen && !viewingGallery) startCamera();
        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isOpen, facingMode, viewingGallery, startCamera]);

    const executeCapture = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (flashMode === 'on') {
            setShowFlashAnim(true);
            setTimeout(() => setShowFlashAnim(false), 150);
        }

        // REAL CROP LOGIC
        const zoom = getZoomFactor(lensMM);
        const vw = canvas.width;
        const vh = canvas.height;

        // The visible square size in UI is based on this zoom
        const cropW = vw / zoom;
        const cropH = (vw * (4/3)) / zoom; // Maintain standard 3:4 or desired camera ratio
        const cx = (vw - cropW) / 2;
        const cy = (vh - cropH) / 2;

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = cropW;
        outputCanvas.height = cropH;
        const outCtx = outputCanvas.getContext('2d');
        if (outCtx) {
            // Draw exactly the sub-region of the rendered canvas
            outCtx.drawImage(canvas, cx, cy, cropW, cropH, 0, 0, cropW, cropH);
        }

        const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.9);
        setCapturedImages(prev => [...prev, dataUrl]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col overflow-hidden touch-none h-[100dvh] font-sans text-white">
            {showFlashAnim && <div className="fixed inset-0 bg-white z-[1000] animate-flash-out"></div>}

            <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50">
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 active:scale-90 transition-all text-xl">&times;</button>
                
                <div className="flex items-center gap-4 bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5">
                    {([24, 35, 50, 85, 101] as LensMM[]).map(mm => (
                        <button 
                            key={mm}
                            onClick={() => setLensMM(mm)}
                            className={`text-[10px] font-black tracking-widest transition-all ${lensMM === mm ? 'text-white scale-110 drop-shadow-[0_0_8px_white]' : 'text-white/30'}`}
                        >
                            {mm}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={() => setFlashMode(prev => prev === 'off' ? 'on' : 'off')}
                        className={`w-10 h-10 flex items-center justify-center backdrop-blur-xl rounded-full border border-white/10 transition-all ${flashMode === 'on' ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/40 text-white/60'}`}
                    >
                        ⚡
                    </button>
                    <button 
                        onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                        className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 active:scale-90 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
            </header>

            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center overflow-hidden">
                {viewingGallery ? (
                    <div className="absolute inset-0 z-[200] bg-black flex flex-col animate-fade-in">
                        <header className="p-4 flex justify-between items-center bg-zinc-900/50 backdrop-blur-xl border-b border-white/5">
                            <button onClick={() => setViewingGallery(false)} className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Back</button>
                            <h3 className="text-xs font-black uppercase tracking-widest">{capturedImages.length} Recs</h3>
                            <button onClick={() => setCapturedImages([])} className="text-red-500 text-[10px] font-black uppercase">Clear</button>
                        </header>
                        <div className="flex-grow overflow-y-auto grid grid-cols-3 gap-0.5 p-0.5 no-scrollbar">
                            {capturedImages.map((img, i) => (
                                <div key={i} className="aspect-[3/4] relative bg-zinc-900">
                                    <img src={img} className="w-full h-full object-contain" />
                                    <a href={img} download={`neos-cam-${i}.jpg`} className="absolute bottom-2 right-2 bg-white text-black p-2 rounded-full scale-75 shadow-xl">
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
                        
                        {/* REAL DYNAMIC CROP FRAME */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div 
                                className="border-[0.5px] border-white/40 transition-all duration-700 ease-out relative"
                                style={{ 
                                    width: `${100 / getZoomFactor(lensMM)}%`,
                                    aspectRatio: '3/4',
                                    boxShadow: '0 0 0 2000px rgba(0,0,0,0.6)'
                                }}
                            >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.3em] opacity-40">{lensMM}mm LENS</div>
                                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/60"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/60"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/60"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/60"></div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <footer className="bg-black/95 backdrop-blur-3xl px-4 pb-10 pt-4 border-t border-white/5 z-50">
                {!viewingGallery ? (
                    <div className="flex flex-col gap-6">
                        <div className="flex gap-4 overflow-x-auto no-scrollbar py-1 snap-x snap-mandatory">
                            {(Object.values(PRESETS)).map((eff: EffectConfig) => (
                                <button
                                    key={eff.id}
                                    onClick={() => setActiveVibe(eff.id)}
                                    className={`flex flex-col items-center shrink-0 snap-center transition-all duration-300 ${activeVibe === eff.id ? 'scale-110 opacity-100' : 'scale-90 opacity-20 grayscale'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${activeVibe === eff.id ? 'bg-zinc-900 border-white shadow-[0_0_20px_white]' : 'bg-zinc-900/50 border-white/5'}`}>
                                        <span className="text-[7px] font-black uppercase text-white/40 tracking-tighter">{eff.label}</span>
                                        <span className={`text-[8px] font-black uppercase mt-1 tracking-widest ${activeVibe === eff.id ? 'text-white' : 'text-zinc-600'}`}>00{(Object.values(PRESETS)).indexOf(eff)+1}</span>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase mt-2 tracking-tighter ${activeVibe === eff.id ? 'text-white bg-white/10' : 'text-zinc-500'} px-2 py-0.5 rounded-full`}>{eff.name}</span>
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
                                onClick={executeCapture} 
                                className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center p-1.5 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center relative">
                                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-zinc-200 to-white"></div>
                                </div>
                            </button>

                            <div className="w-12 h-12"></div>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2 animate-slide-up">
                        <button 
                            onClick={() => { setCapturedImages([]); setViewingGallery(false); }}
                            className="flex-1 py-4 bg-zinc-900 text-zinc-500 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 active:scale-95"
                        >
                            Discard all
                        </button>
                        <button 
                            onClick={() => {
                                capturedImages.forEach((img, i) => {
                                    const link = document.createElement('a');
                                    link.download = `neos-cam-${Date.now()}-${i}.jpg`;
                                    link.href = img;
                                    link.click();
                                });
                                onClose();
                            }}
                            className="flex-1 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-2xl active:scale-95 transition-all"
                        >
                            Save {capturedImages.length} Recs
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
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;