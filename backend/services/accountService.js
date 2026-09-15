const LeetCodeStats = require("../models/LeetCodeStats");
const RefreshToken = require("../models/RefreshToken");
const cloudinary = require("../config/cloudinary");

/*
    Permanently removes a student: their user document, cached
    LeetCode stats, active sessions, and Cloudinary profile picture.

    This is genuinely irreversible - used by the admin's explicit
    "Delete Account" button (routes/adminRoutes.js) and by the
    automatic year-progression job that removes 4th-years one year
    after they became 4th-years (services/yearProgressionService.js).

    Both callers write an AuditLog entry (see models/AuditLog.js)
    with the student's name/SIC ID/email before deleting, so there's
    at least a record of who was removed and when even though the
    account itself is gone for good - deliberately chosen over
    keeping deleted accounts around "just in case," since running on
    free-tier storage means every kept document has a real,
    ongoing cost.
*/
const permanentlyDeleteStudent = async (user) => {
    if (user.profilePicturePublicId) {
        await cloudinary.uploader.destroy(user.profilePicturePublicId);
    }

    await Promise.all([
        LeetCodeStats.deleteOne({ userId: user._id }),
        RefreshToken.deleteMany({ userId: user._id }),
        user.deleteOne()
    ]);
};

module.exports = {
    permanentlyDeleteStudent
};
