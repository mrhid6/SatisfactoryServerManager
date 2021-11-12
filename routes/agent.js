var express = require('express');
var router = express.Router();
const CryptoJS = require("crypto-js");

const Config = require("../server/server_config");
const Cleanup = require("../server/server_cleanup");

const path = require("path");
const multer = require("multer");
const fs = require("fs-extra");

const AgentApp = require("../server/server_agent_app");
const SFS_Handler = require("../server/ms_agent/server_sfs_handler");
const SSM_Mod_Handler = require("../server/ms_agent/server_mod_handler");
const SSM_Log_Handler = require("../server/server_log_handler");
const ServerApp = require("../server/server_app");

//set Storage Engine
const SaveStorage = multer.diskStorage({
    destination: path.resolve(Config.get("satisfactory.save.location")),
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
})

const GameSaveUpload = multer({
    storage: SaveStorage,
    limits: {
        fileSize: (200 * 1024 * 1024 * 1024) //give no. of bytes
    }
}).single('savefile');


router.get("/ping", function (req, res, next) {
    res.json({
        result: "success"
    })
})

router.post("/init", function (req, res, next) {
    Config.InitAgentSettings(req.body);
    res.json({
        result: "success"
    })
})

router.get("/check", checkHeaderKey, function (req, res, next) {
    res.json({
        result: "success"
    })
})

router.post("/stopagent", checkHeaderKey, function (req, res, next) {
    Cleanup.cleanup();
    res.json({
        result: "success"
    })
})

router.get("/info", checkHeaderKey, function (req, res, next) {

    AgentApp.API_GetInfo().then(data => {
        res.json({
            result: "success",
            data
        })
    })
})

router.post('/config/ssmsettings', checkHeaderKey, function (req, res, next) {

    const post = req.body
    SFS_Handler.updateSSMSettings(post).then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.post('/config/sfsettings', checkHeaderKey, function (req, res, next) {

    const post = req.body
    SFS_Handler.updateSFSettings(post).then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.post('/config/modsettings', checkHeaderKey, function (req, res, next) {

    const post = req.body
    SFS_Handler.updateModsSettings(post).then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.post('/config/backupsettings', checkHeaderKey, function (req, res, next) {

    const post = req.body
    SFS_Handler.updateBackupSettings(post).then(() => {
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

router.post('/installsf', checkHeaderKey, function (req, res, next) {
    SFS_Handler.InstallSFServer(true).then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.post('/serveraction', checkHeaderKey, function (req, res, next) {
    const post = req.body;

    let promise = null;

    if (post.action == "start") {
        promise = SFS_Handler.startServer();
    } else if (post.action == "stop") {
        promise = SFS_Handler.stopServer();
    } else if (post.action == "kill") {
        promise = SFS_Handler.killServer();
    }

    promise.then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});


router.get('/modinfo/smlinfo', checkHeaderKey, ServerApp.checkModsEnabledAPIMiddleWare, function (req, res, next) {
    SSM_Mod_Handler.getSMLInfo().then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.get('/modinfo/installed', checkHeaderKey, ServerApp.checkModsEnabledAPIMiddleWare, function (req, res, next) {

    SSM_Mod_Handler.getModsInstalled().then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.post('/modaction/installsml', checkHeaderKey, ServerApp.checkModsEnabledAPIMiddleWare, function (req, res, next) {
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
            error: err.message
        });
    })

});

router.post('/modaction/installmod', checkHeaderKey, ServerApp.checkModsEnabledAPIMiddleWare, function (req, res, next) {
    const post = req.body
    const modid = post.modid;
    const version = post.versionid;

    SSM_Mod_Handler.installModVersion(modid, version).then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.post('/modaction/uninstallmod', checkHeaderKey, ServerApp.checkModsEnabledAPIMiddleWare, function (req, res, next) {
    const post = req.body
    const modid = post.modid;

    SSM_Mod_Handler.uninstallMod(modid).then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.post('/modaction/updatemod', checkHeaderKey, ServerApp.checkModsEnabledAPIMiddleWare, function (req, res, next) {
    const post = req.body
    const modid = post.modid;

    SSM_Mod_Handler.updateMod(modid).then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.get('/gamesaves', checkHeaderKey, function (req, res, next) {
    SFS_Handler.getSaves().then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.post('/gamesaves/upload', checkHeaderKey, function (req, res) {
    GameSaveUpload(req, res, (err) => {
        if (err) {
            res.json({
                result: "error",
                error: err.message
            })
        } else {
            res.json({
                result: "success"
            })
        }
    });
});

router.post('/gamesaves/delete', checkHeaderKey, function (req, res) {

    const post = req.body

    AgentApp.API_DeleteSave(post).then(() => {
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

router.post('/gamesaves/download', checkHeaderKey, function (req, res) {

    const post = req.body

    const saveFile = path.join(Config.get("satisfactory.save.location"), post.savefile + ".sav")

    if (fs.existsSync(saveFile)) {
        res.download(saveFile);
    } else {
        res.status(404).send('Not found');
    }
});


router.get('/logs/ssmlog', checkHeaderKey, function (req, res, next) {

    SSM_Log_Handler.getSSMLog().then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.get('/logs/smlauncherlog', checkHeaderKey, function (req, res, next) {

    SSM_Log_Handler.getSMLauncherLog().then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.get('/logs/sfserverlog', checkHeaderKey, function (req, res, next) {

    SSM_Log_Handler.getSFServerLog().then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});



function checkHeaderKey(req, res, next) {
    const headers = req.headers;
    const headerKey = headers['x-ssm-key'];
    if (headerKey == null) {
        console.log("Key is null : ", req.originalUrl);
        res.json({
            success: false,
            error: "Key is null!"
        });
        return;
    }

    const AgentHash = CryptoJS.MD5(`${headerKey}-SSMAgent${Config.get("ssm.agent.id")}`).toString();

    if (AgentHash == Config.get("ssm.agent.key")) {
        next();
        return;
    }

    res.json({
        success: false,
        error: "Key mismatch!"
    });
    return;
}




module.exports = router;