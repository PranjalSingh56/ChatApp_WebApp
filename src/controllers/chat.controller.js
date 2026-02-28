const Chat = require("../models/Chat");
const Thread = require("../models/Thread");
const asyncHandler = require("../utils/asyncHandler");
const { getIO } = require("../socket/socket");

exports.sendMessage = asyncHandler(async (req, res) => {
  const { receiver, message } = req.body;
  const sender = req.user._id;

  if (!receiver || !message)
    return res.status(400).json({ message: "Missing fields" });

  let thread = await Thread.findOne({
    participants: { $all: [sender, receiver] },
  });

  if (!thread) {
    thread = await Thread.create({
      participants: [sender, receiver],
    });
  }

  const chat = await Chat.create({
    sender,
    receiver,
    message,
    thread: thread._id,
  });

  thread.lastMessages = message;
  thread.lastMessagesTime = new Date();
  await thread.save();

  // Emit to both participants' individual rooms
  const io = getIO();
  io.to(sender.toString()).emit("new_message", chat);
  io.to(receiver.toString()).emit("new_message", chat);

  res.status(201).json(chat);
});

exports.lastMessages = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const messages = await Chat.find({ thread: threadId })
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json(messages);
});

exports.clearChat = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  await Chat.deleteMany({ thread: threadId });

  const thread = await Thread.findById(threadId);
  if (thread) {
    thread.lastMessages = "";
    await thread.save();
  }

  res.json({ message: "Chat cleared" });
});

exports.getThreads = asyncHandler(async (req, res) => {
  const threads = await Thread.find({ participants: req.user._id })
    .populate("participants", "name phoneNumber profilePicture")
    .sort({ lastMessagesTime: -1 });
  res.json(threads);
});

// New Methods for WhatsApp/Telegram Features
exports.markAsRead = asyncHandler(async (req, res) => {
  const { messageIds } = req.body;
  const userId = req.user._id;

  if (!messageIds || !Array.isArray(messageIds)) {
    return res.status(400).json({ message: "Invalid message IDs array" });
  }

  // Update messages where the user hasn't read them yet
  await Chat.updateMany(
    { _id: { $in: messageIds }, "readBy.user": { $ne: userId } },
    { $push: { readBy: { user: userId, readAt: new Date() } }, isRead: true }
  );

  res.json({ message: "Messages marked as read" });
});

exports.toggleReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  const message = await Chat.findById(messageId);
  if (!message) return res.status(404).json({ message: "Message not found" });

  const existingReactionIndex = message.reactions.findIndex(
    (r) => r.user.toString() === userId.toString()
  );

  if (existingReactionIndex !== -1) {
    // If same emoji, remove it. If different, update it.
    if (message.reactions[existingReactionIndex].emoji === emoji) {
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      message.reactions[existingReactionIndex].emoji = emoji;
    }
  } else {
    // Add new reaction
    message.reactions.push({ user: userId, emoji });
  }

  await message.save();

  // Emit reaction update
  const io = getIO();
  io.to(message.sender.toString()).emit("message_reaction", { messageId, reactions: message.reactions });
  io.to(message.receiver.toString()).emit("message_reaction", { messageId, reactions: message.reactions });

  res.json(message);
});
