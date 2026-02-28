const express = require("express");
const router = express.Router();
const { sendMessage, lastMessages, clearChat, getThreads, markAsRead, toggleReaction } = require("../controllers/chat.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/send", protect, sendMessage);
router.get("/threads", protect, getThreads);
router.get("/messages/:threadId", protect, lastMessages);
router.delete("/clear/:threadId", protect, clearChat);
router.post("/mark-read", protect, markAsRead);
router.post("/reaction/:messageId", protect, toggleReaction);

module.exports = router;