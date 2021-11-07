var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const AgentHandler = require("../../server/server_agent_handler");
const Config = require("../../server/server_config");

const path = require("path");
const multer = require("multer");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare
]

//set Storage Engine
const TempStorage = multer.diskStorage({
    destination: path.resolve(Config.get("ssm.tempdir")),
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
})

const GameSaveUpload = multer({
    storage: TempStorage,
    limits: {
        fileSize: (200 * 1024 * 1024 * 1024) //give no. of bytes
    }
}).single('savefile');





router.get('/agents', middleWare, function (req, res, next) {
    AgentHandler.API_GetAllAgents().then(agents => {
        res.json({
            result: "success",
            data: agents
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
});

router.post('/create', middleWare, function (req, res, next) {
    AgentHandler.CreateNewDockerAgent().then(() => {
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

router.post('/start', middleWare, function (req, res, next) {
    const agentId = parseInt(req.body.id);

    console.log(req.body);

    AgentHandler.StartDockerAgent(agentId).then(() => {
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

router.post('/stop', middleWare, function (req, res, next) {
    const agentId = parseInt(req.body.id);
    AgentHandler.StopDockerAgent(agentId).then(() => {
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


router.post("/config/ssmsettings", middleWare, function (req, res, next) {
    const post = req.body;
    AgentHandler.API_SetConfigSettings("ssmsettings", post).then(() => {
        res.json({
            result: "success"
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
})

router.post("/config/sfsettings", middleWare, function (req, res, next) {
    const post = req.body;
    AgentHandler.API_SetConfigSettings("sfsettings", post).then(() => {
        res.json({
            result: "success"
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
})

router.post("/config/modsettings", middleWare, function (req, res, next) {
    const post = req.body;
    AgentHandler.API_SetConfigSettings("modsettings", post).then(() => {
        res.json({
            result: "success"
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
})

router.post("/serveractions/installsf", middleWare, function (req, res, next) {
    const post = req.body;
    AgentHandler.API_InstallSF(post).then(() => {
        res.json({
            result: "success"
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
})

router.post("/serveraction", middleWare, function (req, res, next) {
    const post = req.body;
    AgentHandler.API_ExecuteServerAction(post).then(() => {
        res.json({
            result: "success"
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
})

router.post("/modinfo/:info", middleWare, function (req, res, next) {
    const RequestedInfo = req.params.info;
    const post = req.body;
    post.info = RequestedInfo;

    AgentHandler.API_GetModInfo(post).then(data => {
        res.json({
            result: "success",
            data
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
})

router.post("/modaction", middleWare, function (req, res, next) {
    const post = req.body;

    AgentHandler.API_ExecuteModAction(post).then(data => {
        res.json({
            result: "success",
            data
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
})

router.post("/gamesaves", middleWare, function (req, res, next) {
    const post = req.body;

    AgentHandler.API_GetGameSaves(post).then(data => {
        res.json({
            result: "success",
            data
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        });
    })
})


router.post('/gamesaves/upload/:agentid', middleWare, function (req, res) {
    const data = {
        agentid: req.params.agentid
    };

    GameSaveUpload(req, res, (err) => {
        if (err) {
            res.json({
                result: "error",
                error: err.message
            })
        } else {
            AgentHandler.API_UploadSaveFile(req.file, data).then(() => {
                res.json({
                    result: "success"
                })
            }).catch(err => {
                res.json({
                    result: "error",
                    error: err.message
                })
            })
        }
    });
});

router.post('/gamesaves/delete', middleWare, function (req, res) {

    AgentHandler.API_DeleteSaveFile(req.body).then(() => {
        res.json({
            result: "success"
        })
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        })
    })
});

router.post('/gamesaves/download', middleWare, function (req, res) {

    AgentHandler.API_DownloadSaveFile(req.body).then(saveFile => {
        res.download(savefile);
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        })
    })
});


module.exports = router;