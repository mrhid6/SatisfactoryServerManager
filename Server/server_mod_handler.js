const exec = require("child_process").exec
const path = require("path");

const Config = require("./server_config");

class SSM_Mod_Handler {
    constructor() {

    }

    init() {

    }

    execSMLCLI(command) {

        const SMLCLIExe = path.join(Config.get("mods.SMLauncher_location"), "SatisfactoryModLauncherCLI.exe");

        return new Promise((resolve, reject) => {
            const fullCommand = SMLCLIExe + " " + command;
            exec(fullCommand, (error, stdout, stderr) => {
                if (error) {
                    reject(error)
                    return;
                }

                if (stderr) {
                    reject(stderr);
                    return;
                }

                resolve(stdout);
            })
        });
    }

    getSMLInfo() {
        return new Promise((resolve, reject) => {

            const cmd = "sml_version -p " + Config.get("mods.location");

            this.execSMLCLI(cmd).then(res => {

                const resSplit = res.split(/\r?\n/);
                const infoObject = {
                    state: "not_installed",
                    version: ""
                }

                for (let i = 0; i < resSplit.length; i++) {
                    const info = resSplit[i];
                    if (info == "") continue;
                    if (info != "Not Installed") {
                        infoObject.state = "installed"
                    }
                    infoObject.version = info;

                };

                resolve(infoObject);
            });
        });
    }

    getModsInstalled() {
        return new Promise((resolve, reject) => {

            const cmd = "list_installed -p " + Config.get("mods.location");

            this.execSMLCLI(cmd).then(res => {

                const resArr = [];

                const resSplit = res.split(/\r?\n/);

                for (let i = 0; i < resSplit.length; i++) {
                    const mod = resSplit[i];

                    if (mod == "") continue;

                    const modSplit = mod.split(" ");
                    const ModObj = {
                        name: modSplit[0],
                        id: (modSplit[1]).replace("(", "").replace(")", ""),
                        version: modSplit[3]
                    }

                    resArr.push(ModObj);
                }

                resolve(resArr);
            })
        });
    }
}
const ssm_mod_handler = new SSM_Mod_Handler();
module.exports = ssm_mod_handler;