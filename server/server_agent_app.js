const Config = require("./server_config");

const SFS_Handler = require("./ms_agent/server_sfs_handler");
const SSM_Mod_Handler = require("./ms_agent/server_mod_handler");
const GameConfig = require("./ms_agent/server_gameconfig");

class AgentApp {
    constructor() {}

    init() {
        SFS_Handler.init().then(() => {
            SSM_Mod_Handler.init();
        }).catch(err => {
            console.log(err);
        })

        this.SetupEventHandlers();
    }

    SetupEventHandlers() {

    }

    AgentConfig() {
        const ssmConfig = Config.get("ssm");
        const sfConfig = Config.get("satisfactory");
        const modsConfig = Config.get("mods");
        let gameConfig = {};

        if (GameConfig.getEngineConfig() != null) {
            gameConfig = {
                Engine: GameConfig.getEngineConfig().get(),
                Game: GameConfig.getGameConfig().get(),
            }
        }

        const ssmConfig_clone = JSON.parse(JSON.stringify(ssmConfig));
        const sfConfig_clone = Object.assign(Object.create(Object.getPrototypeOf(sfConfig)), sfConfig)

        delete ssmConfig_clone.users;
        delete ssmConfig_clone.agent;


        return {
            satisfactory: sfConfig_clone,
            smm: ssmConfig_clone,
            mods: modsConfig,
            game: gameConfig
        }
    }

    API_GetInfo() {
        return new Promise((resolve, reject) => {

            const resData = {
                version: Config.get("ssm.version"),
                config: this.AgentConfig()
            }

            SFS_Handler.getServerStatus().then(status => {
                resData.serverstate = status;
                resolve(resData)
            })

        });
    }
}

const agentApp = new AgentApp();

module.exports = agentApp;