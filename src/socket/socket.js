const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io;
const onlineUsers = new Set(); // Set of userIds

function initSocket(server) {
    io = new Server(server, { cors: { origin: "*" } });

    io.use((socket, next) => {
        if (socket.handshake.auth && socket.handshake.auth.token) {
            jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) return next(new Error("Authentication error"));
                socket.userId = decoded.id;
                next();
            });
        } else {
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.userId;

        // Join individual user room for notifications
        socket.join(userId);

        // Mark user as online
        onlineUsers.add(userId);
        io.emit("user_status", { userId, status: "online" });

        console.log(`User connected: ${userId}, Socket: ${socket.id}`);

        // Typing Indicators
        socket.on("typing", ({ threadId, receiverId }) => {
            io.to(receiverId.toString()).emit("typing", { threadId, userId });
        });

        socket.on("stopTyping", ({ threadId, receiverId }) => {
            io.to(receiverId.toString()).emit("stopTyping", { threadId, userId });
        });

        // Read Receipts
        socket.on("message_read", ({ messageId, threadId, senderId }) => {
            // Forward the read receipt to the original message sender
            io.to(senderId.toString()).emit("message_read", { messageId, threadId, readBy: userId, readAt: new Date() });
        });

        socket.on("disconnect", () => {
            // Check if user has other active sockets
            const userSockets = io.sockets.adapter.rooms.get(userId);
            if (!userSockets || userSockets.size === 0) {
                onlineUsers.delete(userId);
                io.emit("user_status", { userId, status: "offline" });
                console.log(`User offline: ${userId}`);
            }
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
}

function getIO() {
    return io;
}

function getOnlineUsers() {
    return Array.from(onlineUsers);
}

module.exports = initSocket;
module.exports.getIO = getIO;
module.exports.getOnlineUsers = getOnlineUsers;