var express = require('express');
var router = express.Router();

const ServerApp = require("../server/server_app");
const SFS_Handler = require("../server/server_sfs_handler");
const SSM_Mod_Handler = require("../server/server_mod_handler");
const SSM_Log_Handler = require("../server/server_log_handler");
const Config = require("../server/server_config");

const middleWare = [
    ServerApp.checkLoggedInMiddleWare
]

router.post('/serveraction/start', middleWare, function (req, res, next) {

    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

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

router.post('/serveraction/stop', middleWare, function (req, res, next) {

    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

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

router.post('/serveraction/kill', middleWare, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

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

router.get('/serverstatus', middleWare, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

    SFS_Handler.getServerStatus().then(result => {
        res.json({
            result: "success",
            data: result
        });
    })
});

router.get('/ssmversion', middleWare, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

    res.json({
        result: "success",
        data: Config.get("ssm.version")
    });
});

router.get('/saves', middleWare, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

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

router.get('/config', middleWare, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

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

router.post('/config/sfsettings', middleWare, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

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

router.post('/config/modssettings', middleWare, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

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

router.get('/modsinstalled', middleWare, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

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

router.get('/smlversion', middleWare, function (req, res, next) {

    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

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

router.get('/logs/ssmlog', middleWare, function (req, res, next) {

    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

    SSM_Log_Handler.getSSMLog().then(result => {
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