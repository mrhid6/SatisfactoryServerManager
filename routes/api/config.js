var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const SFS_Handler = require("../../server/server_sfs_handler");
const Metrics = require("../../server/server_metrics");
const Config = require("../../server/server_config");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare
]

router.get('/', middleWare, function (req, res, next) {
    const ssmConfig = Config.get("ssm");
    const sfConfig = Config.get("satisfactory");
    const modsConfig = Config.get("mods");

    const ssmConfig_clone = JSON.parse(JSON.stringify(ssmConfig));
    const sfConfig_clone = Object.assign(Object.create(Object.getPrototypeOf(sfConfig)), sfConfig)

    for (let i = 0; i < ssmConfig_clone.users.length; i++) {
        delete ssmConfig_clone.users[i]["password"];
    }

    res.json({
        result: "success",
        data: {
            satisfactory: sfConfig_clone,
            smm: ssmConfig_clone,
            mods: modsConfig
        }
    });
});

router.get('/ssm/setup', middleWare, function (req, res, next) {
    res.json({
        result: "success",
        data: Config.get("ssm.setup")
    });
});

router.post('/ssm/setup', middleWare, function (req, res, next) {
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


router.post('/ssmsettings', middleWare, function (req, res, next) {

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