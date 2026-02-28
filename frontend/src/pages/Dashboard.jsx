import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Send,
    Trash2,
    LogOut,
    User as UserIcon,
    MessageSquare,
    MoreVertical,
    Phone,
    Circle,
    Check,
    CheckCheck,
    Smile
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';

const Dashboard = () => {
    const [threads, setThreads] = useState([]);
    const [activeThread, setActiveThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [searchPhone, setSearchPhone] = useState('');
    const [showReactionMenu, setShowReactionMenu] = useState(null);
    const { socket, onlineUsers, typingUsers, readReceipts } = useSocket();
    const user = JSON.parse(localStorage.getItem('user'));
    const messagesEndRef = useRef(null);

    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);

    useEffect(() => {
        loadThreads();
    }, []);

    useEffect(() => {
        scrollToBottom();

        // Mark messages as read when viewing a thread
        if (activeThread && messages.length > 0) {
            const unreadMessageIds = messages
                .filter(m => m.sender !== user._id && !m.readBy?.some(rb => rb.user === user._id))
                .map(m => m._id);

            if (unreadMessageIds.length > 0) {
                api.post('/chat/mark-read', { messageIds: unreadMessageIds }).then(() => {
                    // Notify sender via socket
                    unreadMessageIds.forEach(id => {
                        const msg = messages.find(m => m._id === id);
                        if (socket && msg) {
                            socket.emit('message_read', { messageId: id, threadId: activeThread._id, senderId: msg.sender });
                        }
                    });
                }).catch(err => console.error("Failed to mark as read", err));
            }
        }
    }, [messages, activeThread, socket, user._id]);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (msg) => {
            if (activeThread?._id === msg.thread) {
                setMessages((prev) => {
                    if (!prev.find(m => m._id === msg._id)) {
                        return [...prev, msg];
                    }
                    return prev;
                });
            }
            loadThreads(); // Refresh thread list for last message & unread state
        };

        const handleReaction = (data) => {
            if (activeThread) {
                setMessages((prev) => prev.map(m =>
                    m._id === data.messageId ? { ...m, reactions: data.reactions } : m
                ));
            }
        };

        socket.on('new_message', handleNewMessage);
        socket.on('message_reaction', handleReaction);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('message_reaction', handleReaction);
        }
    }, [socket, activeThread]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadThreads = async () => {
        try {
            const { data } = await api.get('/chat/threads');
            setThreads(data);
        } catch (err) {
            console.error('Failed to load threads');
        }
    };

    const selectThread = async (thread) => {
        setActiveThread(thread);
        try {
            const { data } = await api.get(`/chat/messages/${thread._id}`);
            setMessages(data);
        } catch (err) {
            console.error('Failed to load messages');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || !activeThread) return;

        const receiverId = activeThread.participants.find(p => p._id !== user._id)._id;

        try {
            const { data: newMsg } = await api.post('/chat/send', {
                receiver: receiverId,
                message: message.trim()
            });

            // Optimistic update
            setMessages(prev => [...prev, newMsg]);
            setMessage('');

            if (socket) {
                socket.emit('stopTyping', { threadId: activeThread._id, receiverId });
            }
            isTypingRef.current = false;
        } catch (err) {
            console.error('Failed to send message');
        }
    };

    const handleTyping = (e) => {
        setMessage(e.target.value);
        if (!activeThread || !socket) return;

        const receiverId = activeThread.participants.find(p => p._id !== user._id)._id;

        if (!isTypingRef.current) {
            socket.emit('typing', { threadId: activeThread._id, receiverId });
            isTypingRef.current = true;
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stopTyping', { threadId: activeThread._id, receiverId });
            isTypingRef.current = false;
        }, 2000);
    };

    const handleSearch = async (e) => {
        if (e.key === 'Enter' && searchPhone.trim()) {
            try {
                const { data: foundUser } = await api.get(`/user/search/${searchPhone.trim()}`);
                // Create a temporary thread object for the UI
                setActiveThread({
                    _id: null,
                    participants: [user, foundUser],
                    temp: true
                });
                setMessages([]);
                setSearchPhone('');
            } catch (err) {
                alert('User not found');
            }
        }
    };

    const handleReactionSubmit = async (messageId, emoji) => {
        try {
            const { data } = await api.post(`/chat/reaction/${messageId}`, { emoji });
            // Optimistic is handled by socket, but we can update state too
            setMessages(prev => prev.map(m => m._id === messageId ? data : m));
            setShowReactionMenu(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.reload();
    };

    // Helper to check if a specific user is typing in the active thread
    const activeThreadTypingUsers = activeThread ? (typingUsers[activeThread._id] || []) : [];
    const isOtherUserTyping = activeThread && activeThreadTypingUsers.length > 0;

    return (
        <div className="h-screen flex bg-dark-bg text-white overflow-hidden p-0 md:p-4 gap-4">
            {/* Sidebar */}
            <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`w-full md:w-80 flex flex-col glass rounded-3xl overflow-hidden ${activeThread ? 'hidden md:flex' : 'flex'}`}
            >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        Messages
                    </h2>
                    <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <LogOut className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by phone..."
                            className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            value={searchPhone}
                            onChange={(e) => setSearchPhone(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-1">
                    <AnimatePresence>
                        {threads.map((thread) => {
                            const otherUser = thread.participants.find(p => p._id !== user._id);
                            if (!otherUser) return null;
                            const isOnline = onlineUsers.includes(otherUser._id);

                            // Check if other user is typing in this thread
                            const threadTypingUsers = typingUsers[thread._id] || [];
                            const isTyping = threadTypingUsers.includes(otherUser._id);

                            return (
                                <motion.div
                                    key={thread._id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={() => selectThread(thread)}
                                    className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${activeThread?._id === thread._id ? 'bg-indigo-600/20 border border-indigo-500/30 shadow-lg shadow-indigo-500/10' : 'hover:bg-white/5 border border-transparent'}`}
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-lg shadow-lg">
                                            {otherUser.name[0]}
                                        </div>
                                        {isOnline && (
                                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full" />
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="font-semibold truncate">{otherUser.name}</span>
                                            <span className="text-[10px] text-slate-500">
                                                {thread.lastMessagesTime ? new Date(thread.lastMessagesTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <p className={`text-sm truncate ${isTyping ? 'text-indigo-400 font-medium' : 'text-slate-400 opacity-70'}`}>
                                            {isTyping ? 'typing...' : (thread.lastMessages || 'No messages yet')}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </motion.aside>

            {/* Main Chat */}
            <motion.main
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`flex-1 flex flex-col glass rounded-3xl overflow-hidden ${!activeThread ? 'hidden md:flex' : 'flex'}`}
            >
                {activeThread ? (
                    <>
                        <header className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setActiveThread(null)} className="md:hidden p-2">
                                    <ArrowRight className="w-5 h-5 rotate-180" />
                                </button>
                                <div className="relative">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold">
                                        {activeThread.participants.find(p => p._id !== user._id).name[0]}
                                    </div>
                                    {onlineUsers.includes(activeThread.participants.find(p => p._id !== user._id)._id) && (
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold truncate max-w-[150px] md:max-w-none">
                                        {activeThread.participants.find(p => p._id !== user._id).name}
                                    </h3>
                                    <p className="text-[10px] md:text-xs font-medium tracking-wide">
                                        {isOtherUserTyping ? (
                                            <span className="text-indigo-400 animate-pulse">typing...</span>
                                        ) : onlineUsers.includes(activeThread.participants.find(p => p._id !== user._id)._id) ? (
                                            <span className="text-green-400 uppercase">Online</span>
                                        ) : (
                                            <span className="text-slate-500 uppercase">Offline</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender === user._id;

                                // Merge fresh read receipts from socket context with existing 
                                const hasBeenRead = (readReceipts[msg._id] && readReceipts[msg._id].readBy !== user._id) ||
                                    (msg.readBy && msg.readBy.some(rb => rb.user !== user._id));

                                return (
                                    <motion.div
                                        key={msg._id || idx}
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                                        onMouseLeave={() => setShowReactionMenu(null)}
                                    >
                                        <div className={`relative flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[15px] shadow-sm ${isMe
                                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-none'
                                                : 'bg-[#27272a] text-[#f4f4f5] border border-white/5 rounded-bl-none'
                                                }`}>
                                                {msg.message}
                                                <div className={`text-[10px] mt-1.5 flex items-center gap-1 opacity-70 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {isMe && (
                                                        <span>
                                                            {hasBeenRead ? <CheckCheck className="w-3.5 h-3.5 text-blue-300" /> : <Check className="w-3.5 h-3.5 text-slate-300" />}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Reaction Button (appears on hover) */}
                                            <button
                                                onClick={() => setShowReactionMenu(showReactionMenu === msg._id ? null : msg._id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-full transition-all"
                                            >
                                                <Smile className="w-4 h-4" />
                                            </button>

                                            {/* Reaction Menu */}
                                            {showReactionMenu === msg._id && (
                                                <div className={`absolute bottom-full mb-2 bg-[#18181b] border border-[#27272a] p-1.5 rounded-full shadow-xl flex gap-1 z-10 ${isMe ? 'right-0' : 'left-0'}`}>
                                                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            onClick={(e) => { e.stopPropagation(); handleReactionSubmit(msg._id, emoji); }}
                                                            className="hover:bg-slate-700/50 p-1.5 rounded-full hover:scale-125 transition-transform"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Display Reactions */}
                                        {msg.reactions && msg.reactions.length > 0 && (
                                            <div className={`flex gap-1 mt-1 z-10 ${isMe ? 'mr-2' : 'ml-2'}`}>
                                                {msg.reactions.map((r, i) => (
                                                    <span key={i} className="bg-slate-800/80 border border-slate-700 px-1.5 py-0.5 rounded-full text-xs shadow-sm">
                                                        {r.emoji}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 bg-slate-900/40 border-t border-white/5 flex gap-3 items-center relative z-20">
                            <input
                                type="text"
                                placeholder="Message..."
                                className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-[15px]"
                                value={message}
                                onChange={handleTyping}
                            />
                            <button
                                type="submit"
                                disabled={!message.trim()}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center w-12 h-12 flex-shrink-0"
                            >
                                <Send className="w-5 h-5 ml-1" />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-10 mix-blend-overlay">
                        <div className="w-24 h-24 bg-indigo-500/5 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
                            <MessageSquare className="w-10 h-10 text-indigo-400/50" />
                        </div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent mb-2">Your Workspace</h2>
                        <p className="max-w-xs text-slate-500 text-sm">
                            Select a conversation from the sidebar or search for a phone number to start messaging.
                        </p>
                    </div>
                )}
            </motion.main>
        </div>
    );
};

export default Dashboard;
