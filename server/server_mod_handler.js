const exec = require("child_process").exec
const path = require("path");

const Config = require("./server_config");
const logger = require("./server_logger");
const SSM_Ficsit_Handler = require("../server/server_ficsit_handler");

class SSM_Mod_Handler {
    constructor() {

    }

    init() {

    }

    execSMLCLI(command) {

        const SMLCLIExe = path.join(Config.get("mods.SMLauncher_location"), "SatisfactoryModLauncherCLI.exe");

        return new Promise((resolve, reject) => {
            const fullCommand = '"' + SMLCLIExe + "\" " + command;
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

    installSMLVersion(version_id) {
        return new Promise((resolve, reject) => {

            SSM_Ficsit_Handler.getSMLVersions().then(sml_versions => {
                const version = sml_versions.find(el => el.id == version_id);

                if (version == null) {
                    logger.error("[MOD_HANDLER] [INSTALL] - Installing SML Failed!");
                    reject("Cant find sml version!");
                    return;
                }

                this.getSMLInfo().then(smlinfo => {
                    if (smlinfo.state == "installed") {
                        logger.info("[MOD_HANDLER] [UNINSTALL] - Uninstalling SML " + smlinfo.version);
                        const cmd1 = "uninstall_sml -p " + Config.get("mods.location");
                        return this.execSMLCLI(cmd1);
                    }
                }).finally(() => {
                    logger.info("[MOD_HANDLER] [INSTALL] - Installing SML " + version.version + " ...")
                    const cmd2 = "install_sml -v " + version.version + " -p " + Config.get("mods.location");
                    this.execSMLCLI(cmd2).then(res2 => {
                        logger.info("[MOD_HANDLER] [INSTALL] - Installed SML " + version.version + "!")
                        resolve(res2);

                    }).catch(err => {
                        logger.error("[MOD_HANDLER] [INSTALL] - Installing SML Failed!");
                        reject(err);
                    })
                }).catch(err => {
                    logger.error("[MOD_HANDLER] [INSTALL] - Installing SML Failed!");
                    reject(err);
                })
            }).catch(err => {
                logger.error("[MOD_HANDLER] [INSTALL] - Installing SML Failed!");
                reject(err);
            })
        })
    }

    installLatestSMLVersion() {
        return new Promise((resolve, reject) => {
            SSM_Ficsit_Handler.getSMLVersions().then(sml_versions => {
                const version = sml_versions[0]

                if (version == null) {
                    logger.error("[MOD_HANDLER] [INSTALL] - Installing SML Failed!");
                    reject("Cant find sml version!");
                    return;
                }

                return this.installSMLVersion(version.id)
            }).then(res => {
                resolve(res)
            }).catch(err => {
                reject(err);
            })
        })
    }

    installModVersion(modid, versionid) {
        return new Promise((resolve, reject) => {
            SSM_Ficsit_Handler.getFullModsList().then(mods => {
                const mod = mods.find(el => el.id == modid)

                if (mod == null) {
                    logger.error("[MOD_HANDLER] [INSTALL] - Installing Mod Failed!");
                    reject("Cant find mod!");
                    return;
                }

                const version = mod.versions.find(el => el.id == versionid)

                if (version == null) {
                    logger.error("[MOD_HANDLER] [INSTALL] - Installing Mod Failed!");
                    reject("Cant find mod version!");
                    return;
                }

                this.getModsInstalled().then(installed_mods => {
                    const installed_mod = installed_mods.find(el => el.id == mod.id);

                    if (installed_mod != null) {
                        logger.info("[MOD_HANDLER] [UNINSTALL] - Uninstalling Mod: " + mod.name + " " + installed_mod.version);
                        const cmd1 = "uninstall -m " + mod.id + " -v " + installed_mod.version + " -p " + Config.get("mods.location");
                        return this.execSMLCLI(cmd1);
                    }
                }).catch(err => {
                    logger.error("[MOD_HANDLER] [INSTALL] - Installing Mod Failed!");
                    reject(err);
                }).finally(() => {
                    logger.info("[MOD_HANDLER] [INSTALL] - Downloading Mod " + mod.name + " " + version.version + " ...")
                    const cmd2 = "download -m " + mod.id + " -v " + version.version
                    this.execSMLCLI(cmd2).then(res2 => {
                        logger.info("[MOD_HANDLER] [INSTALL] - Downloaded Mod " + mod.name + " " + version.version + "!")
                        logger.info("[MOD_HANDLER] [INSTALL] - Installing Mod " + mod.name + " " + version.version + " ...")

                        const cmd3 = "install -m " + mod.id + " -v " + version.version + " -p " + Config.get("mods.location");
                        return this.execSMLCLI(cmd3)


                    }).then(res3 => {
                        logger.info("[MOD_HANDLER] [INSTALL] - Installed Mod " + mod.name + " " + version.version + "!")
                        resolve(res3);
                    }).catch(err => {
                        logger.error("[MOD_HANDLER] [INSTALL] - Installing Mod Failed!");
                        reject(err);
                    })
                })
            }).catch(err => {
                logger.error("[MOD_HANDLER] [INSTALL] - Installing Mod Failed!");
                reject(err);
            })
        });
    }
}
const ssm_mod_handler = new SSM_Mod_Handler();
module.exports = ssm_mod_handler;