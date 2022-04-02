var express = require('express');
var router = express.Router();


router.use("/info", require("./info"))
router.use("/logs", require("./logs"))
router.use("/ficsitinfo", require("./ficsitinfo"))
router.use("/agent", require("./agent"))
router.use("/public", require("./public"))
router.use("/admin", require("./admin"))

module.exports = router;