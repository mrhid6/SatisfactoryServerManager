const iConfig = require("mrhid6utils").Config;

class ObjGameConfig extends iConfig {
    constructor(configDir) {
        super({
            useExactPath: true,
            configBaseDirectory: configDir,
            configName: "Game",
            configType: "ini",
            createConfig: true,
        });
    }

    setDefaultValues = async () => {
        super.set(
            "/Script/Engine.GameNetworkManager.TotalNetBandwidth",
            104857600
        );
        super.set(
            "/Script/Engine.GameNetworkManager.MaxDynamicBandwidth",
            104857600
        );
        super.set(
            "/Script/Engine.GameNetworkManager.MinDynamicBandwidth",
            104857600
        );

        super.get("/Script/Engine.GameSession.MaxPlayers", 20);
    };
}

module.exports = ObjGameConfig;
