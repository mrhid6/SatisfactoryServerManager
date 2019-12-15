var express = require('express');
var router = express.Router();

const Config = require("../server/server_config");

const SFS_Handler = require("../Server/server_sfs_handler");
const SSM_Mod_Handler = require("../Server/server_mod_handler");

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