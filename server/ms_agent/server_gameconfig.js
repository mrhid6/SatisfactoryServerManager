const SFS_Handler = require("./server_sfs_handler");

const platform = process.platform;
const fs = require("fs-extra");
const path = require("path");

const Config = require("./../server_config");


const IEngineConfig = require("../../objects/configs/config_engine.js");
const IGameConfig = require("../../objects/configs/config_game.js");


class GameConfig {
    constructor() {}

    load() {
        return new Promise((resolve, reject) => {
            SFS_Handler.isGameInstalled().then(installed => {
                if (installed === true) {

                    let PlatformFolder = ""
                    if (platform == "win32") {
                        PlatformFolder = "WindowsServer";
                    } else {
                        PlatformFolder = "LinuxServer";
                    }

                    const configDir = path.join(Config.get("satisfactory.server_location"), "FactoryGame", "Saved", "Config", PlatformFolder);
                    fs.ensureDirSync(configDir);

                    this._EngineConfig = new IEngineConfig(configDir);
                    this._GameConfig = new IGameConfig(configDir);

                    const promises = [];
                    promises.push(this._EngineConfig.load())
                    promises.push(this._GameConfig.load())

                    return Promise.all(promises);
                } else {
                    return;
                }
            }).then(() => {
                resolve();
            }).catch(err => {
                console.log(err);
            })
        });
    }

    getEngineConfig() {
        return this._EngineConfig;
    }

    getGameConfig() {
        return this._GameConfig;
    }
}

const gameConfig = new GameConfig();
module.exports = gameConfig;