const Config = require("./server_config");
const logger = require("./server_logger");

const SFS_Handler = require("./ms_agent/server_sfs_handler");
const SSM_Mod_Handler = require("./ms_agent/server_new_mod_handler");
const SSM_Log_Handler = require("./server_log_handler");
const GameConfig = require("./ms_agent/server_gameconfig");
const SSM_BackupManager = require("./ms_agent/server_backup_manager");

const AgentDB = require("./ms_agent/server_agent_db");

const StatsManager = require("./ms_agent/server_stats_manager");

const path = require("path");
const fs = require("fs-extra");

const rimraf = require("rimraf");

class AgentApp {
    constructor() {}

    init = async () => {
        try {
            await AgentDB.init();

            await SFS_Handler.init();
            await SSM_Mod_Handler.init();

            SSM_BackupManager.init();

            await StatsManager.init();
        } catch (err) {
            logger.error(
                "[SFS_HANDLER] - Failed To Initialize - " + err.message
            );
        }

        this.SetupEventHandlers();
    };

    SetupEventHandlers() {}

    AgentConfig() {
        const ssmConfig = Config.get("ssm");
        const sfConfig = Config.get("satisfactory");
        const modsConfig = Config.get("mods");
        let gameConfig = {};

        if (GameConfig.getEngineConfig() != null) {
            gameConfig = {
                Engine: GameConfig.getEngineConfig().get(),
                Game: GameConfig.getGameConfig().get(),
            };
        }

        const ssmConfig_clone = JSON.parse(JSON.stringify(ssmConfig));
        const sfConfig_clone = Object.assign(
            Object.create(Object.getPrototypeOf(sfConfig)),
            sfConfig
        );

        delete ssmConfig_clone.users;
        delete ssmConfig_clone.agent;
        delete ssmConfig_clone.steamcmd;
        delete ssmConfig_clone.tempdir;
        delete ssmConfig_clone.github_version;

        delete sfConfig_clone.server_exe;
        delete sfConfig_clone.server_sub_exe;

        return {
            satisfactory: sfConfig_clone,
            ssm: ssmConfig_clone,
            mods: modsConfig,
            game: gameConfig,
        };
    }

    API_GetInfo = async () => {
        try {
            const resData = {
                version: Config.get("ssm.version"),
                config: this.AgentConfig(),
            };

            const serverstate = await SFS_Handler.getServerStatus();

            resData.serverstate = serverstate;
            delete resData.serverstate.pid1;
            delete resData.serverstate.pid2;

            const usercount = await this.GetUserCount();
            resData.usercount = usercount;

            const mods = await SSM_Mod_Handler.API_GetInstalledMods();
            resData.mods = mods;

            const stats = await StatsManager.API_ToJson();
            resData.stats = stats;

            return resData;
        } catch (err) {
            throw err;
        }
    };

    GetUserCount = async () => {
        return SSM_Log_Handler._UserCount;
    };

    API_DeleteSave(data) {
        return new Promise((resolve, reject) => {
            SFS_Handler.deleteSaveFile(data.savefile)
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}

const agentApp = new AgentApp();

module.exports = agentApp;
