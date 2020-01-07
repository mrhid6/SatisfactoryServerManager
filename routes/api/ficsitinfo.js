var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const SSM_Mod_Handler = require("../../server/server_mod_handler");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare,
    ServerApp.checkModsEnabledAPIMiddleWare
];

router.get('/smlversions', middleWare, function (req, res, next) {
    SSM_Mod_Handler.getFicsitSMLVersions().then(result => {
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

router.get('/modslist', middleWare, function (req, res, next) {
    SSM_Mod_Handler.getFicsitModList().then(result => {
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

router.get('/modinfo/:modid', middleWare, function (req, res, next) {

    const modid = req.params.modid;

    SSM_Mod_Handler.getFicsitModInfo(modid).then(result => {
        res.json({
            result: "success",
            data: result
        });
    })

});

module.exports = router;