var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const SFS_Handler = require("../../server/server_sfs_handler");
const SSM_Mod_Handler = require("../../server/server_mod_handler");
const SSM_Log_Handler = require("../../server/server_log_handler");
const Config = require("../../server/server_config");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare
]


router.use("/info", require("./info"))
router.use("/logs", require("./logs"))
router.use("/config", require("./config"))
router.use("/serveractions", require("./serveractions"))
router.use("/mods", require("./mods"))
router.use("/ficsitinfo", require("./ficsitinfo"))

module.exports = router;