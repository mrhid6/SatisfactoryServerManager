var express = require('express');
var router = express.Router();


const AgentHandler = require("../../server/server_agent_handler");
const Config = require("../../server/server_config");

router.get('/servers', function (req, res, next) {
    AgentHandler.API_GetAllAgents().then(agents => {

        const resData = [];

        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            const agent_clone = JSON.parse(JSON.stringify(agent));

            if (agent_clone.running == true && agent_clone.active == true) {

                agent_clone.info.MaxPlayers = agent_clone.info.config.game.Game["/Script/Engine"].GameSession.MaxPlayers

                delete agent_clone.info.config.satisfactory
                delete agent_clone.info.config.ssm
                delete agent_clone.info.config.smm
                //delete agent_clone.info.config.mods
                delete agent_clone.info.config.game

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
            data: resData
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err
        });
    })

});


module.exports = router;