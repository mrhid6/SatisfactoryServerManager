var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const SSM_Mod_Handler = require("../../server/server_mod_handler");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare,
    ServerApp.checkModsEnabledAPIMiddleWare
];

router.get('/smlinfo', middleWare, function (req, res, next) {
    SSM_Mod_Handler.getSMLInfo().then(result => {
        res.json({
            result: "success",
            data: result
        });
    })
});

router.get('/modsinstalled', middleWare, function (req, res, next) {

    SSM_Mod_Handler.getModsInstalled().then(result => {
        res.json({
            result: "success",
            data: result
        });
    })
});

router.post('/installsml', middleWare, function (req, res, next) {
    const post = req.body
    const req_version = post.version;

    let promise = null;
    if (req_version != "latest") {
        promise = SSM_Mod_Handler.installSMLVersion(req_version)
    } else {
        promise = SSM_Mod_Handler.installSMLVersionLatest()
    }

    promise.then(result => {
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

router.post('/installmod', middleWare, function (req, res, next) {
    const post = req.body
    const modid = post.modid;
    const version = post.versionid;

    SSM_Mod_Handler.installModVersion(modid, version).then(result => {
        res.json({
            result: "success",
            data: result
        });
    })
});

router.post('/uninstallmod', middleWare, function (req, res, next) {
    const post = req.body
    const modid = post.modid;

    SSM_Mod_Handler.uninstallMod(modid).then(result => {
        res.json({
            result: "success",
            data: result
        });
    })
});

module.exports = router;