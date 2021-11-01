var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const SFS_Handler = require("../../server/ms_agent/server_sfs_handler");
const Metrics = require("../../server/server_metrics");
const Config = require("../../server/server_config");
const GameConfig = require("../../server/ms_agent/server_gameconfig");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare
]

router.post('/sfsettings', middleWare, function (req, res, next) {

    const post = req.body
    SFS_Handler.updateSFSettings(post).then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        console.log(err);
        res.json({
            result: "error",
            error: err
        });
    })
});

router.post('/modssettings', middleWare, function (req, res, next) {
    const post = req.body
    SFS_Handler.updateModsSettings(post).then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err
        });
    })
});

module.exports = router;