import { useState, useEffect, useRef, useContext } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../services/socket';

export default function ChatModal({ isOpen, onClose, recipient, donationId }) {
    const { user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const sendingRef = useRef(false);
    const [error, setError] = useState('');

    const messagesContainerRef = useRef(null);
    const isInitialLoadRef = useRef(true);
    const prevMessagesCountRef = useRef(0);

    const recipientId = recipient?._id;

    // Scroll only the inner messages container, never the outer window
    const scrollToBottom = (smooth = false) => {
        const container = messagesContainerRef.current;
        if (!container) return;
        if (smooth) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        } else {
            container.scrollTop = container.scrollHeight;
        }
    };

    // Check if user is scrolled near the bottom (within 120px)
    const isNearBottom = () => {
        const container = messagesContainerRef.current;
        if (!container) return true;
        return container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    };

    const pollTimerRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !recipientId) return;

        let isMounted = true;
        isInitialLoadRef.current = true;
        prevMessagesCountRef.current = 0;

        // Initial fetch
        API.get(`/chat/messages/${recipientId}`)
            .then((res) => {
                if (isMounted && res.data?.success) {
                    const newMsgs = res.data.messages || [];
                    setMessages(newMsgs);
                    setLoading(false);
                    prevMessagesCountRef.current = newMsgs.length;
                    setTimeout(() => {
                        scrollToBottom(false);
                        isInitialLoadRef.current = false;
                    }, 50);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    console.error('Fetch messages error:', err);
                    setError('Failed to load conversation history');
                    setLoading(false);
                }
            });

        const startFallbackPolling = () => {
            if (pollTimerRef.current) return;
            pollTimerRef.current = setInterval(() => {
                API.get(`/chat/messages/${recipientId}`)
                    .then((res) => {
                        if (!isMounted || !res.data?.success) return;
                        const incoming = res.data.messages || [];

                        setMessages((prev) => {
                            const hasNewCount = incoming.length !== prev.length;
                            const hasNewLast = incoming[incoming.length - 1]?._id !== prev[prev.length - 1]?._id;

                            if (!hasNewCount && !hasNewLast) {
                                return prev;
                            }

                            if (isNearBottom()) {
                                setTimeout(() => scrollToBottom(true), 50);
                            }
                            prevMessagesCountRef.current = incoming.length;
                            return incoming;
                        });
                    })
                    .catch((err) => console.error('Poll messages error:', err));
            }, 5000);
        };

        const stopFallbackPolling = () => {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
            }
        };

        const socket = getSocket();
        if (!socket) {
            startFallbackPolling();
            return () => {
                isMounted = false;
                stopFallbackPolling();
            };
        }

        const handleChatMessage = (msg) => {
            if (!isMounted || !msg) return;
            const senderId = String(msg.sender?._id || msg.sender || '');
            const receiverId = String(msg.receiver?._id || msg.receiver || '');
            const targetId = String(recipientId || '');

            if (senderId === targetId || receiverId === targetId) {
                setMessages((prev) => {
                    const msgId = String(msg._id || msg.id || '');
                    if (msgId && prev.some((m) => String(m._id || m.id || '') === msgId)) {
                        return prev;
                    }
                    const updated = [...prev, msg];
                    if (isNearBottom()) {
                        setTimeout(() => scrollToBottom(true), 50);
                    }
                    prevMessagesCountRef.current = updated.length;
                    return updated;
                });
            }
        };

        const handleConnect = () => {
            stopFallbackPolling();
        };

        const handleDisconnect = () => {
            startFallbackPolling();
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('chat:message', handleChatMessage);

        if (socket.connected) {
            stopFallbackPolling();
        } else {
            startFallbackPolling();
        }

        return () => {
            isMounted = false;
            stopFallbackPolling();
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('chat:message', handleChatMessage);
        };
    }, [isOpen, recipientId]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || sending || sendingRef.current) return;

        sendingRef.current = true;
        setSending(true);
        setError('');
        setText('');

        try {
            const res = await API.post('/chat/messages', {
                receiverId: recipientId,
                text: trimmed,
                donationId: donationId || undefined
            });

            if (res.data?.success && res.data.message) {
                setMessages((prev) => {
                    const newMsg = res.data.message;
                    const msgId = String(newMsg._id || newMsg.id || '');
                    if (msgId && prev.some((m) => String(m._id || m.id || '') === msgId)) {
                        return prev;
                    }
                    const updated = [...prev, newMsg];
                    prevMessagesCountRef.current = updated.length;
                    return updated;
                });
                setTimeout(() => scrollToBottom(true), 50);
            }
        } catch (err) {
            console.error('Send message error:', err);
            setError(err.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
            sendingRef.current = false;
        }
    };

    if (!isOpen || !recipient) return null;

    const initials = (recipient.name || recipient.ngoName || 'U')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col h-[580px] max-h-[90vh] overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {recipient.avatar ? (
                            <img
                                src={recipient.avatar}
                                alt={recipient.name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-green-500"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                                {initials}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-white leading-tight">
                                    {recipient.name || recipient.ngoName}
                                </h3>
                                {recipient.role === 'ngo' && (
                                    <span className="bg-green-500/20 text-green-300 border border-green-500/30 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                        NGO
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                {recipient.city ? `Active in ${recipient.city}` : 'Live Messenger'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer border-0 bg-transparent text-xl leading-none"
                        aria-label="Close chat"
                    >
                        ✕
                    </button>
                </div>

                {/* Subheader info if related to donation */}
                {donationId && (
                    <div className="bg-slate-100 border-b border-slate-200 px-4 py-1.5 text-xs text-slate-600 flex items-center justify-between flex-shrink-0">
                        <span>💬 Coordinating regarding Donation ID: #{String(donationId).slice(-6)}</span>
                        <span className="text-[10px] text-slate-500">Auto-linked</span>
                    </div>
                )}

                {/* Messages Body: strictly scrolls internally via messagesContainerRef */}
                <div
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50"
                >
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-xs text-slate-400">
                            Loading conversation history...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                            <span className="text-4xl mb-2">💬</span>
                            <p className="text-xs font-semibold text-slate-600">No messages yet</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                                Send a message below to start chatting with {recipient.name || recipient.ngoName} regarding donations, pickup, or details.
                            </p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.sender?._id?.toString() === user?._id?.toString() ||
                                           msg.sender?.toString() === user?._id?.toString();
                            const msgTime = new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            return (
                                <div
                                    key={msg._id}
                                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                                >
                                    <div
                                        className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs break-words shadow-2xs ${
                                            isMine
                                                ? 'bg-blue-600 text-white rounded-br-xs'
                                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                                        <span>{msgTime}</span>
                                        {isMine && (
                                            <span className={msg.read ? 'text-blue-500 font-bold' : 'text-slate-400'}>
                                                {msg.read ? '✓✓' : '✓'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-1.5 text-xs border-t border-red-200 flex-shrink-0">
                        {error}
                    </div>
                )}

                {/* Input Bar */}
                <form
                    onSubmit={handleSend}
                    className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0"
                >
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={`Message ${recipient.name || recipient.ngoName}...`}
                        className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition"
                    />
                    <button
                        type="submit"
                        disabled={!text.trim() || sending}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl border-0 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs whitespace-nowrap"
                    >
                        {sending ? '...' : 'Send ✈'}
                    </button>
                </form>
            </div>
        </div>
    );
}
