const exec = require("child_process").exec
const path = require("path");

const Config = require("./server_config");

class SSM_Mod_Handler {
    constructor() {

    }

    init() {

    }

    execSMLCLI(command) {

        const SMLCLIExe = path.join(Config.get("SMLCLI_location"), "SatisfactoryModLauncherCLI.exe");

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

    getModsInstalled() {
        return new Promise((resolve, reject) => {

            const cmd = "list_installed -p " + Config.get("mods_location");

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