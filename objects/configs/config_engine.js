const Mrhid6Utils = require("../../Mrhid6Utils");
const iConfig = Mrhid6Utils.Config;

class ObjEngineConfig extends iConfig {
    constructor(configDir) {
        super({
            configPath: configDir,
            filename: "Engine.ini",
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
        super.set("/Script/Engine.Player.ConfiguredInternetSpeed", 104857600);
        super.set("/Script/Engine.Player.ConfiguredLanSpeed", 104857600);

        super.set("/Script/OnlineSubsystemUtils.IpNetDriver.NetServerMaxTickRate", 120);
        super.set("/Script/OnlineSubsystemUtils.IpNetDriver.MaxNetTickRate", 400);
        super.set("/Script/OnlineSubsystemUtils.IpNetDriver.MaxInternetClientRate", 104857600);
        super.set("/Script/OnlineSubsystemUtils.IpNetDriver.MaxClientRate", 104857600);
        super.set("/Script/OnlineSubsystemUtils.IpNetDriver.LanServerMaxTickRate", 120);
        super.set("/Script/OnlineSubsystemUtils.IpNetDriver.InitialConnectTimeout", 300);
        super.set("/Script/OnlineSubsystemUtils.IpNetDriver.ConnectionTimeout", 300);

        super.set("/Script/SocketSubsystemEpic.EpicNetDriver.MaxClientRate", 104857600);
        super.set("/Script/SocketSubsystemEpic.EpicNetDriver.MaxInternetClientRate", 104857600);
    }
}

module.exports = ObjEngineConfig;