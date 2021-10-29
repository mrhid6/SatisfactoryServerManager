const fs = require("fs-extra");
const path = require("path");
const CryptoJS = require("crypto-js");

const SSMCloud = require("./server_cloud");
const semver = require("semver");

const Mrhid6Utils = require("../Mrhid6Utils");
const iConfig = Mrhid6Utils.Config;
const platform = process.platform;

const {
    getDataHome,
    getHomeFolder
} = require("platform-folders")

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
const sessionStorePath = path.join(userDataPath, "sessions");

if (fs.pathExistsSync(sessionStorePath) == false) {
    fs.mkdirSync(sessionStorePath);
}



class ServerConfig extends iConfig {
    constructor() {
        super({
            configPath: userDataPath,
            filename: "SSM.json",
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

        const defaultpasshash = CryptoJS.MD5("SSM:admin-ssm").toString();
        super.get("ssm.setup", false)
        super.get("ssm.http_port", 3000);
        super.set("ssm.version", `v1.0.23`);

        super.get("ssm.users.0.username", "admin")
        super.get("ssm.users.0.password", defaultpasshash)

        super.get("ssm.metrics.enabled", false)
        super.get("ssm.metrics.clientid", "")
        super.set("ssm.steamcmd", path.join(userDataPath, "steamcmd"));

        super.get("satisfactory.installed", false)
        super.get("satisfactory.updateonstart", false)
        super.get("satisfactory.server_location", path.join(userDataPath, "SFServer"));

        if (platform == "win32") {
            super.set("satisfactory.server_exe", "FactoryServer.exe")
        } else {
            super.set("satisfactory.server_exe", "FactoryServer.sh")
        }

        if (platform == "win32") {
            super.set("satisfactory.server_sub_exe", "UE4Server-Win64-Shipping.exe")
        } else {
            super.set("satisfactory.server_sub_exe", "UE4Server-Linux-Shipping")
        }

        let localAppdata = "";
        if (platform == "win32") {
            localAppdata = path.resolve(getDataHome() + "/../local/FactoryGame")
        } else {
            localAppdata = path.resolve(getHomeFolder() + "/.config/Epic/FactoryGame")
        }
        const SaveFolder = path.join(localAppdata, "Saved", "SaveGames", "server")
        const LogFolder = path.join(super.get("satisfactory.server_location"), "FactoryGame", "Saved", "Logs")

        super.set("satisfactory.save.location", SaveFolder)
        super.set("satisfactory.log.location", LogFolder)

        super.get("mods.enabled", false);
        super.get("mods.autoupdate", false);
        super.get("mods.location", "")
    }

    getSessionStorePath() {
        return sessionStorePath;
    }

    getSSMVersion() {

        return new Promise((resolve, reject) => {
            this.getGitHubReleaseVersion().then(github_version => {
                const current_version_sem = semver.coerce(super.get("ssm.version"))
                const github_version_sem = semver.coerce(github_version)

                const ver_gt = semver.gt(current_version_sem, github_version_sem);
                const ver_eq = semver.satisfies(current_version_sem, github_version_sem);
                const ver_lt = semver.lt(current_version_sem, github_version_sem);

                let ver_diff = "eq";

                if (ver_gt == true) {
                    ver_diff = "gt"
                } else if (ver_lt == true) {
                    ver_diff = "lt"
                }

                const resData = {
                    current_version: super.get("ssm.version"),
                    github_version: github_version,
                    version_diff: ver_diff
                }
                resolve(resData)
            }).catch(err => {
                reject(err);
            })
        });
    }

    getGitHubReleaseVersion() {
        return new Promise((resolve, reject) => {
            SSMCloud.getGithubLatestRelease().then(release => {
                resolve(release.tag_name)
            }).catch(err => {
                reject(err);
            })
        })

    }

    setSSMSetupConfig(data) {
        return new Promise((resolve, reject) => {
            super.set("ssm.setup", true)
            super.set("ssm.metrics.enabled", (data.metrics == "true"))
            super.set("satisfactory.server_location", data.serverlocation)
            super.set("satisfactory.updateonstart", (data.updateonstart == "true"))

            require("./server_mod_handler").init();
            require("./server_metrics").sendServerStartEvent();

            resolve();
        });
    }
}

const serverConfig = new ServerConfig()

module.exports = serverConfig;