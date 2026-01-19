import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../common/Button';

interface ParadiseCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ParadiseCameraModal: React.FC<ParadiseCameraModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
    };

    const startCamera = async () => {
        stopCamera();
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;
        } catch (err) {
            console.error("Paradise Camera access error:", err);
            alert("Erro ao acessar a câmera.");
        }
    };

    useEffect(() => {
        if (isOpen && !capturedImage) startCamera();
        else stopCamera();
        return () => stopCamera();
    }, [isOpen, facingMode, capturedImage]);

    const applyAestheticFilter = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        // 1. Tonalidade Quente (Vintage Film Look)
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255, 140, 0, 0.15)'; // Toque âmbar
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // 2. Light Leak (Vazamento de Luz lateral estilo Dazz)
        const leak = ctx.createLinearGradient(0, 0, width, 0);
        leak.addColorStop(0, 'rgba(255, 69, 0, 0.4)');
        leak.addColorStop(0.15, 'rgba(255, 69, 0, 0.1)');
        leak.addColorStop(0.4, 'rgba(255, 69, 0, 0)');
        ctx.fillStyle = leak;
        ctx.fillRect(0, 0, width, height);

        // 3. Granulação (Grain/Texture)
        for (let i = 0; i < 8000; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const opacity = Math.random() * 0.05;
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fillRect(x, y, 1, 1);
        }

        // 4. Vinheta
        const vignette = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width * 0.8);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        // 5. Marca d'água discreta "Néos Paradise"
        ctx.font = 'bold 24px serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('NÉOS PARADISE', 40, height - 40);
    };

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        setIsProcessing(true);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
            // Desenha o frame base
            ctx.save();
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();

            // Aplica o pipeline estético
            applyAestheticFilter(ctx, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setCapturedImage(dataUrl);
            setIsProcessing(false);
            stopCamera();
        }
    };

    const handleDownload = () => {
        if (!capturedImage) return;
        const link = document.createElement('a');
        link.download = `paradise-${Date.now()}.jpg`;
        link.href = capturedImage;
        link.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none">
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
                <button onClick={onClose} className="text-white text-4xl font-thin hover:rotate-90 transition-transform active:scale-90">&times;</button>
                <h2 className="text-white font-black uppercase tracking-[0.4em] text-[10px] italic">Câmera do Paraíso</h2>
                <div className="w-10" />
            </header>

            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                {!capturedImage ? (
                    <>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover" 
                            style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}}
                        />
                        <div className="absolute inset-0 pointer-events-none border-[20px] border-black/20"></div>
                    </>
                ) : (
                    <img src={capturedImage} className="w-full h-full object-cover animate-fade-in" alt="Paradise Capture" />
                )}

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 z-30">
                        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white font-black text-[9px] uppercase tracking-widest">Revelando filme...</p>
                    </div>
                )}
            </div>

            <footer className="p-10 bg-black flex items-center justify-center gap-12 relative">
                {!capturedImage ? (
                    <>
                        <button 
                            onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                            className="p-4 bg-zinc-900 rounded-full text-white active:scale-90 transition-transform"
                        >
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>

                        <button 
                            onClick={handleCapture}
                            disabled={isProcessing}
                            className="w-20 h-20 rounded-full border-[6px] border-white p-1 shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-90 transition-all"
                        >
                            <div className="w-full h-full bg-white rounded-full"></div>
                        </button>

                        <div className="w-14" />
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-6 w-full max-w-xs animate-slide-up">
                        <div className="flex gap-4 w-full">
                            <button 
                                onClick={handleDownload}
                                className="flex-1 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all"
                            >
                                Salvar na Galeria
                            </button>
                            <button 
                                onClick={() => setCapturedImage(null)}
                                className="flex-1 py-4 bg-zinc-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl border border-white/10 active:scale-95 transition-all"
                            >
                                Tirar Outra
                            </button>
                        </div>
                    </div>
                )}
            </footer>

            <canvas ref={canvasRef} className="hidden" />

            <style>{`
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;