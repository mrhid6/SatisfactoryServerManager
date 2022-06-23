var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const SSM_Mod_Handler = require("../../server/ms_agent/server_new_mod_handler");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare,
    ServerApp.checkModsEnabledAPIMiddleWare
];

router.get('/smlversions', middleWare, function (req, res, next) {
    SSM_Mod_Handler.RetrieveSMLVersions().then(result => {
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
    SSM_Mod_Handler.RetrieveModListFromAPI().then(result => {
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

router.get('/modinfo/:modReference', middleWare, function (req, res, next) {

    const modReference = req.params.modReference;

    SSM_Mod_Handler.RetrieveModFromAPI(modReference).then(result => {
        res.json({
            result: "success",
            data: result
        });
    })

});

module.exports = router;