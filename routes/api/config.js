var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const SFS_Handler = require("../../server/server_sfs_handler");
const Config = require("../../server/server_config");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare
]

router.get('/', middleWare, function (req, res, next) {
    const sfConfig = Config.get("satisfactory");
    const modsConfig = Config.get("mods");

    const sfConfig_clone = Object.assign(Object.create(Object.getPrototypeOf(sfConfig)), sfConfig)
    sfConfig_clone.password = null;

    res.json({
        result: "success",
        data: {
            satisfactory: sfConfig_clone,
            mods: modsConfig
        }
    });
});

router.post('/selectsave', middleWare, function (req, res, next) {
    const body = req.body;
    const savename = body.savename;

    SFS_Handler.selectSave(savename).then(() => {
        res.json({
            result: "success"
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err
        });
    })
});

router.post('/newsession', middleWare, function (req, res, next) {
    const body = req.body;
    const sessionName = body.sessionName;

    SFS_Handler.updateNewSession(sessionName).then(result => {
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

router.post('/sfsettings', middleWare, function (req, res, next) {

    const post = req.body
    SFS_Handler.updateSFSettings(post).then(result => {
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