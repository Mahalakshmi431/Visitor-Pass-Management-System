const express = require("express");
const router = express.Router();
const { getPreferences, updatePreferences } = require("../controllers/notificationPreferenceController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

module.exports = router;
