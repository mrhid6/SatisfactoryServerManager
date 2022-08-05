const fs = require("fs-extra");
const path = require("path");
const CryptoJS = require("crypto-js");

const SSMCloud = require("./server_cloud");
const semver = require("semver");

const mrhid6utils = require("mrhid6utils");
const iConfig = mrhid6utils.Config;
const platform = process.platform;

const { getDataHome, getHomeFolder } = require("platform-folders");

let userDataPath = null;

switch (platform) {
    case "win32":
        userDataPath = "C:\\ProgramData\\SatisfactoryServerManager";
        break;
    case "linux":
    case "darwin":
        userDataPath = require("os").homedir() + "/.SatisfactoryServerManager";
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
            configName: "SSM",
            createConfig: true,
            useExactPath: true,
            configBaseDirectory: path.join(userDataPath, "configs"),
        });
    }

    setDefaultValues = async () => {
        var AppArgs = process.argv.slice(2);
        if (AppArgs.indexOf("--agent") > -1) {
            this.setAgentDefaults();
        } else {
            super.set("ssm.agent.isagent", false);
            const uuid = mrhid6utils.Tools.generateRandomString(16);
            super.get("ssm.agent.publickey", uuid);

            super.delete("ssm.agent.id");
            super.delete("ssm.agent.key");
            super.delete("ssm.backup");
            super.delete("ssm.setup");
            super.delete("ssm.steamcmd");
            super.delete("satisfactory");
            super.delete("mods");

            const NotificationEvents = [
                "ssm.startup",
                "ssm.shutdown",
                "agent.created",
                "agent.started",
                "agent.shutdown",
                "server.starting",
                "server.running",
                "server.stopping",
                "server.offline",
            ];
            super.get("ssm.notifications.discord.enabled", false);
            super.get("ssm.notifications.discord.webhookurl", "");
            super.set("ssm.notifications.discord.events", NotificationEvents);
        }

        super.set("ssm.tempdir", path.join(userDataPath, "temp"));
        fs.ensureDirSync(super.get("ssm.tempdir"));

        super.get("ssm.http_port", 3000);
        super.set("ssm.version", `v1.1.32`);

        if (super.get("ssm.users") != null) {
            super.delete("ssm.users");
        }

        if (super.get("ssm.metrics") != null) {
            super.delete("ssm.metrics");
        }

        this.getGitHubReleaseVersion()
            .then((github_version) => {
                super.set("ssm.github_version", github_version);
            })
            .catch((err) => {});
    };

    setAgentDefaults() {
        super.get("ssm.agent.setup", false);
        super.set("ssm.agent.isagent", true);
        super.set("ssm.steamcmd", path.join(userDataPath, "steamcmd"));

        super.set("ssm.manifestdir", path.join(userDataPath, "manifest"));
        fs.ensureDirSync(super.get("ssm.manifestdir"));

        super.set("ssm.backup.location", path.join(userDataPath, "backups"));
        super.get("ssm.backup.interval", 1);
        super.get("ssm.backup.keep", 24);
        super.get("ssm.backup.nextbackup", 0);

        super.get("satisfactory.installed", false);
        super.get("satisfactory.updateonstart", false);
        super.set(
            "satisfactory.server_location",
            path.join(userDataPath, "SFServer")
        );

        if (platform == "win32") {
            super.set("satisfactory.server_exe", "FactoryServer.exe");
        } else {
            super.set("satisfactory.server_exe", "FactoryServer.sh");
        }

        if (platform == "win32") {
            super.set(
                "satisfactory.server_sub_exe",
                "UE4Server-Win64-Shipping.exe"
            );
        } else {
            super.set(
                "satisfactory.server_sub_exe",
                "UE4Server-Linux-Shipping"
            );
        }

        let localAppdata = "";
        if (platform == "win32") {
            localAppdata = path.resolve(
                getDataHome() + "/../local/FactoryGame"
            );
        } else {
            localAppdata = path.resolve(
                getHomeFolder() + "/.config/Epic/FactoryGame"
            );
        }
        const SaveFolder = path.join(
            localAppdata,
            "Saved",
            "SaveGames",
            "server"
        );
        const LogFolder = path.join(
            super.get("satisfactory.server_location"),
            "FactoryGame",
            "Saved",
            "Logs"
        );

        super.set("satisfactory.save.location", SaveFolder);
        super.set("satisfactory.log.location", LogFolder);
        super.get("satisfactory.worker_threads", 20);

        super.get("mods.enabled", false);
        super.get("mods.autoupdate", false);

        if (
            super.get("satisfactory.ports") == null &&
            super.get("ssm.agent.setup") == true
        ) {
            const parsedID = parseInt(super.get("ssm.agent.id"));

            if (isNaN(parsedID) == false) {
                const relativeID = parsedID - 1;
                const ServerPort = 15777 + relativeID;
                const BeaconPort = 15000 + relativeID;
                const Port = 7777 + relativeID;

                super.set("satisfactory.ports.serverport", ServerPort);
                super.set("satisfactory.ports.beaconport", BeaconPort);
                super.set("satisfactory.ports.port", Port);
            }
        }
    }

    getSessionStorePath() {
        return sessionStorePath;
    }

    getSSMVersion() {
        return new Promise((resolve, reject) => {
            const current_version_sem = semver.coerce(super.get("ssm.version"));
            const github_version_sem = semver.coerce(
                super.get("ssm.github_version")
            );

            const ver_gt = semver.gt(current_version_sem, github_version_sem);
            const ver_eq = semver.satisfies(
                current_version_sem,
                github_version_sem
            );
            const ver_lt = semver.lt(current_version_sem, github_version_sem);

            let ver_diff = "eq";

            if (ver_gt == true) {
                ver_diff = "gt";
            } else if (ver_lt == true) {
                ver_diff = "lt";
            }

            const resData = {
                current_version: super.get("ssm.version"),
                github_version: super.get("ssm.github_version"),
                version_diff: ver_diff,
            };
            resolve(resData);
        });
    }

    getGitHubReleaseVersion() {
        return new Promise((resolve, reject) => {
            SSMCloud.getGithubLatestRelease()
                .then((release) => {
                    resolve(release.tag_name);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    InitAgentSettings(data) {
        if (super.get("ssm.agent.setup") == false) {
            const AgentHash = CryptoJS.MD5(
                `${data.publicKey}-SSMAgent${data.agentId}`
            ).toString();

            super.set("ssm.agent.id", parseInt(data.agentId));
            super.set("ssm.agent.key", AgentHash);
            super.set("ssm.agent.setup", true);
            super.set("satisfactory.ports.serverport", data.ports.server);
            super.set("satisfactory.ports.beaconport", data.ports.beacon);
            super.set("satisfactory.ports.port", data.ports.port);
        }
    }
}

const serverConfig = new ServerConfig();

module.exports = serverConfig;
