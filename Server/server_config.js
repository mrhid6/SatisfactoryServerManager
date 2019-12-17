const fs = require("fs-extra");
const path = require("path");

const Mrhid6Utils = require("../Mrhid6Utils");
const iConfig = Mrhid6Utils.Config;
const platform = process.platform;

let userDataPath = null;

switch (platform) {
    case "win32":
        userDataPath = "C:\\ProgramData\\SatisfactoryServerManager";
        break;
    case "linux":
    case "darwin":
        userDataPath = require('os').homedir() + "/.SatisfactoryServerManager";
        break;
}

if (fs.pathExistsSync(userDataPath) == false) {
    fs.mkdirSync(userDataPath);
}

class ServerConfig extends iConfig {
    constructor() {
        super({
            configFileName: userDataPath + "/SSM.json"
        });

        console.log("new instance!");
    }

    load() {
        super.load();
        this.setDefaults();
    }

    setDefaults() {

        const versionFile = path.join(__basedir, 'assets/version.txt')
        let version = "Unknown";

        if (fs.existsSync(versionFile)) {
            version = fs.readFileSync(versionFile, {
                encoding: "utf8"
            }).split(" ")[1]
        }

        super.set("version", version);

        super.get("satisfactory.testmode", true)
        super.get("satisfactory.server_location", "")
        super.get("satisfactory.save.location", "")
        super.get("satisfactory.save.file", "RPTesting");

        super.get("mods.enabled", false);
        super.get("mods.SMLauncher_location", "/opt/SSM/SMLauncher")
        super.get("mods.location", "/opt/SSM/Temp")
    }
}

const serverConfig = new ServerConfig()

module.exports = serverConfig;