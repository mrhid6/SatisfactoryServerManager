var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const Config = require("../../server/server_config");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare
]

router.post("/adduser", middleWare, (req, res) => {
    const post = req.body;

    ServerApp.API_CreateUser(post).then(() => {
        res.json({
            result: "success"
        })
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        })
    })
})

router.post("/generatedebugreport", middleWare, (req, res) => {
    const post = req.body;

    ServerApp.API_GenerateDebugReport(post).then(() => {
        res.json({
            result: "success"
        })
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        })
    })
})

router.get("/debugreports", middleWare, (req, res) => {
    ServerApp.API_GetDebugReports().then(rows => {
        res.json({
            result: "success",
            data: rows || []
        })
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        })
    })

})

router.post("/debugreport/download", middleWare, (req, res) => {
    const UserID = req.session.userid;

    ServerApp.API_DownloadDebugReportFile(req.body, UserID).then(saveFile => {
        res.download(saveFile.dr_path);
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        })
    })
})

router.post("/debugreport/remove", middleWare, (req, res) => {

    ServerApp.API_RemoveDebugReportFile(req.body).then(() => {
        res.json({
            result: "success"
        })
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        })
    })
})


module.exports = router;