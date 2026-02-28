const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: { type: String, required: true },
        thread: { type: mongoose.Schema.Types.ObjectId, ref: "Thread" },
        isRead: { type: Boolean, default: false },
        readBy: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                readAt: { type: Date, default: Date.now },
            },
        ],
        reactions: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                emoji: String,
            },
        ],
    },
    { timestamps: true },
);

module.exports = mongoose.model("Chat", chatSchema);