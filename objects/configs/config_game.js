const Mrhid6Utils = require("../../Mrhid6Utils");
const iConfig = Mrhid6Utils.Config;


class ObjGameConfig extends iConfig {
    constructor(configDir) {

        super({
            configPath: configDir,
            filename: "Game.ini",
            createConfig: true
        });
    }

    load() {
        return new Promise((resolve, reject) => {
            super.load().then(() => {
                this.setDefaults();
                resolve();
            }).catch(err => {
                reject(err);
            })

        });
    }

    setDefaults() {
        super.set("/Script/Engine.GameNetworkManager.TotalNetBandwidth", 104857600);
        super.set("/Script/Engine.GameNetworkManager.MaxDynamicBandwidth", 104857600);
        super.set("/Script/Engine.GameNetworkManager.MinDynamicBandwidth", 104857600);

        super.get("/Script/Engine.GameSession.MaxPlayers", 20);
    }
}

module.exports = ObjGameConfig;