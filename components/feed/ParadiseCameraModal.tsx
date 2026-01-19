import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type VibeEffect = 'cyber' | 'angelic' | 'vintage' | 'golden' | 'icy' | 'classic' | 'dream' | 'pearl' | 'noir' | 'sun';

interface VibeConfig {
    id: VibeEffect;
    name: string;
    icon: string;
    description: string;
}

const VIBES: VibeConfig[] = [
    { id: 'cyber', name: 'Cyber Neon', icon: '🏮', description: 'Look futurista com tons neon' },
    { id: 'angelic', name: 'Angel Glow', icon: '👼', description: 'Brilho etéreo e pele divina' },
    { id: 'vintage', name: 'Filme 35mm', icon: '🎞️', description: 'Realismo analógico puro' },
    { id: 'golden', name: 'Hora de Ouro', icon: '🌅', description: 'Luz mágica de pôr do sol' },
    { id: 'icy', name: 'Icy Crystal', icon: '💎', description: 'Nitidez extrema e tons frios' },
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
                video: {
                    facingMode,
                    width: { ideal: 2160 },
                    height: { ideal: 3840 },
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
            console.error("Paradise Camera Error:", err);
        }
    };

    useEffect(() => {
        if (isOpen && !capturedImage) startCamera();
        return () => stopCamera();
    }, [isOpen, facingMode, capturedImage]);

    const applyEliteFilters = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Base Pro: HDR e Black Point Lift
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';

        switch (activeVibe) {
            case 'cyber':
                // Cyber Neon: Azul nas sombras, Rosa nos realces
                ctx.globalCompositeOperation = 'screen';
                const cyberGrad = ctx.createLinearGradient(0, 0, w, h);
                cyberGrad.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
                cyberGrad.addColorStop(1, 'rgba(255, 0, 255, 0.1)');
                ctx.fillStyle = cyberGrad;
                ctx.fillRect(0, 0, w, h);
                ctx.filter = 'contrast(1.2) saturate(1.4) hue-rotate(-10deg)';
                break;

            case 'angelic':
                // Angelic Glow: Pele perolada e brilho difuso
                ctx.filter = 'brightness(1.1) saturate(1.1) blur(4px)';
                ctx.globalAlpha = 0.25;
                ctx.drawImage(ctx.canvas, 0, 0);
                ctx.globalAlpha = 1.0;
                ctx.filter = 'none';
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(255, 240, 245, 0.1)';
                ctx.fillRect(0, 0, w, h);
                break;

            case 'vintage':
                // Vintage 35mm: Grão pesado e cores Kodak
                ctx.filter = 'sepia(0.2) contrast(1.1) brightness(0.95)';
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = 'rgba(255, 100, 0, 0.05)'; // Tint quente
                ctx.fillRect(0, 0, w, h);
                break;

            case 'golden':
                // Golden Hour Pro: Sol lateral e tons bronze
                const sunSide = ctx.createRadialGradient(w, h * 0.2, 0, w, h * 0.2, w * 1.5);
                sunSide.addColorStop(0, 'rgba(255, 180, 0, 0.4)');
                sunSide.addColorStop(0.5, 'rgba(255, 100, 0, 0.1)');
                sunSide.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = sunSide;
                ctx.fillRect(0, 0, w, h);
                ctx.filter = 'saturate(1.3) contrast(1.05)';
                break;

            case 'icy':
                // Icy Crystal: Frio e Nítido
                ctx.filter = 'contrast(1.15) brightness(1.05) saturate(0.85) hue-rotate(185deg)';
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = 'rgba(0, 200, 255, 0.1)';
                ctx.fillRect(0, 0, w, h);
                break;
        }

        // Camada de Textura Profissional (Grão Cinematográfico)
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.04;
        for (let i = 0; i < 60; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
            ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
        }
        ctx.globalAlpha = 1.0;

        // Vinheta de Profundidade
        const vignette = ctx.createRadialGradient(w / 2, h / 2, w / 4, w / 2, h / 2, w * 0.9);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
    };

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 200);

        setIsProcessing(true);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (ctx) {
            ctx.save();
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0);
            ctx.restore();

            if (activeVibe) applyEliteFilters(ctx, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
            setCapturedImage(dataUrl);
            setIsProcessing(false);
            stopCamera();
        }
    };

    const handleDownload = () => {
        if (!capturedImage) return;
        const link = document.createElement('a');
        link.download = `neos-paradise-${activeVibe || 'raw'}-${Date.now()}.jpg`;
        link.href = capturedImage;
        link.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-sans">
            {/* Interface Minimalista Ultra-Luxo */}
            <header className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-50">
                <button onClick={onClose} className="text-white/30 hover:text-white transition-all transform hover:rotate-90">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-white font-black uppercase tracking-[0.7em] text-[10px] italic mb-1 drop-shadow-lg">Paradise Studio</span>
                    <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                </div>
                <button 
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="p-3 bg-white/5 backdrop-blur-3xl rounded-full text-white border border-white/10 active:scale-90 transition-all"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </header>

            {/* Viewport de Prévia Criativa */}
            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                {!capturedImage ? (
                    <>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className={`w-full h-full object-cover transition-all duration-1000 ${
                                activeVibe === 'noir' ? 'grayscale contrast-125' : 
                                activeVibe === 'icy' ? 'hue-rotate(180deg) saturate(0.8)' : ''
                            }`}
                            style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}}
                        />
                        {/* Overlay Visual de Vibe em Tempo Real */}
                        <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
                            activeVibe === 'cyber' ? 'bg-purple-500/10 shadow-[inset_0_0_100px_rgba(255,0,255,0.2)]' : 
                            activeVibe === 'golden' ? 'bg-orange-400/10 shadow-[inset_0_0_100px_rgba(255,165,0,0.1)]' : 
                            activeVibe === 'angelic' ? 'bg-white/10 backdrop-blur-[1px]' : ''
                        }`} />
                    </>
                ) : (
                    <div className="w-full h-full animate-fade-in">
                        <img src={capturedImage} className="w-full h-full object-cover" alt="Paradise Capture" />
                        <div className="absolute bottom-10 left-10 pointer-events-none opacity-20">
                            <h2 className="text-4xl font-black italic text-white tracking-tighter uppercase">NÉOS STUDIO</h2>
                        </div>
                    </div>
                )}

                {/* Efeito de Obturador (Flash) */}
                {showFlash && <div className="absolute inset-0 bg-white z-[100] animate-flash"></div>}

                {/* Animação Processando */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-6 z-50">
                        <div className="relative">
                            <div className="w-20 h-20 border-2 border-white/5 rounded-full animate-ping"></div>
                            <div className="absolute inset-0 w-20 h-20 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-white font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">Revelando sua Vibe...</p>
                    </div>
                )}
            </div>

            {/* Footer de Controles e Seleção de Vibes */}
            <footer className="bg-zinc-950 flex flex-col items-center pb-12 pt-6 z-50 border-t border-white/5">
                {!capturedImage && (
                    <div className="w-full flex flex-col items-center gap-8">
                        {/* Carrossel de Efeitos de Elite */}
                        <div className="flex gap-5 overflow-x-auto no-scrollbar px-10 w-full justify-center">
                            {VIBES.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setActiveVibe(v.id)}
                                    className="flex flex-col items-center gap-3 shrink-0 transition-all active:scale-90"
                                >
                                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl transition-all duration-500 ${
                                        activeVibe === v.id 
                                        ? 'bg-white scale-110 shadow-[0_0_30px_rgba(255,255,255,0.3)] rotate-3' 
                                        : 'bg-zinc-900 opacity-40 hover:opacity-100'
                                    }`}>
                                        {v.icon}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                        activeVibe === v.id ? 'text-white' : 'text-zinc-600'
                                    }`}>
                                        {v.name}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Botão de Captura - Aparece dinamicamente ou brilha quando o efeito é escolhido */}
                        <button 
                            onClick={handleCapture}
                            disabled={isProcessing}
                            className={`group relative transition-all duration-500 transform ${activeVibe ? 'scale-110 translate-y-0 opacity-100' : 'scale-90 translate-y-4 opacity-50'}`}
                        >
                            <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 ${activeVibe ? 'bg-white/20 animate-pulse' : 'bg-transparent'}`}></div>
                            <div className="w-24 h-24 rounded-full border-[5px] border-white/90 flex items-center justify-center p-2 transition-all active:scale-75">
                                <div className="w-full h-full bg-white rounded-full shadow-[0_0_25px_rgba(255,255,255,0.6)]"></div>
                            </div>
                        </button>
                    </div>
                )}

                {/* Opções de Salvamento Pós-Clique */}
                {capturedImage && (
                    <div className="flex gap-4 w-full max-w-sm px-6 animate-slide-up">
                        <button 
                            onClick={() => setCapturedImage(null)}
                            className="flex-1 py-6 bg-zinc-900 text-white/40 font-black uppercase text-[10px] tracking-[0.3em] rounded-[2.5rem] border border-white/5 active:scale-95 transition-all hover:text-white"
                        >
                            Refazer
                        </button>
                        <button 
                            onClick={handleDownload}
                            className="flex-1 py-6 bg-white text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-[2.5rem] shadow-[0_20px_40px_rgba(255,255,255,0.2)] active:scale-95 transition-all"
                        >
                            Salvar Arte
                        </button>
                    </div>
                )}
            </footer>

            <canvas ref={canvasRef} className="hidden" />

            <style>{`
                @keyframes flash { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
                .animate-flash { animation: flash 0.2s ease-out forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;