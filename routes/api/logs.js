var express = require('express');
var router = express.Router();



const ServerApp = require("../../server/server_app");
const SSM_Log_Handler = require("../../server/server_log_handler");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare
]

router.get('/ssmlog', middleWare, function (req, res, next) {

    SSM_Log_Handler.getSSMLog().then(result => {
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

router.get('/smlauncherlog', middleWare, function (req, res, next) {

    SSM_Log_Handler.getSMLauncherLog().then(result => {
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