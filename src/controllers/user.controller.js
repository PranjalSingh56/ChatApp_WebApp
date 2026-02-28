const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

exports.getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password");
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: "User not found" });
    }
});

exports.updateProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
        if (req.body.password) {
            user.password = req.body.password;
        }
        user.profilePicture = req.body.profilePicture || user.profilePicture;

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phoneNumber: updatedUser.phoneNumber,
            profilePicture: updatedUser.profilePicture,
        });
    } else {
        res.status(404).json({ message: "User not found" });
    }
});

exports.searchUserByPhone = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.params;
    const user = await User.findOne({ phoneNumber }).select("-password");
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: "User not found" });
    }
});
