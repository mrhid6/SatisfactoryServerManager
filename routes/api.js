var express = require('express');
var router = express.Router();

const SSM_Mod_Handler = require("../Server/server_mod_handler");

router.post('/serveraction/:action', function (req, res, next) {
    const params = req.params
    console.log(JSON.stringify(params, null, 2));
    res.json({
        result: "success"
    });
});

router.get('/modsinstalled', function (req, res, next) {
    const params = req.params;

    SSM_Mod_Handler.getModsInstalled().then(result => {
        res.json({
            result: "success",
            data: result
        });
    })

});

module.exports = router;