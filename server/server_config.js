const fs = require("fs-extra");
const path = require("path");
const CryptoJS = require("crypto-js");

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
    }

    load() {
        super.load();
        this.setDefaults();
    }

    setDefaults() {


        const defaultpasshash = CryptoJS.MD5("SSM:admin-ssm").toString();
        super.get("ssm.http_port", 3000);
        super.set("ssm.version", "v1.0.10");

        super.get("ssm.users.0.username", "admin")
        super.get("ssm.users.0.password", defaultpasshash)

        super.get("satisfactory.testmode", true)
        super.get("satisfactory.server_location", "")
        super.get("satisfactory.password", "")
        super.get("satisfactory.save.location", "")
        super.get("satisfactory.save.file", "");

        super.get("mods.enabled", false);
        super.get("mods.SMLauncher_location", "")
        super.get("mods.location", "")
    }
}

const serverConfig = new ServerConfig()

module.exports = serverConfig;