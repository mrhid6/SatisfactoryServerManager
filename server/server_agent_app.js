const Config = require("./server_config");

const SFS_Handler = require("./ms_agent/server_sfs_handler");
const SSM_Mod_Handler = require("./ms_agent/server_mod_handler");

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

    API_GetInfo() {
        return new Promise((resolve, reject) => {

            const resData = {
                version: Config.get("ssm.version")
            }

            SFS_Handler.getServerStatus().then(status => {
                resData.sfStatus = status;
                resolve(resData)
            })

        });
    }
}

const agentApp = new AgentApp();

module.exports = agentApp;