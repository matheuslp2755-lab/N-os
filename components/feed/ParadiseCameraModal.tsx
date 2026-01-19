import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'vhs' | 'ccd' | 'cinema' | 'disposable' | 'noir';

interface VibeConfig {
    id: VibeEffect;
    name: string;
    model: string;
    description: string;
}

const VIBES: VibeConfig[] = [
    { id: 'vhs', name: 'VHS-86', model: 'Handycam', description: 'Ruído analógico e linhas de scan' },
    { id: 'ccd', name: 'CCD-04', model: 'Cyber-Shot', description: 'Estética Y2K e cores digitais' },
    { id: 'cinema', name: '35mm Pro', model: 'Leica M6', description: 'Grão denso e light leaks' },
    { id: 'disposable', name: 'QuickSnap', model: 'Fujifilm', description: 'Flash e data retro' },
    { id: 'noir', name: 'Noir Film', model: 'B&W Film', description: 'Contraste e sujeira de filme' },
];

const CameraIcon = ({ type }: { type: VibeEffect }) => {
    switch (type) {
        case 'vhs':
            return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5v14h16V5H4zm14 12H6V7h12v10zM17 9h-2v2h2V9zm-4 0h-2v2h2V9zM9 9H7v2h2V9z"/></svg>;
        case 'ccd':
            return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm7-8h-2V7h2v2z"/></svg>;
        case 'cinema':
            return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>;
        case 'disposable':
            return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>;
        case 'noir':
            return <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>;
    }
};

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
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
            }
        } catch (err) {
            console.error("Paradise Error:", err);
        }
    };

    useEffect(() => {
        if (isOpen && !capturedImage) startCamera();
        return () => stopCamera();
    }, [isOpen, facingMode, capturedImage]);

    const applyAestheticEngine = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // 1. ABERRAÇÃO CROMÁTICA RADIAL (Lente Vintage)
        if (activeVibe === 'vhs' || activeVibe === 'cinema') {
            const shift = activeVibe === 'vhs' ? 8 : 4;
            const originalData = new Uint8ClampedArray(data);
            for (let i = 0; i < data.length; i += 4) {
                const x = (i / 4) % w;
                const y = Math.floor((i / 4) / w);
                const dx = x - w/2;
                const dy = y - h/2;
                const dist = Math.sqrt(dx*dx + dy*dy) / (w/2);
                
                if (dist > 0.3) {
                    const offset = Math.floor(shift * dist);
                    data[i] = originalData[i + offset * 4] || data[i]; // Red
                    data[i + 2] = originalData[i - offset * 4] || data[i + 2]; // Blue
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // 2. EFEITOS DE CAMADA (FILTROS)
        ctx.globalCompositeOperation = 'overlay';
        
        // GRÃO DE FILME REALISTA
        ctx.globalAlpha = activeVibe === 'noir' ? 0.4 : 0.18;
        for (let i = 0; i < 2000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
            ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;

        switch (activeVibe) {
            case 'vhs':
                // Scanlines e ruído de fita
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                for (let i = 0; i < h; i += 4) ctx.fillRect(0, i, w, 1);
                ctx.filter = 'contrast(1.2) saturate(0.8) brightness(1.1) blur(0.5px)';
                ctx.drawImage(ctx.canvas, 0, 0);
                // Data VHS azul
                ctx.font = 'bold 36px monospace';
                ctx.fillStyle = '#00f2ff';
                ctx.fillText('PLAY 00:24:12', 60, h - 120);
                break;

            case 'ccd':
                // Bloom e cores lavadas Y2K
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.filter = 'blur(15px)';
                ctx.drawImage(ctx.canvas, 0, 0);
                ctx.globalCompositeOperation = 'source-over';
                ctx.filter = 'saturate(1.6) contrast(0.9) brightness(1.1)';
                ctx.drawImage(ctx.canvas, 0, 0);
                break;

            case 'cinema':
                // Teal & Orange sofisticado + Light Leak
                const leak = ctx.createRadialGradient(0, 0, 0, 0, 0, w*1.2);
                leak.addColorStop(0, 'rgba(255, 50, 0, 0.4)');
                leak.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = leak;
                ctx.fillRect(0,0,w,h);
                ctx.filter = 'contrast(1.1) sepia(0.2) hue-rotate(-10deg)';
                break;

            case 'disposable':
                // Flash estourado e carimbo amarela
                ctx.filter = 'brightness(1.2) contrast(1.1) saturate(1.3)';
                ctx.drawImage(ctx.canvas, 0, 0);
                ctx.font = '42px "Courier New", monospace';
                ctx.fillStyle = '#ffb300';
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 4;
                ctx.fillText(`'98 08 24`, w - 240, h - 80);
                break;

            case 'noir':
                ctx.filter = 'grayscale(1) contrast(1.4) brightness(0.9)';
                ctx.drawImage(ctx.canvas, 0, 0);
                // Sujeira de filme (Film Scratches)
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                for(let i=0; i<3; i++) {
                    const x = Math.random()*w;
                    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x+(Math.random()-0.5)*20, h); ctx.stroke();
                }
                break;
        }

        // VINHETA FINAL (Lente Antiga)
        const vin = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.8);
        vin.addColorStop(0, 'rgba(0,0,0,0)');
        vin.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vin;
        ctx.fillRect(0, 0, w, h);
    };

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 100);

        setIsProcessing(true);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.save();
            if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
            ctx.drawImage(video, 0, 0);
            ctx.restore();

            if (activeVibe) applyAestheticEngine(ctx, canvas.width, canvas.height);

            setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
            setIsProcessing(false);
            stopCamera();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-mono">
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/60 to-transparent">
                <button onClick={onClose} className="text-white/60 hover:text-white text-3xl font-thin active:scale-90 transition-transform">&times;</button>
                <div className="text-center">
                    <span className="text-[10px] text-white/50 uppercase tracking-[0.5em] font-black drop-shadow-md">Paradise Cam System</span>
                </div>
                <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="p-2 text-white/60 active:text-white active:rotate-180 transition-all duration-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </header>

            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                {!capturedImage ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-90 transition-opacity" style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}} />
                ) : (
                    <img src={capturedImage} className="w-full h-full object-contain animate-fade-in" />
                )}
                {showFlash && <div className="absolute inset-0 bg-white z-[100] animate-pulse"></div>}
                {isProcessing && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white text-[10px] uppercase tracking-[0.5em] animate-pulse">Desenvolvendo Filme...</div>}
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

                        {activeVibe && (
                            <button 
                                onClick={handleCapture} 
                                className="w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center p-1.5 active:scale-90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                            >
                                <div className="w-full h-full bg-white rounded-full"></div>
                            </button>
                        )}
                    </>
                )}

                {capturedImage && (
                    <div className="flex gap-4 w-full max-w-xs animate-slide-up">
                        <button onClick={() => setCapturedImage(null)} className="flex-1 py-5 bg-zinc-900 text-white/40 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 active:scale-95 transition-all">Descartar</button>
                        <a href={capturedImage} download={`neos-vibe-${Date.now()}.jpg`} className="flex-1 py-5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl text-center shadow-xl active:scale-95 transition-all">Salvar Foto</a>
                    </div>
                )}
            </footer>

            <canvas ref={canvasRef} className="hidden" />
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;