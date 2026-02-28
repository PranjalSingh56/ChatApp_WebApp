const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, searchUserByPhone } = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.get("/search/:phoneNumber", protect, searchUserByPhone);

module.exports = router;
