import React, { useState, useEffect, useRef } from 'react';
import { auth, db, doc, setDoc, serverTimestamp, deleteDoc, updateDoc, arrayUnion, arrayRemove, collection, getDoc, addDoc, onSnapshot, query, where } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';
import { useCall } from '../../context/CallContext';

type Pulse = {
    id: string;
    mediaUrl: string;
    legenda: string;
    textPosition?: { x: number, y: number };
    imageScale?: number;
    filter?: string;
    createdAt: { seconds: number; nanoseconds: number };
    authorId: string;
    weather?: { temp: number; code: number };
    musicInfo?: {
        nome: string;
        artista: string;
        capa: string;
        preview: string;
        startTime?: number;
        position?: { x: number; y: number };
        hideCover?: boolean;
    };
};

interface PulseViewerModalProps {
    isOpen: boolean;
    pulses: Pulse[];
    initialPulseIndex: number;
    authorInfo: { id: string, username: string; avatar: string };
    onClose: () => void;
    onDelete: (pulse: Pulse) => void;
    onViewProfile?: (userId: string) => void;
}

const PulseViewerModal: React.FC<PulseViewerModalProps> = ({ isOpen, pulses, initialPulseIndex, authorInfo, onClose, onDelete, onViewProfile }) => {
    const { t } = useLanguage();
    const { isGlobalMuted, setGlobalMuted } = useCall();
    const [currentIndex, setCurrentIndex] = useState(initialPulseIndex);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [videoDuration, setVideoDuration] = useState(12);
    const [progressKey, setProgressKey] = useState(0);
    const [pulseLikes, setPulseLikes] = useState<string[]>([]);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => { if (isOpen) setCurrentIndex(initialPulseIndex); }, [isOpen, initialPulseIndex]);

    const currentPulse = pulses[currentIndex];
    const currentUser = auth.currentUser;
    const isOwner = currentUser?.uid === authorInfo?.id;
    const isVideo = currentPulse?.mediaUrl?.match(/\.(mp4|webm|mov|ogg)$/i);
    const isLiked = pulseLikes.includes(currentUser?.uid || '');

    // Listen for likes on current pulse
    useEffect(() => {
        if (!currentPulse?.id) return;
        const pulseRef = doc(db, 'pulses', currentPulse.id);
        const unsub = onSnapshot(pulseRef, (snap) => {
            if (snap.exists()) {
                setPulseLikes(snap.data().likes || []);
            }
        });
        return () => unsub();
    }, [currentPulse?.id]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser || !currentPulse) return;
        const pulseRef = doc(db, 'pulses', currentPulse.id);
        try {
            await updateDoc(pulseRef, {
                likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
            });
        } catch (err) { console.error(err); }
    };

    const goToNext = () => {
        if (currentIndex < pulses.length - 1) {
            setCurrentIndex(i => i + 1);
            setProgressKey(k => k + 1);
        } else {
            onClose();
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
            setProgressKey(k => k + 1);
        }
    };

    useEffect(() => {
        if (!isOpen || !currentPulse) return;
        if (timerRef.current) window.clearTimeout(timerRef.current);

        if (isVideo) {
            setVideoDuration(12);
        } else {
            setVideoDuration(12);
            timerRef.current = window.setTimeout(goToNext, 12000);
        }

        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, [currentIndex, currentPulse, isOpen]);

    const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const dur = e.currentTarget.duration;
        if (dur && dur > 0) setVideoDuration(dur);
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!isOpen || !currentPulse?.musicInfo || !audio) return;
        audio.currentTime = currentPulse.musicInfo.startTime || 0;
        if (!isGlobalMuted) audio.play().catch(() => {}); else audio.pause();
        return () => audio.pause();
    }, [currentIndex, currentPulse, isOpen, isGlobalMuted]);

    if (!isOpen || !currentPulse) return null;

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !replyText.trim() || isOwner || !currentPulse) return;
        setIsReplying(true);
        const conversationId = [currentUser.uid, authorInfo.id].sort().join('_');
        const conversationRef = doc(db, 'conversations', conversationId);
        try {
            await setDoc(conversationRef, {
                participants: [currentUser.uid, authorInfo.id],
                participantInfo: {
                    [currentUser.uid]: { username: currentUser.displayName, avatar: currentUser.photoURL },
                    [authorInfo.id]: { username: authorInfo.username, avatar: authorInfo.avatar }
                },
                timestamp: serverTimestamp()
            }, { merge: true });
            
            await addDoc(collection(conversationRef, 'messages'), { 
                senderId: currentUser.uid, 
                text: replyText.trim(), 
                timestamp: serverTimestamp(), 
                mediaUrl: currentPulse.mediaUrl, 
                mediaType: isVideo ? 'video' : 'image',
                replyToPulse: true,
                pulseId: currentPulse.id
            });
            setReplyText('');
            alert("Resposta enviada!");
        } catch (err) { console.error(err); } finally { setIsReplying(false); }
    };

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col select-none" onClick={onClose}>
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-[110]">
                {pulses.map((_, i) => (
                    <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div 
                            className={`h-full bg-white transition-all linear`} 
                            style={{ 
                                width: i < currentIndex ? '100%' : i === currentIndex ? '100%' : '0',
                                transitionDuration: i === currentIndex ? `${videoDuration}s` : '0s'
                            }} 
                        />
                    </div>
                ))}
            </div>

            <div className="relative w-full h-full flex items-center justify-center overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute inset-y-0 left-0 w-1/3 z-40" onClick={goToPrev}></div>
                <div className="absolute inset-y-0 right-0 w-1/3 z-40" onClick={goToNext}></div>

                <div className="w-full h-full flex items-center justify-center" style={{ filter: currentPulse?.filter || 'none' }}>
                    {isVideo ? (
                        <video 
                            ref={videoRef}
                            src={currentPulse.mediaUrl} 
                            autoPlay 
                            playsInline 
                            muted={isGlobalMuted}
                            onLoadedMetadata={handleVideoMetadata}
                            onEnded={goToNext}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <img src={currentPulse?.mediaUrl} className="w-full h-full object-contain" />
                    )}
                </div>

                {currentPulse.weather && (
                    <div className="absolute top-24 left-6 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                        <span className="text-[10px] font-black text-white uppercase">{currentPulse.weather.code <= 3 ? '☀️' : '🌧️'} {currentPulse.weather.temp}°C</span>
                    </div>
                )}

                {currentPulse?.musicInfo && !currentPulse.musicInfo.hideCover && (
                    <div 
                        className="absolute z-50 pointer-events-none"
                        style={{ 
                            left: `${currentPulse.musicInfo.position?.x || 50}%`, 
                            top: `${currentPulse.musicInfo.position?.y || 50}%`, 
                            transform: 'translate(-50%, -50%)' 
                        }}
                    >
                        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 px-6 py-4 rounded-[2rem] flex flex-col items-center gap-3 shadow-2xl animate-float">
                            <img src={currentPulse.musicInfo.capa} className="w-24 h-24 rounded-2xl shadow-xl rotate-3" />
                            <div className="text-center max-w-[140px] overflow-hidden">
                                <p className="text-white text-xs font-black uppercase truncate">{currentPulse.musicInfo.nome}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="absolute top-8 left-4 flex items-center gap-3 z-50 bg-black/10 p-2 rounded-full backdrop-blur-sm" onClick={() => authorInfo?.id && onViewProfile?.(authorInfo.id)}>
                    <img src={authorInfo?.avatar} className="w-9 h-9 rounded-full object-cover border-2 border-sky-500" />
                    <p className="text-white font-bold text-sm">{authorInfo?.username}</p>
                </div>

                <div className="absolute bottom-10 left-0 right-0 p-4 flex items-center gap-3 z-50">
                    {!isOwner ? (
                        <div className="flex-grow flex items-center gap-3">
                            <form onSubmit={handleReply} className="flex-grow flex items-center bg-black/40 backdrop-blur-xl rounded-full border border-white/20 px-5 py-3">
                                <input 
                                    type="text" 
                                    value={replyText} 
                                    onChange={(e) => setReplyText(e.target.value)} 
                                    placeholder="Responder ao Pulse..." 
                                    className="flex-grow bg-transparent text-white text-sm outline-none placeholder:text-white/60" 
                                />
                                {replyText.trim() && (
                                    <button type="submit" disabled={isReplying} className="text-white font-black text-xs uppercase tracking-widest ml-2">
                                        {isReplying ? '...' : 'Enviar'}
                                    </button>
                                )}
                            </form>
                            <button 
                                onClick={handleLike} 
                                className={`p-3 rounded-full backdrop-blur-xl border border-white/20 transition-all active:scale-150 ${isLiked ? 'bg-red-500 text-white border-red-400' : 'bg-black/40 text-white'}`}
                            >
                                <svg className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            </button>
                        </div>
                    ) : (
                         <div className="w-full flex justify-center">
                            <button onClick={() => onDelete(currentPulse)} className="bg-red-500/20 backdrop-blur-xl border border-red-500/40 text-red-500 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest">Excluir Pulse</button>
                         </div>
                    )}
                </div>
            </div>
            
            {currentPulse?.musicInfo && <audio ref={audioRef} src={currentPulse.musicInfo.preview} muted={isGlobalMuted} crossOrigin="anonymous" loop />}
            <style>{`
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .animate-float { animation: float 4s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default PulseViewerModal;