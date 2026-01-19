import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'disposable' | 'lomo' | 'iso6400' | 'dusty' | 'leak';

interface VibeConfig {
    id: VibeEffect;
    name: string;
    icon: string;
    description: string;
}

const VIBES: VibeConfig[] = [
    { id: 'disposable', name: '90s Flash', icon: '📸', description: 'Descartável com carimbo de data' },
    { id: 'lomo', name: 'Lomo-Fi', icon: '🌈', description: 'Cores vibrantes e cores vazadas' },
    { id: 'iso6400', name: 'Night ISO', icon: '🌌', description: 'Ruído extremo e tons lavados' },
    { id: 'dusty', name: 'Dusty Archive', icon: '🎞️', description: 'Riscos, poeira e desfoque' },
    { id: 'leak', name: 'Light Leak', icon: '🔥', description: 'Vazamentos de luz solar' },
];

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
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

    const applyAestheticFlaws = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // 1. ABERRAÇÃO CROMÁTICA (RGB SHIFT) - Essencial para o look "lente barata"
        if (activeVibe === 'lomo' || activeVibe === 'disposable') {
            const shift = 4;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = data[i + shift] || data[i]; // Red shift
                data[i + 2] = data[i - shift] || data[i + 2]; // Blue shift
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // 2. GRÃO E RUÍDO (Pixel Noise)
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = activeVibe === 'iso6400' ? 0.4 : 0.15;
        for (let i = 0; i < (activeVibe === 'iso6400' ? 1000 : 400); i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
            ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }

        // 3. EFEITOS ESPECÍFICOS
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';

        switch (activeVibe) {
            case 'disposable':
                // Cores lavadas e flash estourado fake
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(0, 0, w, h);
                ctx.filter = 'saturate(1.2) contrast(0.9) brightness(1.1)';
                ctx.drawImage(ctx.canvas, 0, 0);
                break;

            case 'lomo':
                // Vinheta circular forte
                const lomoVin = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.8);
                lomoVin.addColorStop(0, 'rgba(0,0,0,0)');
                lomoVin.addColorStop(1, 'rgba(0,0,0,0.7)');
                ctx.fillStyle = lomoVin;
                ctx.fillRect(0, 0, w, h);
                ctx.filter = 'saturate(2) contrast(1.2)';
                break;

            case 'iso6400':
                // Pretos acinzentados (Lift black point)
                ctx.globalCompositeOperation = 'lighten';
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, w, h);
                ctx.globalCompositeOperation = 'source-over';
                ctx.filter = 'grayscale(0.3) contrast(0.8)';
                break;

            case 'dusty':
                // Riscos de filme e poeira
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                for(let i=0; i<5; i++) {
                    const x = Math.random() * w;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x + (Math.random()-0.5)*10, h);
                    ctx.stroke();
                }
                ctx.filter = 'blur(1px) sepia(0.2)';
                break;

            case 'leak':
                // Vazamento de luz laranja
                const leak = ctx.createLinearGradient(0, 0, w, 0);
                leak.addColorStop(0, 'rgba(255, 80, 0, 0)');
                leak.addColorStop(0.8, 'rgba(255, 50, 0, 0.4)');
                leak.addColorStop(1, 'rgba(255, 150, 0, 0.6)');
                ctx.fillStyle = leak;
                ctx.fillRect(0, 0, w, h);
                break;
        }

        // 4. CARIMBO DE DATA (Estilo anos 90)
        if (activeVibe === 'disposable' || activeVibe === 'dusty') {
            ctx.filter = 'none';
            ctx.font = 'bold 40px "Courier New", monospace';
            ctx.fillStyle = '#ff9100';
            ctx.shadowColor = 'rgba(255,0,0,0.5)';
            ctx.shadowBlur = 5;
            const dateStr = `'98 12 05`; // Data fixa estética
            ctx.fillText(dateStr, w - 250, h - 80);
        }

        // 5. VINHETA GERAL (Lente antiga)
        const vin = ctx.createRadialGradient(w/2, h/2, w/3, w/2, h/2, w);
        vin.addColorStop(0, 'rgba(0,0,0,0)');
        vin.addColorStop(1, 'rgba(0,0,0,0.3)');
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
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0);
            ctx.restore();

            applyAestheticFlaws(ctx, canvas.width, canvas.height);

            setCapturedImage(canvas.toDataURL('image/jpeg', 0.8)); // 0.8 para leve compressão estética
            setIsProcessing(false);
            stopCamera();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-mono">
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
                <button onClick={onClose} className="text-white/20 hover:text-white text-4xl font-thin">&times;</button>
                <div className="text-center">
                    <span className="text-[10px] text-white/40 uppercase tracking-[0.4em]">Imperfection Engine v1.0</span>
                </div>
                <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="p-2 text-white/40"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
            </header>

            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                {!capturedImage ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale opacity-50" />
                ) : (
                    <img src={capturedImage} className="w-full h-full object-contain" />
                )}
                {showFlash && <div className="absolute inset-0 bg-white z-[100]"></div>}
                {isProcessing && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white text-[10px] uppercase tracking-widest">Processando Ruído...</div>}
            </div>

            <footer className="bg-zinc-950 p-6 z-50 flex flex-col items-center gap-8 border-t border-white/5">
                {!capturedImage && (
                    <>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar w-full justify-center px-4">
                            {VIBES.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setActiveVibe(v.id)}
                                    className={`flex flex-col items-center gap-2 shrink-0 transition-all ${activeVibe === v.id ? 'scale-110' : 'opacity-40'}`}
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 ${activeVibe === v.id ? 'border-orange-500 bg-orange-500/10' : 'border-white/10'}`}>
                                        {v.icon}
                                    </div>
                                    <span className="text-[9px] text-white uppercase font-bold">{v.name}</span>
                                </button>
                            ))}
                        </div>

                        {activeVibe && (
                            <button onClick={handleCapture} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 group">
                                <div className="w-full h-full bg-white rounded-full group-active:scale-90 transition-transform"></div>
                            </button>
                        )}
                    </>
                )}

                {capturedImage && (
                    <div className="flex gap-4 w-full max-w-xs">
                        <button onClick={() => setCapturedImage(null)} className="flex-1 py-4 border border-white/10 text-white/40 text-[10px] uppercase font-bold rounded-xl">Descartar</button>
                        <a href={capturedImage} download={`neos-retro-${Date.now()}.jpg`} className="flex-1 py-4 bg-orange-600 text-white text-[10px] uppercase font-bold rounded-xl text-center">Salvar no Rolo</a>
                    </div>
                )}
            </footer>

            <canvas ref={canvasRef} className="hidden" />
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;