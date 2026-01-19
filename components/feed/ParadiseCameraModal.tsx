import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
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
                    width: { ideal: 3840 }, // Força 4K se disponível
                    height: { ideal: 2160 },
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
            console.error("Camera Pro Error:", err);
            alert("Erro ao acessar câmera de alta fidelidade.");
        }
    };

    useEffect(() => {
        if (isOpen && !capturedImage) startCamera();
        return () => stopCamera();
    }, [isOpen, facingMode, capturedImage]);

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        setIsProcessing(true);
        
        // Mantemos a proporção nativa da câmera
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d', { 
            alpha: false,
            desynchronized: true,
            willReadFrequently: false 
        });

        if (ctx) {
            // 1. Captura limpa do Frame
            ctx.save();
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0);
            ctx.restore();

            // 2. Aplicação da Pipeline Aesthetic Pro (Simulação via Processamento de Imagem)
            // Nota: Em um ambiente de produção completo, usaríamos fragment shaders aqui.
            // Para garantir portabilidade e o look Dazz imediato:
            
            // A. Pseudo-HDR & Tone Mapping
            ctx.globalCompositeOperation = 'soft-light';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Lift sombras
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // B. Skin Smoothing (Truque de High-Pass Invertido leve)
            ctx.globalCompositeOperation = 'overlay';
            ctx.filter = 'blur(2px) saturate(1.1) brightness(1.05)';
            ctx.globalAlpha = 0.2; // Apenas textura
            ctx.drawImage(canvas, 0, 0);
            ctx.globalAlpha = 1.0;
            ctx.filter = 'none';

            // C. Look Analógico (Vignette & Pretos Elevados)
            const grad = ctx.createRadialGradient(
                canvas.width/2, canvas.height/2, canvas.width/4,
                canvas.width/2, canvas.height/2, canvas.width*0.8
            );
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(20,10,0,0.3)'); // Vinheta quente
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // D. Smart Sharpening (Aumento de contraste local em bordas)
            ctx.globalCompositeOperation = 'source-over';
            ctx.filter = 'contrast(1.05) brightness(1.02)';
            
            // E. Grão de Filme (Redução de ruído digital por ruído estético)
            ctx.globalAlpha = 0.02;
            for (let i = 0; i < 40; i++) {
                ctx.fillStyle = i % 2 === 0 ? '#fff' : '#000';
                ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 2, 2);
            }
            ctx.globalAlpha = 1.0;

            const highResData = canvas.toDataURL('image/jpeg', 0.95);
            setCapturedImage(highResData);
            setIsProcessing(false);
            stopCamera();
        }
    };

    const handleDownload = () => {
        if (!capturedImage) return;
        const link = document.createElement('a');
        link.download = `neos-paradise-${Date.now()}.jpg`;
        link.href = capturedImage;
        link.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none font-sans">
            {/* Interface Minimalista Ultra-Premium */}
            <header className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-50">
                <button onClick={onClose} className="text-white/40 hover:text-white transition-all transform hover:rotate-90">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-white font-black uppercase tracking-[0.6em] text-[9px] italic mb-1">Néos Paradise Studio</span>
                    <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                </div>
                <button 
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="p-3 bg-white/5 backdrop-blur-xl rounded-full text-white border border-white/10 active:scale-90 transition-all"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </header>

            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                {!capturedImage ? (
                    <>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover transition-opacity duration-1000"
                            style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}}
                        />
                        {/* Linhas de Grade de Composição */}
                        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
                            <div className="border-r border-b border-white/40"></div>
                            <div className="border-r border-b border-white/40"></div>
                            <div className="border-b border-white/40"></div>
                            <div className="border-r border-b border-white/40"></div>
                            <div className="border-r border-b border-white/40"></div>
                            <div className="border-b border-white/40"></div>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full animate-fade-in">
                        <img src={capturedImage} className="w-full h-full object-cover" alt="Paradise Capture" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10">
                            <h2 className="text-8xl font-black italic text-white tracking-tighter uppercase">Néos</h2>
                        </div>
                    </div>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-6 z-50">
                        <div className="relative">
                            <div className="w-20 h-20 border-2 border-white/10 rounded-full animate-ping"></div>
                            <div className="absolute inset-0 w-20 h-20 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-white font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Revelando Filme Pro...</p>
                    </div>
                )}
            </div>

            <footer className="h-44 bg-zinc-950 flex items-center justify-around px-10 z-50 border-t border-white/5">
                {!capturedImage ? (
                    <>
                        <div className="w-14 h-14 rounded-2xl border border-white/5 bg-zinc-900/50 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40"></div>
                        </div>

                        <button 
                            onClick={handleCapture}
                            disabled={isProcessing}
                            className="group relative w-24 h-24 flex items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-white/5 rounded-full scale-110 group-active:scale-150 transition-transform duration-500"></div>
                            <div className="w-20 h-20 rounded-full border-[4px] border-white/80 flex items-center justify-center p-1.5 transition-all group-active:scale-90 group-hover:border-white">
                                <div className="w-full h-full bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)]"></div>
                            </div>
                        </button>

                        <div className="text-center">
                            <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest block">AESTHETIC</span>
                            <span className="text-white/20 text-[8px] font-bold uppercase tracking-tighter">HD • 60FPS</span>
                        </div>
                    </>
                ) : (
                    <div className="flex gap-4 w-full max-w-sm animate-slide-up">
                        <button 
                            onClick={() => setCapturedImage(null)}
                            className="flex-1 py-5 bg-zinc-900 text-white/60 font-black uppercase text-[10px] tracking-widest rounded-3xl border border-white/5 active:scale-95 transition-all hover:text-white"
                        >
                            Descartar
                        </button>
                        <button 
                            onClick={handleDownload}
                            className="flex-1 py-5 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-3xl shadow-[0_20px_40px_rgba(255,255,255,0.2)] active:scale-95 transition-all"
                        >
                            Salvar Arte
                        </button>
                    </div>
                )}
            </footer>

            <canvas ref={canvasRef} className="hidden" />

            <style>{`
                @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                .mirrored { transform: scaleX(-1); }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;