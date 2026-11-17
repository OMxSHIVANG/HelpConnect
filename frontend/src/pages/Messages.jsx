import { useState, useEffect, useRef, useContext } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../services/socket';

export default function Messages() {
    const { user } = useContext(AuthContext);
    const [conversations, setConversations] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const sendingRef = useRef(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    const messagesContainerRef = useRef(null);
    const isInitialLoadRef = useRef(true);

    // Scroll only the inner messages container, never the outer window/screen
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

    // Check if user is scrolled near bottom
    const isNearBottom = () => {
        const container = messagesContainerRef.current;
        if (!container) return true;
        return container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    };

    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const convPollTimerRef = useRef(null);
    const msgPollTimerRef = useRef(null);

    // Initial load of conversations
    useEffect(() => {
        let isMounted = true;
        API.get('/chat/conversations')
            .then((res) => {
                if (isMounted && res.data?.success) {
                    const convs = res.data.conversations || [];
                    setConversations(convs);
                    setSelectedPartner((prev) => prev || (convs.length > 0 ? convs[0].partner : null));
                    setLoadingConversations(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    console.error('Fetch conversations error:', err);
                    setError('Failed to load conversations.');
                    setLoadingConversations(false);
                }
            });

        const startConvPolling = () => {
            if (convPollTimerRef.current) return;
            convPollTimerRef.current = setInterval(() => {
                API.get('/chat/conversations')
                    .then((res) => {
                        if (!isMounted || !res.data?.success) return;
                        const incoming = res.data.conversations || [];
                        setConversations((prev) => {
                            if (incoming.length === prev.length) {
                                const lastPrev = prev[0]?.latestMessage?._id;
                                const lastNew = incoming[0]?.latestMessage?._id;
                                if (lastPrev === lastNew) return prev;
                            }
                            return incoming;
                        });
                    })
                    .catch((err) => console.error('Poll conversations error:', err));
            }, 6000);
        };

        const stopConvPolling = () => {
            if (convPollTimerRef.current) {
                clearInterval(convPollTimerRef.current);
                convPollTimerRef.current = null;
            }
        };

        // Socket for real-time messages & updates
        const socket = getSocket();
        if (!socket) {
            startConvPolling();
            return () => {
                isMounted = false;
                stopConvPolling();
            };
        }

        const handleConnect = () => {
            if (!isMounted) return;
            setIsSocketConnected(true);
            stopConvPolling();
        };

        const handleDisconnect = () => {
            if (!isMounted) return;
            setIsSocketConnected(false);
            startConvPolling();
        };

        const handleNewMessage = (msg) => {
            if (!isMounted || !msg) return;
            // Update conversation list with latest message
            setConversations((prev) => {
                const partnerObj = msg.sender?._id === user?._id ? msg.receiver : msg.sender;
                const otherId = typeof partnerObj === 'object' ? partnerObj?._id : partnerObj;
                const existingIdx = prev.findIndex((c) => c.partner?._id === otherId);

                if (existingIdx !== -1) {
                    const updated = [...prev];
                    updated[existingIdx] = {
                        ...updated[existingIdx],
                        latestMessage: msg,
                        unreadCount: (msg.sender?._id !== user?._id && selectedPartner?._id !== otherId)
                            ? (updated[existingIdx].unreadCount || 0) + 1
                            : updated[existingIdx].unreadCount
                    };
                    const item = updated.splice(existingIdx, 1)[0];
                    return [item, ...updated];
                }
                return prev;
            });
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('chat:message', handleNewMessage);

        if (socket.connected) {
            handleConnect();
        } else {
            startConvPolling();
        }

        return () => {
            isMounted = false;
            stopConvPolling();
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('chat:message', handleNewMessage);
        };
    }, [user?._id, selectedPartner?._id]);

    // When partner changes, fetch messages and poll
    const partnerId = selectedPartner?._id;
    useEffect(() => {
        if (!partnerId) return;

        let isMounted = true;
        isInitialLoadRef.current = true;

        API.get(`/chat/messages/${partnerId}`)
            .then((res) => {
                if (isMounted && res.data?.success) {
                    const newMsgs = res.data.messages || [];
                    setMessages(newMsgs);
                    setLoadingMessages(false);
                    setTimeout(() => {
                        scrollToBottom(false);
                        isInitialLoadRef.current = false;
                    }, 50);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    console.error('Fetch messages error:', err);
                    setLoadingMessages(false);
                }
            });

        const startMsgPolling = () => {
            if (msgPollTimerRef.current) return;
            msgPollTimerRef.current = setInterval(() => {
                API.get(`/chat/messages/${partnerId}`)
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
                            return incoming;
                        });
                    })
                    .catch((err) => console.error('Poll messages error:', err));
            }, 5000);
        };

        const stopMsgPolling = () => {
            if (msgPollTimerRef.current) {
                clearInterval(msgPollTimerRef.current);
                msgPollTimerRef.current = null;
            }
        };

        const socket = getSocket();
        if (!socket) {
            startMsgPolling();
            return () => {
                isMounted = false;
                stopMsgPolling();
            };
        }

        const handlePartnerMessage = (msg) => {
            if (!isMounted || !msg) return;
            const senderId = String(msg.sender?._id || msg.sender || '');
            const receiverId = String(msg.receiver?._id || msg.receiver || '');
            const targetId = String(partnerId || '');

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
                    return updated;
                });
            }
        };

        const handleConnect = () => {
            stopMsgPolling();
        };

        const handleDisconnect = () => {
            startMsgPolling();
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('chat:message', handlePartnerMessage);

        if (socket.connected) {
            stopMsgPolling();
        } else {
            startMsgPolling();
        }

        return () => {
            isMounted = false;
            stopMsgPolling();
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('chat:message', handlePartnerMessage);
        };
    }, [partnerId]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || sending || sendingRef.current || !partnerId) return;

        sendingRef.current = true;
        setSending(true);
        setError('');
        setText('');

        try {
            const res = await API.post('/chat/messages', {
                receiverId: partnerId,
                text: trimmed
            });

            if (res.data?.success && res.data.message) {
                setMessages((prev) => {
                    const newMsg = res.data.message;
                    const msgId = String(newMsg._id || newMsg.id || '');
                    if (msgId && prev.some((m) => String(m._id || m.id || '') === msgId)) {
                        return prev;
                    }
                    return [...prev, newMsg];
                });
                setTimeout(() => scrollToBottom(true), 50);

                // Refresh conversation preview
                API.get('/chat/conversations').then((cRes) => {
                    if (cRes.data?.success) {
                        setConversations(cRes.data.conversations || []);
                    }
                });
            }
        } catch (err) {
            console.error('Send message error:', err);
            setError(err.response?.data?.message || 'Failed to send message.');
        } finally {
            setSending(false);
            sendingRef.current = false;
        }
    };

    const filteredConversations = conversations.filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const name = (c.partner?.name || c.ngo?.ngoName || '').toLowerCase();
        const email = (c.partner?.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
    });

    const activePartnerConv = conversations.find(
        (c) => c.partner?._id?.toString() === selectedPartner?._id?.toString()
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Direct Messages 💬</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Real-time coordination and chat between Donors and NGO Organizations.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-2xs">
                    <span className={`inline-block w-2 h-2 rounded-full ${isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
                    <span className="text-xs text-slate-600 font-medium">{isSocketConnected ? 'Real-Time Connected' : 'Live Sync'}</span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">
                    {error}
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[640px] max-h-[80vh]">
                {/* Left Pane: Conversation List */}
                <div className={`md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/60 ${selectedPartner ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-3 border-b border-slate-200 bg-white">
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {loadingConversations && conversations.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">Loading chats...</div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <span className="text-3xl block mb-1">📭</span>
                                <p className="text-xs font-semibold text-slate-600">No conversations yet</p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    When you chat with a donor or NGO, your messages will appear here.
                                </p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => {
                                const isSelected = conv.partner?._id?.toString() === selectedPartner?._id?.toString();
                                const displayName = conv.ngo?.ngoName || conv.partner?.name || 'User';
                                const initials = displayName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2);

                                return (
                                    <button
                                        key={conv.partner?._id}
                                        onClick={() => setSelectedPartner(conv.partner)}
                                        className={`w-full text-left p-3.5 transition flex items-start gap-3 cursor-pointer border-0 ${
                                            isSelected ? 'bg-green-50/80 border-r-3 border-green-600' : 'bg-transparent hover:bg-slate-100/70'
                                        }`}
                                    >
                                        {conv.partner?.avatar ? (
                                            <img
                                                src={conv.partner.avatar}
                                                alt={displayName}
                                                className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                {initials}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                                    {displayName}
                                                </h4>
                                                {conv.latestMessage?.createdAt && (
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-1">
                                                        {new Date(conv.latestMessage.createdAt).toLocaleDateString([], {
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-[11px] text-slate-500 truncate">
                                                {conv.latestMessage?.text || 'No messages yet'}
                                            </p>
                                        </div>

                                        {conv.unreadCount > 0 && (
                                            <span className="bg-green-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Pane: Active Thread */}
                <div className={`md:col-span-7 lg:col-span-8 flex flex-col h-full bg-white ${selectedPartner ? 'flex' : 'hidden md:flex'}`}>
                    {selectedPartner ? (
                        <>
                            {/* Header */}
                            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedPartner(null)}
                                        className="md:hidden text-slate-500 hover:text-slate-800 bg-transparent border-0 cursor-pointer p-1 text-base"
                                    >
                                        ←
                                    </button>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-slate-900 leading-tight">
                                                {activePartnerConv?.ngo?.ngoName || selectedPartner.name}
                                            </h3>
                                            {selectedPartner.role === 'ngo' && (
                                                <span className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                                    NGO
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {selectedPartner.email} {selectedPartner.phone ? `• 📞 ${selectedPartner.phone}` : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Messages Container: Strictly scrolls internally */}
                            <div
                                ref={messagesContainerRef}
                                className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50"
                            >
                                {loadingMessages ? (
                                    <div className="flex items-center justify-center h-full text-xs text-slate-400">
                                        Loading messages...
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                                        <span className="text-4xl mb-2">💬</span>
                                        <p className="text-xs font-semibold text-slate-600">Start the conversation</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                                            Type a message below to coordinate donation items, pickup time, or address.
                                        </p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isMine =
                                            msg.sender?._id?.toString() === user?._id?.toString() ||
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
                                                    className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs break-words shadow-2xs ${
                                                        isMine
                                                            ? 'bg-green-700 text-white rounded-br-xs'
                                                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                                                    }`}
                                                >
                                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                                </div>
                                                <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                                                    <span>{msgTime}</span>
                                                    {isMine && (
                                                        <span className={msg.read ? 'text-green-600 font-bold' : 'text-slate-400'}>
                                                            {msg.read ? '✓✓' : '✓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Composer */}
                            <form
                                onSubmit={handleSend}
                                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0"
                            >
                                <input
                                    type="text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Type your message here..."
                                    className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50 focus:bg-white transition"
                                />
                                <button
                                    type="submit"
                                    disabled={!text.trim() || sending}
                                    className="bg-green-700 hover:bg-green-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl border-0 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs whitespace-nowrap"
                                >
                                    {sending ? '...' : 'Send ✈'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                            <span className="text-5xl mb-3">💬</span>
                            <h3 className="font-bold text-slate-700 text-sm">Select a Conversation</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                Choose a contact from the list on the left or click "Chat" from any donor profile or donation request.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
