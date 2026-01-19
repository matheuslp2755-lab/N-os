import React, { useState, useRef, useEffect, useCallback } from 'react';
import { auth, db, doc, updateDoc, serverTimestamp } from '../../firebase';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'classic_vhs' | 'digicam_pro' | 'aesthetic_y2k' | 'tumblr_soft' | 'film_8mm' | 'cyber_mirror' | 'night_vibe' | 'faded_film';
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
    halation: number;
    chromatic: number;
    tint: string;
}

const PRESETS: Record<VibeEffect, EffectConfig> = {
    classic_vhs: { id: 'classic_vhs', name: 'VHS 2003', label: 'TAPE', grain: 0.7, blur: 1.8, temp: 8, glow: 0.3, saturation: 0.6, contrast: 1.3, exposure: 1.1, halation: 0.4, chromatic: 2.0, tint: 'rgba(0,30,100,0.08)' },
    digicam_pro: { id: 'digicam_pro', name: 'Digi-Pro', label: 'SONY', grain: 0.3, blur: 0.2, temp: -5, glow: 0.5, saturation: 1.4, contrast: 1.5, exposure: 1.2, halation: 0.2, chromatic: 0.5, tint: 'rgba(255,255,255,0.05)' },
    aesthetic_y2k: { id: 'aesthetic_y2k', name: 'Pure Y2K', label: 'CYBER', grain: 0.2, blur: 1.0, temp: 15, glow: 0.8, saturation: 0.8, contrast: 0.9, exposure: 1.1, halation: 0.6, chromatic: 1.2, tint: 'rgba(255,200,255,0.1)' },
    tumblr_soft: { id: 'tumblr_soft', name: 'Soft 2009', label: 'MOOD', grain: 0.5, blur: 0.6, temp: -10, glow: 0.4, saturation: 0.7, contrast: 0.8, exposure: 1.0, halation: 0.3, chromatic: 0.8, tint: 'rgba(100,100,150,0.12)' },
    film_8mm: { id: 'film_8mm', name: 'Reel 8mm', label: 'KODAK', grain: 0.9, blur: 1.2, temp: 20, glow: 0.2, saturation: 0.6, contrast: 1.1, exposure: 0.9, halation: 0.5, chromatic: 1.5, tint: 'rgba(150,80,0,0.15)' },
    cyber_mirror: { id: 'cyber_mirror', name: 'Hacker', label: 'GLITCH', grain: 0.6, blur: 0.5, temp: -20, glow: 0.6, saturation: 1.5, contrast: 1.4, exposure: 1.2, halation: 0.4, chromatic: 3.0, tint: 'rgba(0,255,150,0.08)' },
    night_vibe: { id: 'night_vibe', name: 'Low Night', label: 'ISO', grain: 1.0, blur: 2.0, temp: -5, glow: 0.7, saturation: 1.8, contrast: 1.6, exposure: 1.4, halation: 0.8, chromatic: 1.0, tint: 'rgba(50,0,100,0.2)' },
    faded_film: { id: 'faded_film', name: 'Faded G', label: 'FUJI', grain: 0.4, blur: 0.8, temp: 5, glow: 0.2, saturation: 0.5, contrast: 0.7, exposure: 1.1, halation: 0.1, chromatic: 0.4, tint: 'rgba(255,255,255,0.2)' }
};

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect>('classic_vhs');
    const [lensMM, setLensMM] = useState<LensMM>(35);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [viewingGallery, setViewingGallery] = useState(false);
    const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
    const [isCounting, setIsCounting] = useState(false);
    const [currentCount, setCurrentCount] = useState(0);
    const [showFlashAnim, setShowFlashAnim] = useState(false);
    const [showGrid, setShowGrid] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameId = useRef<number | null>(null);

    const renderState = useRef({ activeVibe, facingMode, lensMM });
    useEffect(() => {
        renderState.current = { activeVibe, facingMode, lensMM };
    }, [activeVibe, facingMode, lensMM]);

    const toggleTorch = async (on: boolean) => {
        if (streamRef.current && facingMode === 'environment') {
            const track = streamRef.current.getVideoTracks()[0];
            const capabilities = track.getCapabilities() as any;
            if (capabilities.torch) {
                try {
                    await track.applyConstraints({ advanced: [{ torch: on }] } as any);
                } catch (e) { console.warn("Torch failed", e); }
            }
        }
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
                if (!frameId.current) frameId.current = requestAnimationFrame(renderLoop);
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
                const { activeVibe: vibeId, facingMode: fMode, lensMM: mm } = renderState.current;
                const config = PRESETS[vibeId];

                const vw = video.videoWidth;
                const vh = video.videoHeight;
                canvas.width = vw;
                canvas.height = vh;
                
                // --- SISTEMA DE LENTE REAL (CROP) ---
                // 24mm: 1.0x | 35mm: 1.4x | 50mm: 2.0x | 85mm: 2.8x | 101mm: 3.5x
                const zoomFactors = { 24: 1.0, 35: 1.4, 50: 2.0, 85: 2.8, 101: 3.5 };
                const zoom = zoomFactors[mm];
                const sw = vw / zoom;
                const sh = vh / zoom;
                const sx = (vw - sw) / 2;
                const sy = (vh - sh) / 2;

                ctx.save();
                if (fMode === 'user') {
                    ctx.translate(vw, 0);
                    ctx.scale(-1, 1);
                }
                ctx.drawImage(video, sx, sy, sw, sh, 0, 0, vw, vh);
                ctx.restore();

                applyAestheticPipeline(ctx, vw, vh, config);
            }
        }
        frameId.current = requestAnimationFrame(renderLoop);
    };

    const applyAestheticPipeline = (ctx: CanvasRenderingContext2D, w: number, h: number, c: EffectConfig) => {
        // 1. Exposure & Contrast & Saturation (Direct Filter)
        ctx.filter = `brightness(${c.exposure}) contrast(${c.contrast}) saturate(${c.saturation}) hue-rotate(${c.temp}deg) blur(${c.blur}px)`;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w; tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.drawImage(ctx.canvas, 0, 0);
            ctx.filter = 'none';
            ctx.drawImage(tempCanvas, 0, 0);
        }

        // 2. Halation & Glow (Screen Layer)
        if (c.glow > 0 || c.halation > 0) {
            ctx.save();
            ctx.globalAlpha = Math.max(c.glow, c.halation) * 0.4;
            ctx.globalCompositeOperation = 'screen';
            ctx.filter = `blur(${25 * c.glow}px) brightness(1.3) saturate(1.5)`;
            ctx.drawImage(ctx.canvas, 0, 0);
            ctx.restore();
        }

        // 3. Digital Grain (Visual Impact)
        if (c.grain > 0) {
            ctx.save();
            ctx.globalAlpha = c.grain * 0.3;
            ctx.globalCompositeOperation = 'overlay';
            for (let i = 0; i < 300; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
            }
            ctx.restore();
        }

        // 4. Aesthetic Tinting
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = c.tint;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // 5. Date Stamp (Analog Classic)
        const now = new Date();
        const ds = `'${now.getFullYear().toString().slice(-2)} ${ (now.getMonth()+1).toString().padStart(2,'0') } ${ now.getDate().toString().padStart(2,'0') }`;
        ctx.font = 'bold 42px monospace';
        ctx.fillStyle = '#ffcc00'; // Amarelo Dazz
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8;
        ctx.fillText(ds, w - 260, h - 80);
        ctx.shadowBlur = 0;

        // 6. Optic Vignette (Focus Impact)
        const grad = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.9);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');
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

    const handleCapture = async () => {
        if (isCounting) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const isTorchOn = flashMode === 'on' && facingMode === 'environment';
        if (isTorchOn) await toggleTorch(true);

        setShowFlashAnim(true);
        setTimeout(() => setShowFlashAnim(false), 150);

        // Marca d'água Final
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.save();
            ctx.font = 'bold 32px "Courier New", Courier, monospace';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText('POWERED BY NÉOS', 60, canvas.height - 80);
            ctx.restore();
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImages(prev => [...prev, dataUrl]);
        if (isTorchOn) await toggleTorch(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col overflow-hidden touch-none h-[100dvh] font-sans text-white">
            {showFlashAnim && <div className="fixed inset-0 bg-white z-[1000] animate-flash-out"></div>}

            {/* TOP BAR */}
            <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50">
                <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-xl rounded-full border border-white/10 active:scale-90 transition-all text-2xl font-thin">&times;</button>
                
                <div className="flex gap-2 bg-black/40 backdrop-blur-xl rounded-full p-1 border border-white/10">
                    <button onClick={() => setFlashMode(f => f === 'on' ? 'off' : 'on')} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${flashMode === 'on' ? 'bg-amber-400 text-black' : 'text-white/40'}`}>⚡</button>
                    <button onClick={() => setShowGrid(!showGrid)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${showGrid ? 'bg-white text-black' : 'text-white/40'}`}>#</button>
                </div>

                <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-xl rounded-full border border-white/10 active:scale-90 transition-all">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </header>

            {/* VIEWPORT */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center overflow-hidden">
                {viewingGallery ? (
                    <div className="absolute inset-0 z-[200] bg-black flex flex-col animate-fade-in">
                        <header className="p-6 flex justify-between items-center bg-zinc-900/50 backdrop-blur-3xl border-b border-white/5">
                            <button onClick={() => setViewingGallery(false)} className="text-xs font-black uppercase tracking-widest text-zinc-400">Back</button>
                            <h3 className="text-xs font-black uppercase tracking-widest">{capturedImages.length} Recs</h3>
                            <button onClick={() => setCapturedImages([])} className="text-red-500 text-xs font-black uppercase">Clear</button>
                        </header>
                        <div className="flex-grow overflow-y-auto grid grid-cols-3 gap-0.5 p-0.5 no-scrollbar">
                            {capturedImages.map((img, i) => (
                                <div key={i} className="aspect-[3/4] relative group">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <a href={img} download={`neos-cam-${i}.jpg`} className="absolute bottom-2 right-2 bg-white text-black p-2 rounded-full shadow-2xl scale-75 active:scale-100 transition-transform">
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
                        
                        {/* LENS FRAME (Dynamic) */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div 
                                className="border-[0.5px] border-white/40 transition-all duration-700 ease-out rounded-2xl relative"
                                style={{ 
                                    width: `${100 / (lensMM === 24 ? 1.0 : lensMM === 35 ? 1.4 : lensMM === 50 ? 2.0 : lensMM === 85 ? 2.8 : 3.5)}%`,
                                    aspectRatio: '3/4',
                                    boxShadow: '0 0 0 2000px rgba(0,0,0,0.4)'
                                }}
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                    <span className="text-[10px] font-black uppercase tracking-widest">{lensMM}mm</span>
                                </div>
                                
                                {showGrid && (
                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                                        <div className="border-r border-b border-white/20"></div>
                                        <div className="border-r border-b border-white/20"></div>
                                        <div className="border-b border-white/20"></div>
                                        <div className="border-r border-b border-white/20"></div>
                                        <div className="border-r border-b border-white/20"></div>
                                        <div className="border-b border-white/20"></div>
                                    </div>
                                )}

                                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg"></div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* CONTROL PANEL */}
            <footer className="bg-black/95 backdrop-blur-3xl px-6 pb-12 pt-6 border-t border-white/5 z-50">
                {!viewingGallery ? (
                    <div className="flex flex-col gap-8">
                        
                        {/* LENS SELECTOR */}
                        <div className="flex justify-center gap-4">
                            {[24, 35, 50, 85, 101].map((mm) => (
                                <button 
                                    key={mm}
                                    onClick={() => setLensMM(mm as LensMM)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-[10px] font-black transition-all border ${lensMM === mm ? 'bg-white text-black border-white shadow-xl' : 'bg-transparent text-white/40 border-white/10 hover:border-white/30'}`}
                                >
                                    {mm}
                                </button>
                            ))}
                        </div>

                        {/* EFFECTS SLIDER */}
                        <div className="flex gap-6 overflow-x-auto no-scrollbar py-2 snap-x snap-mandatory">
                            {Object.values(PRESETS).map((eff) => (
                                <button
                                    key={eff.id}
                                    onClick={() => setActiveVibe(eff.id)}
                                    className={`flex flex-col items-center shrink-0 snap-center transition-all duration-500 ${activeVibe === eff.id ? 'scale-110 opacity-100' : 'scale-90 opacity-20 grayscale'}`}
                                >
                                    <div className={`w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center border-2 transition-all ${activeVibe === eff.id ? 'bg-zinc-800 border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'bg-zinc-900 border-white/5'}`}>
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter">{eff.label}</span>
                                        <span className={`text-[10px] font-black mt-1 ${activeVibe === eff.id ? 'text-white' : 'text-zinc-600'}`}>
                                            00{Object.values(PRESETS).indexOf(eff) + 1}
                                        </span>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase mt-3 tracking-widest ${activeVibe === eff.id ? 'text-white' : 'text-zinc-500'}`}>{eff.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* CAPTURE BUTTON */}
                        <div className="flex items-center justify-between">
                            <button 
                                onClick={() => setViewingGallery(true)}
                                className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center shadow-inner group active:scale-95 transition-transform"
                            >
                                {capturedImages.length > 0 ? (
                                    <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover opacity-60" />
                                ) : (
                                    <div className="w-6 h-6 border-2 border-white/20 rounded-lg group-hover:border-white/40 transition-colors"></div>
                                )}
                            </button>

                            <button 
                                onClick={handleCapture} 
                                className="w-24 h-24 rounded-full border-[6px] border-white/20 flex items-center justify-center p-2 active:scale-90 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)]"
                            >
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center relative">
                                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-zinc-200 to-white"></div>
                                    <div className="absolute inset-0 rounded-full border border-black/5"></div>
                                </div>
                            </button>

                            <div className="w-14 h-14"></div> {/* Spacer */}
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-4 animate-slide-up">
                        <button 
                            onClick={() => { setCapturedImages([]); setViewingGallery(false); }}
                            className="flex-1 py-5 bg-zinc-900 text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.5rem] border border-white/5 active:scale-95"
                        >
                            Discard all
                        </button>
                        <button 
                            onClick={() => {
                                capturedImages.forEach((img, i) => {
                                    const link = document.createElement('a');
                                    link.download = `neos-vibe-${Date.now()}-${i}.jpg`;
                                    link.href = img;
                                    link.click();
                                });
                                onClose();
                            }}
                            className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.5rem] shadow-2xl active:scale-95 transition-all"
                        >
                            Save to Gallery
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
                .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;