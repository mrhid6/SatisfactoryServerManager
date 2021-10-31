var express = require('express');
var router = express.Router();


router.use("/info", require("./info"))
router.use("/logs", require("./logs"))
router.use("/config", require("./config"))
router.use("/serveractions", require("./serveractions"))
router.use("/mods", require("./mods"))
router.use("/ficsitinfo", require("./ficsitinfo"))
router.use("/gamesaves", require("./gamesaves"))
router.use("/agent", require("./agent"))

module.exports = router;