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

router.get('/serverstatus', middleWare, function (req, res, next) {
    SFS_Handler.getServerStatus().then(result => {
        res.json({
            result: "success",
            data: result
        });
    })
});

router.get('/ssmversion', middleWare, function (req, res, next) {

    Config.getSSMVersion().then(data => {
        res.json({
            result: "success",
            data: data
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err
        });
    })

});

router.get('/saves', middleWare, function (req, res, next) {
    SFS_Handler.getSaves().then(result => {
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