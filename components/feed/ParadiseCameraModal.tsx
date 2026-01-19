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
    const processingCanvasRef = useRef<HTMLCanvasElement>(null);

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
    };

    const startCamera = async () => {
        stopCamera();
        try {
            // Constraints avançadas para máxima qualidade
            const constraints = {
                video: {
                    facingMode,
                    width: { ideal: 4096 }, // Tenta 4K
                    height: { ideal: 4096 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };
            
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    requestAnimationFrame(processRealTimePreview);
                };
            }
        } catch (err) {
            console.error("Paradise Camera Access Error:", err);
            alert("Erro ao acessar câmera de alta resolução.");
        }
    };

    // Pipeline de processamento em tempo real (SIMULAÇÃO DE LOOK PROFISSIONAL)
    const processRealTimePreview = () => {
        if (!isOpen || !videoRef.current || !processingCanvasRef.current || capturedImage) return;

        const video = videoRef.current;
        const canvas = processingCanvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (ctx && video.readyState >= 2) {
            if (canvas.width !== video.videoWidth) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }

            // 1. Desenha o frame base (com espelhamento se for frontal)
            ctx.save();
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0);
            ctx.restore();

            // 2. Aplica Pipeline Aesthetic (Filtros de Pixel em tempo real)
            applyProPipeline(ctx, canvas.width, canvas.height);
        }

        requestAnimationFrame(processRealTimePreview);
    };

    const applyProPipeline = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // AJUSTES DE IMAGEM NATIVOS (Simulação de Hardware Cam)
        
        // A. Curva de Tons & HDR (Pretos Elevados e Alcance Dinâmico)
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(20, 20, 40, 0.15)'; // Tons frios nas sombras
        ctx.fillRect(0, 0, w, h);
        
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255, 200, 150, 0.1)'; // Warm Glow para pele
        ctx.fillRect(0, 0, w, h);

        // B. Skin Smoothing Seletivo (Filtro de média leve para textura de pele)
        // Em um app real usaríamos shaders pesados, aqui usamos um truque de blur suave com opacidade baixa
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = 'blur(4px) saturate(1.1)';
        ctx.globalAlpha = 0.15; // Apenas o suficiente para suavizar sem perder detalhe
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.globalAlpha = 1.0;
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';

        // C. Smart Sharpen (Nitidez seletiva via contraste)
        // Pequena vinheta para profundidade
        const vignette = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.8);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
        
        // D. Grão de Filme (Estilo Dazz/Analógico)
        ctx.globalAlpha = 0.03;
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
            ctx.fillRect(Math.random()*w, Math.random()*h, 2, 2);
        }
        ctx.globalAlpha = 1.0;
    };

    const handleCapture = () => {
        const sourceCanvas = processingCanvasRef.current;
        if (!sourceCanvas) return;

        setIsProcessing(true);
        
        // Captura em alta fidelidade
        setTimeout(() => {
            const highResData = sourceCanvas.toDataURL('image/jpeg', 0.95);
            setCapturedImage(highResData);
            setIsProcessing(false);
            stopCamera();
        }, 300);
    };

    const handleDownload = () => {
        if (!capturedImage) return;
        const link = document.createElement('a');
        link.download = `neos-paradise-${Date.now()}.jpg`;
        link.href = capturedImage;
        link.click();
    };

    useEffect(() => {
        if (isOpen && !capturedImage) startCamera();
        else stopCamera();
        return () => stopCamera();
    }, [isOpen, facingMode, capturedImage]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-fade-in overflow-hidden touch-none">
            {/* Header minimalista estilo App de Câmera Pro */}
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
                <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-white font-black uppercase tracking-[0.5em] text-[10px] italic mb-1">Paradise Cam</span>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse delay-75"></div>
                    </div>
                </div>
                <button 
                    onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </header>

            <div className="flex-grow relative bg-zinc-950 flex items-center justify-center">
                {/* O Vídeo fica oculto, usamos o canvas para o preview processado */}
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="hidden" 
                />
                
                <canvas 
                    ref={processingCanvasRef}
                    className={`w-full h-full object-cover transition-opacity duration-700 ${capturedImage ? 'opacity-0' : 'opacity-100'}`}
                />

                {capturedImage && (
                    <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover animate-fade-in" alt="Paradise Capture" />
                )}

                {/* Grid Auxiliar */}
                {!capturedImage && (
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
                        <div className="border-r border-b border-white/30"></div>
                        <div className="border-r border-b border-white/30"></div>
                        <div className="border-b border-white/30"></div>
                        <div className="border-r border-b border-white/30"></div>
                        <div className="border-r border-b border-white/30"></div>
                        <div className="border-b border-white/30"></div>
                    </div>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-50">
                        <div className="w-16 h-16 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin"></div>
                        <p className="text-white font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Otimizando sua beleza...</p>
                    </div>
                )}
            </div>

            <footer className="h-40 bg-black flex items-center justify-around px-8 z-50">
                {!capturedImage ? (
                    <>
                        <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden bg-zinc-900 flex items-center justify-center">
                            <svg className="w-6 h-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>

                        <button 
                            onClick={handleCapture}
                            disabled={isProcessing}
                            className="group relative w-20 h-20 flex items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl group-active:scale-150 transition-transform"></div>
                            <div className="w-16 h-16 rounded-full border-[3px] border-white flex items-center justify-center p-1 transition-transform active:scale-90">
                                <div className="w-full h-full bg-white rounded-full"></div>
                            </div>
                        </button>

                        <div className="w-12 text-center">
                            <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">RAW</span>
                        </div>
                    </>
                ) : (
                    <div className="flex gap-4 w-full max-w-sm animate-slide-up">
                        <button 
                            onClick={() => setCapturedImage(null)}
                            className="flex-1 py-4 bg-zinc-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl border border-white/10 active:scale-95 transition-all"
                        >
                            Descartar
                        </button>
                        <button 
                            onClick={handleDownload}
                            className="flex-1 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.3)] active:scale-95 transition-all"
                        >
                            Salvar na Galeria
                        </button>
                    </div>
                )}
            </footer>

            <canvas ref={canvasRef} className="hidden" />

            <style>{`
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
                .mirrored { transform: scaleX(-1); }
            `}</style>
        </div>
    );
};

export default ParadiseCameraModal;