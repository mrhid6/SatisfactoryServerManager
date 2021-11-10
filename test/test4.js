const Config = require("../server/server_config");
const iSteamCMD = require("../server/server_steamcmd");

const {
    SteamCMDAlreadyInstalled
} = require("../objects/errors/error_steamcmd");

Config.load().then(() => {

    const SteamCMD = new iSteamCMD();
    SteamCMD.init(Config.get("ssm.steamcmd"));

    SteamCMD.download().then(() => {
        console.log("SteamCMD Downloaded!")
        return SteamCMD.run()
    }).then(() => {
        console.log("SteamCMD Initialised!")
    }).then(() => {
        console.log("SteamCMD Installed SF Server!")
    }).catch(err => {
        if (!(err instanceof SteamCMDAlreadyInstalled)) {
            console.log(err);
        }
    })

    SteamCMD.getAppInfo(1690800).then(output => {
        console.log(JSON.stringify(output,null,4))
    })
})