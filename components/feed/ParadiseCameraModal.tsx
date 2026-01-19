import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'classic' | 'dream' | 'pearl' | 'noir' | 'sun';

interface VibeConfig {
    id: VibeEffect;
    name: string;
    icon: string;
    color: string;
}

const VIBES: VibeConfig[] = [
    { id: 'classic', name: 'Analógica', icon: '📸', color: 'text-orange-500' },
    { id: 'dream', name: 'Y2K Dream', icon: '✨', color: 'text-purple-400' },
    { id: 'pearl', name: 'Pérola', icon: '🐚', color: 'text-pink-300' },
    { id: 'noir', name: 'Noir', icon: '🌑', color: 'text-zinc-400' },
    { id: 'sun', name: 'Dourada', icon: '☀️', color: 'text-amber-500' },
];

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [activeVibe, setActiveVibe] = useState<VibeEffect>('classic');
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
                video: {
                    facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (err) {
            console.error("Camera Error:", err);
        }
    };

    useEffect(() => {
        if (isOpen && !capturedImage) startCamera();
        return () => stopCamera();
    }, [isOpen, facingMode, capturedImage]);

    const applyVibeFilters = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Base: Correção HDR Pro (Comum a todos)
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';

        switch (activeVibe) {
            case 'classic':
                // Cores quentes + Light Leak
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = 'rgba(255, 120, 0, 0.15)';
                ctx.fillRect(0, 0, w, h);
                const leak = ctx.createLinearGradient(0, 0, w * 0.3, 0);
                leak.addColorStop(0, 'rgba(255, 50, 0, 0.4)');
                leak.addColorStop(1, 'rgba(255, 50, 0, 0)');
                ctx.fillStyle = leak;
                ctx.fillRect(0, 0, w, h);
                break;

            case 'dream':
                // Soft Glow + Tint Roxo
                ctx.filter = 'brightness(1.1) saturate(1.2) blur(1px)';
                ctx.globalAlpha = 0.3;
                ctx.drawImage(ctx.canvas, 0, 0);
                ctx.globalAlpha = 1.0;
                ctx.filter = 'none';
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'rgba(180, 100, 255, 0.1)';
                ctx.fillRect(0, 0, w, h);
                break;

            case 'pearl':
                // Skin Smoothing + Glow Branco
                ctx.filter = 'saturate(0.9) brightness(1.15)';
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(255, 220, 220, 0.1)';
                ctx.fillRect(0, 0, w, h);
                ctx.filter = 'none';
                break;

            case 'noir':
                // P&B Cinematográfico
                ctx.filter = 'grayscale(1) contrast(1.3) brightness(0.9)';
                ctx.drawImage(ctx.canvas, 0, 0);
                ctx.filter = 'none';
                break;

            case 'sun':
                // Golden Hour Fake
                const sun = ctx.createRadialGradient(w, 0, 0, w, 0, w);
                sun.addColorStop(0, 'rgba(255, 200, 0, 0.3)');
                sun.addColorStop(1, 'rgba(255, 200, 0, 0)');
                ctx.fillStyle = sun;
                ctx.fillRect(0, 0, w, h);
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = 'rgba(255, 150, 0, 0.1)';
                ctx.fillRect(0, 0, w, h);
                break;
        }

        // Grão Universal para estética Film
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.03;
        for (let i = 0; i < 30; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#fff' : '#000';
            ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
        }
        ctx.globalAlpha = 1.0;

        // Vinheta Suave
        const vin = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.8);
        vin.addColorStop(0, 'rgba(0,0,0,0)');
        vin.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = vin;
        ctx.fillRect(0, 0, w, h);
    };

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 150);

        setIsProcessing(true);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            // Desenha original
            ctx.save();
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0);
            ctx.restore();

            // Processa estética
            applyVibeFilters(ctx, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            setCapturedImage(dataUrl);
            setIsProcessing(false);
            stopCamera();
        }
    };

    const handleDownload = () => {
        if (!capturedImage) return;
        const link = document.createElement('a');
        link.download = `paradise-${activeVibe}-${Date.now()}.jpg`;
        link.href = capturedImage;
        link.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/60 to-transparent">
                <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-white font-black uppercase tracking-[0.5em] text-[10px] italic">Câmera do Paraíso</span>
                    <span className="text-orange-500 text-[8px] font-bold uppercase tracking-widest mt-1">Estúdio de Vibes</span>
                </div>
                <button 
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white border border-white/10 active:scale-90 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </header>

            {/* Viewport */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                {!capturedImage ? (
                    <>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className={`w-full h-full object-cover transition-all duration-700 ${activeVibe === 'noir' ? 'grayscale contrast-125' : ''}`}
                            style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}}
                        />
                        {/* Overlay Dinâmico de Efeito (Visual apenas no preview) */}
                        <div className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
                            activeVibe === 'dream' ? 'bg-purple-500/10' : 
                            activeVibe === 'classic' ? 'bg-orange-500/5' : 
                            activeVibe === 'sun' ? 'bg-yellow-500/10' : ''
                        }`} />
                    </>
                ) : (
                    <img src={capturedImage} className="w-full h-full object-cover animate-fade-in" />
                )}

                {/* Efeito de Flash */}
                {showFlash && <div className="absolute inset-0 bg-white z-[100] animate-flash"></div>}

                {/* Animação Processando */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-50">
                        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <p className="text-white font-black text-[9px] uppercase tracking-widest">Criando sua vibe...</p>
                    </div>
                )}
            </div>

            {/* Footer / Controles */}
            <footer className="bg-black flex flex-col items-center pb-10 pt-4 z-50 border-t border-white/5">
                {!capturedImage && (
                    <div className="w-full flex flex-col items-center gap-6">
                        {/* Seletor de Vibes */}
                        <div className="flex gap-4 overflow-x-auto no-scrollbar px-10 w-full justify-center">
                            {VIBES.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setActiveVibe(v.id)}
                                    className="flex flex-col items-center gap-2 shrink-0 transition-all active:scale-90"
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                                        activeVibe === v.id ? 'bg-white scale-110 shadow-lg' : 'bg-zinc-900 opacity-40'
                                    }`}>
                                        {v.icon}
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-tighter ${
                                        activeVibe === v.id ? 'text-white' : 'text-zinc-600'
                                    }`}>
                                        {v.name}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Botão de Captura */}
                        <button 
                            onClick={handleCapture}
                            disabled={isProcessing}
                            className="group relative w-20 h-20 flex items-center justify-center"
                        >
                            <div className={`absolute inset-0 ${VIBES.find(v => v.id === activeVibe)?.color.replace('text', 'bg')} opacity-20 rounded-full blur-xl animate-pulse`}></div>
                            <div className="w-16 h-16 rounded-full border-[4px] border-white flex items-center justify-center p-1.5 transition-all group-active:scale-90">
                                <div className="w-full h-full bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)]"></div>
                            </div>
                        </button>
                    </div>
                )}

                {capturedImage && (
                    <div className="flex gap-4 w-full max-w-sm px-6 animate-slide-up">
                        <button 
                            onClick={() => setCapturedImage(null)}
                            className="flex-1 py-5 bg-zinc-900 text-white font-black uppercase text-[10px] tracking-widest rounded-[2rem] border border-white/5 active:scale-95 transition-all"
                        >
                            Refazer
                        </button>
                        <button 
                            onClick={handleDownload}
                            className="flex-1 py-5 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-[2rem] shadow-xl active:scale-95 transition-all"
                        >
                            Salvar Foto
                        </button>
                    </div>
                )}
            </footer>

            <canvas ref={canvasRef} className="hidden" />

            <style>{`
                @keyframes flash { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
                .animate-flash { animation: flash 0.15s ease-out forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;