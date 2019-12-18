var express = require('express');
var router = express.Router();

const SFS_Handler = require("../server/server_sfs_handler");
const SSM_Mod_Handler = require("../server/server_mod_handler");
const Config = require("../server/server_config");

router.post('/serveraction/start', function (req, res, next) {
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

router.post('/serveraction/stop', function (req, res, next) {
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

router.post('/serveraction/kill', function (req, res, next) {
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

router.get('/serverstatus', function (req, res, next) {

    SFS_Handler.getServerStatus().then(result => {
        res.json({
            result: "success",
            data: result
        });
    })
});

router.get('/saves', function (req, res, next) {

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

router.get('/config', function (req, res, next) {

    res.json({
        result: "success",
        data: {
            satisfactory: Config.get("satisfactory"),
            mods: Config.get("mods")
        }
    });
});

router.post('/config/sfsettings', function (req, res, next) {
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

router.post('/config/modssettings', function (req, res, next) {
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

router.get('/modsinstalled', function (req, res, next) {

    if (Config.get("mods.enabled") == false) {
        res.json({
            result: "error",
            error: "Mods not enabled!"
        });

    } else {
        SSM_Mod_Handler.getModsInstalled().then(result => {
            res.json({
                result: "success",
                data: result
            });
        })
    }
});

router.get('/smlversion', function (req, res, next) {


    if (Config.get("mods.enabled") == false) {
        res.json({
            result: "error",
            error: "Mods not enabled!"
        });

    } else {
        SSM_Mod_Handler.getSMLInfo().then(result => {
            res.json({
                result: "success",
                data: result
            });
        })
    }
});



module.exports = router;