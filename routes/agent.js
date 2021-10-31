var express = require('express');
var router = express.Router();
const CryptoJS = require("crypto-js");

const Config = require("../server/server_config");
const Cleanup = require("../server/server_cleanup");

const AgentApp = require("../server/server_agent_app");

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