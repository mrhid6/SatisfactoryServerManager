var express = require('express');
var router = express.Router();

const ServerApp = require("../server/server_app");
const SFS_Handler = require("../server/server_sfs_handler");
const SSM_Mod_Handler = require("../server/server_mod_handler");
const SSM_Log_Handler = require("../server/server_log_handler");
const SSM_Ficsit_Handler = require("../server/server_ficsit_handler");
const Config = require("../server/server_config");

var logger = require("../server/server_logger");

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

router.post('/config/selectsave', middleWare, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

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

router.post('/config/newsession', middleWare, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.json({
            result: "error",
            error: "not logged in to ssm!"
        });
        return;
    }

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

router.post('/installsml', middleWare, function (req, res, next) {

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
        return;

    }

    const post = req.body

    const sml_versionid = post.version;
    if (sml_versionid != "latest") {
        SSM_Mod_Handler.installSMLVersion(sml_versionid).then(result => {
            res.json({
                result: "success",
                data: result
            });
        })
    } else {
        SSM_Mod_Handler.installLatestSMLVersion().then(result => {
            res.json({
                result: "success",
                data: result
            });
        })

    }
});

router.post('/installmod', middleWare, function (req, res, next) {

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
        return;
    }


    const post = req.body
    const modid = post.modid;
    const versionid = post.versionid;

    SSM_Mod_Handler.installModVersion(modid, versionid).then(result => {
        res.json({
            result: "success",
            data: result
        });
    })
});

router.get('/ficsit/latestsml', middleWare, function (req, res, next) {

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
        SSM_Ficsit_Handler.getLatestSMLVersion().then(result => {
            res.json({
                result: "success",
                data: result
            });
        })
    }
});

router.get('/ficsit/smlversions', middleWare, function (req, res, next) {

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
        SSM_Ficsit_Handler.getSMLVersions().then(result => {
            res.json({
                result: "success",
                data: result
            });
        })
    }
});

router.get('/ficsit/modslist', middleWare, function (req, res, next) {

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
        SSM_Ficsit_Handler.getModsList().then(result => {
            res.json({
                result: "success",
                data: result
            });
        })
    }
});

router.get('/ficsit/modinfo/:modid', middleWare, function (req, res, next) {

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
        const modid = req.params.modid;

        SSM_Ficsit_Handler.getModInfo(modid).then(result => {
            res.json({
                result: "success",
                data: result
            });
        })
    }
});


module.exports = router;