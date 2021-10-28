const exec = require("child_process").exec
const path = require("path");
const schedule = require('node-schedule');

const Config = require("./server_config");
const logger = require("./server_logger");
const fs = require("fs-extra");

const platform = process.platform;

const {
    SatisfactoryInstall,
    getAvailableSMLVersions,
    getLatestSMLVersion,
    getMod,
    getModVersions,
} = require("satisfactory-mod-manager-api")

const {
    request
} = require("graphql-request");

const {
    SMLAPINotReady
} = require("../objects/errors/error_sml");


const SteamCmd = require("steamcmd");

class SSM_Mod_Handler {
    constructor() {
        this.FicsitApiURL = "https://api.ficsit.app/v2/query";
    }

    init() {
        logger.info("[Mod_Handler] [INIT] - Mod Handler Initialized");

        this.waitForSteamCmdInstall().then(() => {
            SteamCmd.getAppInfo(1690800, {
                binDir: Config.get("ssm.steamcmd")
            }).then((data) => {
                const ServerVersion = data.depots.branches.public.buildid;
                this.SML_API = new SatisfactoryInstall("Statisfactory Dedicated Server", ServerVersion, "public", Config.get("satisfactory.server_location"), "", "")
            });

            this.startScheduledJobs();
        })

    }

    waitForSteamCmdInstall() {
        return new Promise((resolve, reject) => {
            let interval = setInterval(() => {
                logger.debug("[Mod_Handler] - Waiting for SteamCMD Install..")
                let steamcmdexe = ""
                if (platform == "win32") {
                    steamcmdexe = path.join(Config.get("ssm.steamcmd"), "steamcmd.exe")
                } else {
                    steamcmdexe = path.join(Config.get("ssm.steamcmd"), "steamcmd.sh")
                }
                if (fs.existsSync(steamcmdexe)) {
                    logger.debug("[Mod_Handler] - SteamCMD Install Completed!")
                    resolve();
                    clearInterval(interval);
                    return;
                }
            })
        });
    }

    startScheduledJobs() {
        schedule.scheduleJob('30 * * * *', () => {
            if (Config.get("mods.enabled") && Config.get("mods.autoupdate")) {
                this.autoUpdateAllMods().catch(err => {
                    console.log(err)
                })
            }
        });
    }

    getSMLInfo() {
        return new Promise((resolve, reject) => {

            if (this.SML_API == null) {
                reject(new SMLAPINotReady());
                return;
            }

            this.SML_API._getInstalledSMLVersion().then(res => {
                const infoObject = {
                    state: "not_installed",
                    version: ""
                }

                if (typeof res != 'undefined' && res != "") {
                    infoObject.state = "installed"
                    infoObject.version = res;
                }

                resolve(infoObject);
            })
        });
    }

    getModsInstalled() {
        return new Promise((resolve, reject) => {
            if (this.SML_API == null) {
                reject(new SMLAPINotReady());
                return;
            }

            this.SML_API._getInstalledMods().then(res => {
                const resArr = [];

                for (let i = 0; i < res.length; i++) {
                    const mod = res[i];

                    const ModObj = {
                        name: mod.name,
                        id: mod.mod_id,
                        version: mod.version
                    }

                    resArr.push(ModObj);
                }

                resolve(resArr);
            })
        });
    }

    installModVersion(modid, version) {
        return new Promise((resolve, reject) => {
            if (this.SML_API == null) {
                reject(new SMLAPINotReady());
                return;
            }
            logger.info("[MOD_HANDLER] [INSTALL] - Installing Mod: " + modid + " (" + version + ")");
            this.SML_API.installMod(modid, version).then(() => {
                logger.info("[MOD_HANDLER] [INSTALL] - Installed Mod: " + modid + " (" + version + ")");
                resolve()
            }).catch(err => {
                logger.error("[MOD_HANDLER] [INSTALL] - Installing Mod Failed!");
                reject(err);
            })
        });
    }

    uninstallMod(modid) {
        return new Promise((resolve, reject) => {

            if (this.SML_API == null) {
                reject(new SMLAPINotReady());
                return;
            }

            let currentMod = null;
            this.getModsInstalled().then(mods => {
                currentMod = mods.find(el => el.id == modid);

                if (currentMod != null) {
                    logger.info("[MOD_HANDLER] [UNINSTALL] - Uninstalling Mod: " + currentMod.id + " (" + currentMod.version + ")");
                    return this.SML_API.uninstallMod(modid);
                }
                return;
            }).then(() => {
                logger.info("[MOD_HANDLER] [UNINSTALL] - Uninstalled Mod: " + currentMod.id + " (" + currentMod.version + ")");
                resolve();
            }).catch(err => {
                logger.error("[MOD_HANDLER] [UNINSTALL] - Uninstalling Mod Failed!");
                reject(err);
            })
        })
    }

    // TODO: Placeholder for SMLAPI updateMod Function
    updateMod(modid) {
        return new Promise((resolve, reject) => {

            if (this.SML_API == null) {
                reject(new SMLAPINotReady());
                return;
            }

            logger.info("[MOD_HANDLER] [INSTALL] - Updating Mod: " + modid);
            this.SML_API.updateMod(modid).then(() => {
                logger.info("[MOD_HANDLER] [INSTALL] - Updated Mod: " + modid + "!");
                resolve();
            })
        })
    }

    installSMLVersion(req_version) {
        return new Promise((resolve, reject) => {

            if (this.SML_API == null) {
                reject(new SMLAPINotReady());
                return;
            }

            getAvailableSMLVersions().then(versions => {
                const sml_version = versions.find(el => el.version == req_version)

                if (sml_version == null) {
                    logger.error("[MOD_HANDLER] [INSTALL] - Installing SML Failed!");
                    reject("Error: SML version doesn't exist!")
                    return;
                }

                logger.info("[MOD_HANDLER] [INSTALL] - Installing SML " + req_version + " ...")
                this.SML_API.installSML(sml_version.version).then(() => {
                    logger.info("[MOD_HANDLER] [INSTALL] - Installed SML " + req_version + "!")
                    resolve()
                }).catch(err => {
                    logger.error("[MOD_HANDLER] [INSTALL] - Installing SML Failed!");
                    reject(err);
                })


            }).catch(err => {
                logger.error("[MOD_HANDLER] [INSTALL] - Installing SML Failed!");
                reject(err);
            })
        });
    }

    installSMLVersionLatest() {
        return new Promise((resolve, reject) => {

            logger.info("[MOD_HANDLER] [INSTALL] - Installing SML ...")
            getLatestSMLVersion().then(sml_version => {
                return this.installSMLVersion(sml_version.version)
            }).then(res => {
                resolve(res)
            }).catch(err => {
                logger.error("[MOD_HANDLER] [INSTALL] - Installing SML Failed!");
                reject(err);
            })
        })
    }

    getFicsitSMLVersions() {
        return new Promise((resolve, reject) => {

            getAvailableSMLVersions().then(versions => {
                resolve(versions)
            }).catch(err => {
                reject(err);
            })
        });
    }

    getModCount() {
        return new Promise((resolve, reject) => {
            const query = `{
                getMods(filter: {hidden:true}){
                  count
                }
              }`
            request(this.FicsitApiURL, query).then(res => {
                resolve(res.getMods.count)
            })
        })
    }

    getFicsitModList() {
        return new Promise((resolve, reject) => {
            const resArr = [];

            this.getModCount().then(count => {
                const promises = [];
                for (let i = 0; i < (count / 100); i++) {
                    const query = `{
                        getMods(filter: {
                            limit:100,
                            offset: ${i*100},
                            hidden: true
                        }) {
                            mods{
                              id,
                              name,
                              mod_reference,
                              versions
                              {
                                version
                              }
                            }
                          }
                        }`
                    promises.push(request(this.FicsitApiURL, query));
                }
                Promise.all(promises).then(values => {
                    for (let i = 0; i < values.length; i++) {
                        const value = values[i];

                        const mods = value.getMods.mods;
                        for (let i = 0; i < mods.length; i++) {
                            const mod = mods[i];

                            let latest_version = mod.versions[0];

                            if (latest_version == null) continue;

                            resArr.push({
                                id: mod.mod_reference,
                                name: mod.name,
                                latest_version: latest_version.version
                            })

                        }
                    }

                    function compare(a, b) {
                        if (a.name < b.name) {
                            return -1;
                        }
                        if (a.name > b.name) {
                            return 1;
                        }
                        return 0;
                    }

                    resArr.sort(compare);
                    resolve(resArr);
                })
            })
        })
    }

    getFicsitModInfo(modid) {
        return new Promise((resolve, reject) => {
            const ModInfo = {
                id: null,
                name: "",
                logo: "",
                versions: []
            }
            getMod(modid).then(mod => {
                ModInfo.id = mod.id;
                ModInfo.name = mod.name;
                ModInfo.logo = mod.logo;

                return getModVersions(modid)
            }).then(Mod_versions => {
                ModInfo.versions = Mod_versions;
                resolve(ModInfo);
            }).catch(err => {
                reject(err);
            })
        });
    }

    autoUpdateAllMods() {
        return new Promise((resolve, reject) => {
            this.getModsInstalled().then(mods => {

                logger.info("[Mod_Handler] [AUTOUPDATE] - Updating " + mods.length + " mods");

                for (let i = 0; i < mods.length; i++) {
                    const mod = mods[i];
                    this.updateMod(mod.id)
                }

                logger.info("[Mod_Handler] [AUTOUPDATE] - Updated all mods!");
                resolve();
            }).catch(err => {
                reject(err);
            })

        });
    }
}
const ssm_mod_handler = new SSM_Mod_Handler();
module.exports = ssm_mod_handler;