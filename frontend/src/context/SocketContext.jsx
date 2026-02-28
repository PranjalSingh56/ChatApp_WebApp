import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState({}); // { threadId: [userIds] }
    const [readReceipts, setReadReceipts] = useState({}); // { messageId: readData }

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));

        if (token && user) {
            // Note: Update to use environment variable if you plan to deploy
            const newSocket = io('http://localhost:8080', {
                auth: { token },
            });

            newSocket.on('connect', () => {
                console.log('Connected to socket');
            });

            newSocket.on('user_status', ({ userId, status }) => {
                setOnlineUsers((prev) => {
                    const uniqueUsers = new Set(prev);
                    if (status === 'online') {
                        uniqueUsers.add(userId);
                    } else {
                        uniqueUsers.delete(userId);
                    }
                    return Array.from(uniqueUsers);
                });
            });

            newSocket.on('typing', ({ threadId, userId }) => {
                setTypingUsers(prev => {
                    const threadTyping = prev[threadId] || [];
                    if (!threadTyping.includes(userId)) {
                        return { ...prev, [threadId]: [...threadTyping, userId] };
                    }
                    return prev;
                });
            });

            newSocket.on('stopTyping', ({ threadId, userId }) => {
                setTypingUsers(prev => {
                    const threadTyping = prev[threadId] || [];
                    return { ...prev, [threadId]: threadTyping.filter(id => id !== userId) };
                });
            });

            newSocket.on('message_read', (data) => {
                setReadReceipts(prev => ({ ...prev, [data.messageId]: data }));
            });

            setSocket(newSocket);

            return () => newSocket.close();
        }
    }, []);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, typingUsers, readReceipts }}>
            {children}
        </SocketContext.Provider>
    );
};
