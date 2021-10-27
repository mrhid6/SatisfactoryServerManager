var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const SFS_Handler = require("../../server/server_sfs_handler");
const Metrics = require("../../server/server_metrics");
const Config = require("../../server/server_config");
const SFConfig = require("../../server/server_sf_config");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare
]

router.get('/', middleWare, function(req, res, next) {
    const ssmConfig = Config.get("satisfactory");
    const sfConfig = SFConfig.getConfigData()

    const modsConfig = Config.get("mods");

    const ssmConfig_clone = Object.assign(Object.create(Object.getPrototypeOf(ssmConfig)), ssmConfig)
    const sfConfig_clone = Object.assign(Object.create(Object.getPrototypeOf(sfConfig)), sfConfig)

    ssmConfig_clone.password = null;

    res.json({
        result: "success",
        data: {
            satisfactory: ssmConfig_clone,
            sf_server: sfConfig_clone,
            mods: modsConfig
        }
    });
});

router.get('/ssm/setup', middleWare, function(req, res, next) {
    res.json({
        result: "success",
        data: Config.get("ssm.setup")
    });
});

router.post('/ssm/setup', middleWare, function(req, res, next) {
    const body = req.body;

    Config.setSSMSetupConfig(body).then(() => {
        res.json({
            result: "success"
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })

});


router.post('/selectsave', middleWare, function(req, res, next) {
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

router.post('/newsession', middleWare, function(req, res, next) {
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

router.post('/ssmsettings', middleWare, function(req, res, next) {

    const post = req.body
    SFS_Handler.updateSSMSettings(post).then(result => {
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

router.post('/sfsettings', middleWare, function(req, res, next) {

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

router.post('/modssettings', middleWare, function(req, res, next) {
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