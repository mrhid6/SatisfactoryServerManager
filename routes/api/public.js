var express = require("express");
var router = express.Router();

const AgentHandler = require("../../server/server_agent_handler");
const Config = require("../../server/server_config");

const UserManager = require("../../server/server_user_manager");

router.get("/servers", checkHeaderKey, async (req, res, next) => {
    try {
        await checkAPIPermissions("api.servers", req.apikey);
    } catch (err) {
        res.json({
            result: "error",
            error: err.message,
        });
        return;
    }

    try {
        const agents = await AgentHandler.API_GetAllAgents();
        const resData = [];

        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            const agent_clone = JSON.parse(JSON.stringify(agent));

            if (agent_clone.running == true && agent_clone.active == true) {
                agent_clone.info.MaxPlayers = 0;

                if (agent_clone.info.config.game.Game != null) {
                    agent_clone.info.MaxPlayers =
                        agent_clone.info.config.game.Game[
                            "/Script/Engine"
                        ].GameSession.MaxPlayers;
                }
                delete agent_clone.info.config.game;

                delete agent_clone.info.config.satisfactory;
                delete agent_clone.info.config.ssm;
                delete agent_clone.info.config.smm;
                //delete agent_clone.info.config.mods

                delete agent_clone.ports.AgentPort;
                delete agent_clone.ports.BeaconPort;
                delete agent_clone.ports.ServerPort;
                delete agent_clone.info.serverstate.pid1;
                delete agent_clone.info.serverstate.pid2;
                delete agent_clone.info.serverstate.pcpu;
                delete agent_clone.info.serverstate.pmem;
            }

            resData.push(agent_clone);
        }

        res.json({
            result: "success",
            data: resData,
        });
    } catch (err) {
        res.json({
            result: "error",
            error: err.message,
        });
        return;
    }
});

router.post("/serveraction", checkHeaderKey, async (req, res, next) => {
    try {
        await checkAPIPermissions("api.serveractions", req.apikey);
    } catch (err) {
        res.json({
            result: "error",
            error: err.message,
        });
        return;
    }

    const body = req.body;

    if (body.agentid == null || body.agentid == "") {
        res.json({
            result: "error",
            error: "Body doesn't include 'agentid' property!",
        });
        return;
    }

    if (body.action == null || body.action == "") {
        res.json({
            result: "error",
            error: "Body doesn't include 'action' property!",
        });
        return;
    }

    try {
        const UserAccount = await UserManager.GetUserFromAPIKey(req.apikey);
        await AgentHandler.API_ExecuteServerAction(body, UserAccount.getId());

        res.json({
            result: "success",
        });
    } catch (err) {
        res.json({
            result: "error",
            error: err.message,
        });
        return;
    }
});

const checkAPIPermissions = async (permission, key) => {
    try {
        await UserManager.CheckAPIUserHasPermission(permission, key);
    } catch (err) {
        throw err;
    }
};

function checkHeaderKey(req, res, next) {
    const headers = req.headers;
    const headerKey = headers["x-ssm-key"];
    if (headerKey == null) {
        console.log("Key is null : ", req.originalUrl);
        res.json({
            success: false,
            error: "Key is null!",
        });
        return;
    }

    UserManager.CheckAPIKeyIsValid(headerKey).then((valid) => {
        if (valid) {
            req.apikey = headerKey;
            next();
            return;
        } else {
            res.json({
                success: false,
                error: "Key mismatch!",
            });
            return;
        }
    });
}

module.exports = router;
