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

const configOptions = {
    configFileName: userDataPath + "/SSM.json"
}

const Config = new iConfig(configOptions);

const versionFile = path.join(__basedir, 'assets/version.txt')
let version = "Unknown";

if (fs.existsSync(versionFile)) {
    version = fs.readFileSync(versionFile, {
        encoding: "utf8"
    }).split(" ")[1]
}

Config.set("version", version);

Config.get("satisfactory.testmode", true)
Config.get("satisfactory.server_location", "")
Config.get("satisfactory.save.location", "")
Config.get("satisfactory.save.file", "RPTesting");

Config.get("mods.enabled", false);
Config.get("mods.SMLauncher_location", "/opt/SSM/SMLauncher")
Config.get("mods.location", "/opt/SSM/Temp")

module.exports = Config;