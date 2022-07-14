const iConfig = require("mrhid6utils").Config;

class ObjEngineConfig extends iConfig {
    constructor(configDir) {
        super({
            useExactPath: true,
            configBaseDirectory: configDir,
            configName: "Engine",
            configType: "ini",
            createConfig: true
        });
    }

    setDefaultValues = async() => {
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