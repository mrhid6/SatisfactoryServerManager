var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const SFS_Handler = require("../../server/ms_agent/server_sfs_handler");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare
]

router.post('/start', middleWare, function (req, res, next) {
    SFS_Handler.startServer().then(result => {
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

router.post('/stop', middleWare, function (req, res, next) {

    SFS_Handler.stopServer().then(result => {
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

router.post('/kill', middleWare, function (req, res, next) {
    SFS_Handler.killServer().then(result => {
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


router.post('/installsf', middleWare, function (req, res, next) {
    SFS_Handler.InstallSFServer(true).then(result => {
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