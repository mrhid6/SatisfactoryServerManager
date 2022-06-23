const Config = require("../server_config");
const Logger = require("../server_logger");

const fs = require("fs-extra");
const path = require("path");
const rimraf = require("rimraf");
const axios = require("axios").default;
const StreamZip = require("node-stream-zip");
const semver = require("semver");

const {
    ModsNotEnabled,
    ModManifestNotExists
} = require("../../objects/errors/error_sml");

const {
    request
} = require("graphql-request");

class ModHandler {
    constructor() {
        this.FicsitApiURL = "https://api.ficsit.app"
        this.FicsitQueryURL = `${this.FicsitApiURL}/v2/query`;

        this._Manifest = {};
    }


    init() {
        return new Promise((resolve, reject) => {
            Logger.info("[ModHandler] - Validating Mods Directory ...");
            this.ValidateModsDirectory();
            Logger.info("[ModHandler] - Mods Directory Validation Completed!");

            this.CreateModManifests().then(() => {
                return this.CreateOrLoadManifest();
            }).then(() => {
                resolve();
            }).catch(err => {
                console.log(err);
            })
        })
    }

    CreateOrLoadManifest() {
        return new Promise((resolve, reject) => {
            Logger.info("[ModHandler] - Loading Manifest ...");
            const manifestFileName = path.join(Config.get("ssm.manifestdir"), `mod_manifest.json`)

            if (fs.existsSync(manifestFileName)) {
                const manifestData = fs.readFileSync(manifestFileName)
                try {
                    this._Manifest = JSON.parse(manifestData);
                    Logger.info("[ModHandler] - Finshed Loading Manifest!");
                    resolve();
                } catch (e) {
                    reject(e);
                }
            } else {
                Logger.info("[ModHandler] - Manifest Not Found Creating New One ...");
                const manifestData = {
                    sml_version: {
                        version: "0.0.0",
                        installed: false
                    },
                    installed_mods: []
                }

                this._Manifest = manifestData;

                this.SaveManifest().then(() => {
                    Logger.info("[ModHandler] - Finshed Creating New Manifest!");
                    resolve();
                })
            }
        });
    }

    SaveManifest() {
        return new Promise((resolve, reject) => {
            const manifestFileName = path.join(Config.get("ssm.manifestdir"), `mod_manifest.json`)
            fs.writeFileSync(manifestFileName, JSON.stringify(this._Manifest));
            resolve();
        });
    }

    CreateModManifests() {
        return new Promise((resolve, reject) => {
            Logger.info("[ModHandler] - Creating Mod Manifests ...");
            this.RetrieveModListFromAPI().then(mods => {
                mods.forEach(mod => {
                    const manifestName = path.join(Config.get("ssm.manifestdir"), `${mod.mod_reference}.json`)
                    fs.writeFileSync(manifestName, JSON.stringify(mod));
                })
                Logger.info("[ModHandler] - Finished Creating Mod Manifests!");
                resolve();
            })
        })
    }

    ValidateModsDirectory() {
        if (Config.get("satisfactory.installed") == false) {
            Config.set("mods.enabled", false)
            return;
        }

        if (Config.get("mods.enabled") == false) {
            const ModsDirectory = Config.get("mods.directory");
            if (ModsDirectory != null && ModsDirectory != "" && fs.existsSync(ModsDirectory)) {
                rimraf.unlinkSync(ModsDirectory);
            }
            return;
        }

        const ModsDirectory = path.join(Config.get("satisfactory.server_location"), "FactoryGame", "Mods");
        Config.set("mods.directory", ModsDirectory);
        fs.ensureDirSync(ModsDirectory);

    }

    DoesModManifestExist(modReference) {
        return new Promise((resolve, reject) => {
            const manifestFileName = path.join(Config.get("ssm.manifestdir"), `${modReference}.json`)
            resolve(fs.existsSync(manifestFileName))
        });
    }


    UpdateModManifest(modReference) {
        return new Promise((resolve, reject) => {

            this.DoesModManifestExist(modReference).then(exists => {
                if (exists == false) {
                    reject(new ModManifestNotExists());
                    return;
                } else {
                    Logger.debug(`[ModHandler] - Updating Mod (${modReference}) Manifest ...`);
                    this.RetrieveModFromAPI(modReference).then(mod => {
                        const manifestName = path.join(Config.get("ssm.manifestdir"), `${modReference}.json`)
                        fs.writeFileSync(manifestName, JSON.stringify(mod));
                        Logger.debug(`[ModHandler] - Updated Mod (${modReference}) Manifest!`);
                        resolve();
                    }).catch(reject);
                }
            })
        })
    }

    GetModManifest(modReference) {
        return new Promise((resolve, reject) => {
            this.DoesModManifestExist(modReference).then(exists => {
                if (exists == false) {
                    reject(new ModManifestNotExists());
                    return;
                } else {
                    Logger.debug("[ModHandler] - Getting Mod Manifest ...");
                    const manifestFileName = path.join(Config.get("ssm.manifestdir"), `${modReference}.json`)
                    if (fs.existsSync(manifestFileName)) {
                        const manifestData = fs.readFileSync(manifestFileName)
                        try {
                            const manifestJSON = JSON.parse(manifestData);
                            Logger.debug("[ModHandler] - Finished Getting Mod Manifest!");
                            resolve(manifestJSON);
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        resolve(null);
                    }
                }
            })
        })
    }

    GetInstalledMod(modReference) {
        return new Promise((resolve, reject) => {
            resolve(this._Manifest.installed_mods.find(mod => mod.reference == modReference));
        })
    }


    IsModInstalled(modReference) {
        return new Promise((resolve, reject) => {
            this.GetInstalledMod(modReference).then(InstalledMod => {
                resolve(InstalledMod != null);
            })
        })
    }

    AddInstalledModToManifest(ModManifest, InstalledVersion) {
        return new Promise((resolve, reject) => {
            this.IsModInstalled(ModManifest.mod_reference).then(installed => {

                if (installed) {
                    this.GetInstalledMod(ModManifest.mod_reference).then(ModInstalledManifest => {
                        ModInstalledManifest.version = InstalledVersion.version
                        return this.SaveManifest();
                    }).then(() => {
                        resolve();
                    })
                } else {
                    this._Manifest.installed_mods.push({
                        name: ModManifest.name,
                        reference: ModManifest.mod_reference,
                        version: InstalledVersion.version
                    })

                    this.SaveManifest().then(() => {
                        resolve();
                    })
                }
            })
        })
    }


    InstallMod(modReference, version = "latest") {
        return new Promise((resolve, reject) => {

            if (Config.get("mods.enabled") == false) {
                reject(new ModsNotEnabled());
                return;
            }

            this.UpdateModManifest(modReference).then(() => {
                return this.GetModManifest(modReference);
            }).then(modManifest => {
                if (modManifest == null) {
                    reject(new ModManifestNotExists());
                    return;
                }

                Logger.info(`[ModHandler] - Installing Mod (${modManifest.mod_reference}) ...`);

                let versionToInstall = null;

                if (version == "latest") {
                    versionToInstall = modManifest.versions[0]
                } else {
                    const versions = modManifest.versions.filter(v => semver.satisfies(v.version, version));
                    if (version.length > 0) {
                        versionToInstall = versions[0];
                    }
                }

                if (versionToInstall == null) {
                    reject(new Error("Mod Version is invalid"))
                    return;
                }

                this._DownloadModVersion(modManifest, versionToInstall).then(() => {
                    return this.AddInstalledModToManifest(modManifest, versionToInstall);
                }).then(() => {
                    return this.InstallModDependencies(modManifest.mod_reference, versionToInstall.version);
                }).then(() => {
                    return this._CopyModToModsFolder(modManifest.mod_reference, versionToInstall.version);
                }).then(() => {
                    Logger.info(`[ModHandler] - Successfully Installed Mod (${modManifest.mod_reference})!`);
                    resolve();
                }).catch(reject);
            }).catch(reject);
        })
    }

    InstallModDependencies(modReference, VersionString) {
        return new Promise((resolve, reject) => {
            const TempDownloadDir = path.join(Config.get("ssm.tempdir"), "mods")
            const ModFolder = path.join(TempDownloadDir, `${modReference}_${VersionString}`);
            const uPluginFile = path.join(ModFolder, `${modReference}.uplugin`)

            if (fs.existsSync(uPluginFile) == false) {
                reject(new Error(`Cant find mod uplugin file: ${uPluginFile}`))
                return;
            }

            const pluginFileData = fs.readFileSync(uPluginFile);

            try {
                const pluginFileJSON = JSON.parse(pluginFileData);
                const dependencies = pluginFileJSON.Plugins.filter(d => d.Name != "SML");

                const promises = [];
                dependencies.forEach(modDependency => {
                    promises.push(this.InstallMod(modDependency.Name, modDependency.SemVersion))
                })

                Promise.all(promises).then(() => {
                    resolve();
                })
            } catch (err) {
                reject(err);
            }
        })
    }

    _CheckIfModAlreadyDownloaded(modReference, versionString) {
        return new Promise((resolve, reject) => {
            const TempDownloadDir = path.join(Config.get("ssm.tempdir"), "mods")

            const ModFolder = path.join(TempDownloadDir, `${modReference}_${versionString}`);

            if (fs.existsSync(ModFolder) == false) {
                resolve(false);
                return;
            }

            const uPluginFile = path.join(ModFolder, `${modReference}.uplugin`)

            if (fs.existsSync(uPluginFile) == false) {
                resolve(false);
                return;
            }

            resolve(true);
        })
    }

    _DownloadModVersion(modManifest, version) {
        return new Promise((resolve, reject) => {
            this._CheckIfModAlreadyDownloaded(modManifest.mod_reference, version.version).then(exists => {
                if (exists == true) {
                    Logger.debug(`[ModHandler] - Download Skipped Mod (${modManifest.mod_reference}) Already Downloaded`);
                    resolve();
                } else {
                    Logger.debug(`[ModHandler] - Downloading Mod (${modManifest.mod_reference}) ...`);
                    const TempDownloadDir = path.join(Config.get("ssm.tempdir"), "mods")

                    fs.ensureDirSync(TempDownloadDir);

                    const outputFile = path.join(TempDownloadDir, `${modManifest.mod_reference}.zip`);
                    const writer = fs.createWriteStream(outputFile);

                    const reqconfig = {
                        responseType: 'stream',
                    }

                    const url = `${this.FicsitApiURL}${version.link}`;
                    //console.log(url)

                    axios.get(url, reqconfig).then(res => {
                        res.data.pipe(writer)
                        let error = null;

                        writer.on("error", err => {
                            error = err;
                            writer.close();
                            reject(err)
                        })

                        writer.on("close", err => {
                            if (!error) {
                                Logger.debug(`[ModHandler] - Finished Downloading Mod (${modManifest.mod_reference})!`);
                                Logger.debug(`[ModHandler] - Extracting Downloaded Mod (${modManifest.mod_reference}) ...`);
                                const extractPath = path.join(TempDownloadDir, `${modManifest.mod_reference}_${version.version}`);
                                this.UnzipSMODFile(outputFile, extractPath).then(() => {
                                    Logger.debug(`[ModHandler] - Finished Extracting Mod (${modManifest.mod_reference})!`);
                                    fs.unlinkSync(outputFile);
                                    resolve();
                                }).catch(reject)
                            }
                        })
                    }).catch(reject)
                }
            })
        });
    }


    UnzipSMODFile = async(filePath, destPath) => {
        const zipData = new StreamZip.async({
            file: filePath
        });
        const extractPath = destPath;
        fs.ensureDirSync(extractPath);
        await zipData.extract(null, extractPath);
        await zipData.close();
    }

    _CopyModToModsFolder(modReference, VersionString) {
        return new Promise((resolve, reject) => {
            //const ModsDir = path.join(Config.get("ssm.tempdir"), "installed_mods");
            const ModsDir = Config.get("mods.directory");
            const DestModFolder = path.join(ModsDir, modReference)

            const TempDownloadDir = path.join(Config.get("ssm.tempdir"), "mods")
            const ModFolder = path.join(TempDownloadDir, `${modReference}_${VersionString}`);

            fs.copySync(ModFolder, DestModFolder)
            resolve();
        });
    }



    /* Ficsit API Requests */

    RetrieveModCountFromAPI() {
        return new Promise((resolve, reject) => {
            const query = `{
                getMods(filter: {hidden:true}){
                  count
                }
              }`
            request(this.FicsitQueryURL, query).then(res => {
                resolve(res.getMods.count)
            }).catch(reject)
        })
    }

    RetrieveModListFromAPI() {
        return new Promise((resolve, reject) => {
            const resArr = [];

            this.RetrieveModCountFromAPI().then(count => {
                const promises = [];
                for (let i = 0; i < (count / 100); i++) {
                    const query = `{
                        getMods(filter: {
                            limit:100,
                            offset: ${i*100},
                            hidden: true
                        }) {
                            mods {
                            id,
                            name,
                            hidden,
                            logo,
                            mod_reference,
                            versions {
                                version,
                                link,
                                    sml_version,
                                    dependencies {
                                        mod_id
                                    }
                            }
                          }
                        }
                    }`
                    promises.push(request(this.FicsitQueryURL, query));
                }
                return Promise.all(promises)
            }).then(values => {
                for (let i = 0; i < values.length; i++) {
                    const value = values[i];

                    const mods = value.getMods.mods;
                    for (let i = 0; i < mods.length; i++) {
                        const mod = mods[i];

                        let latest_version = mod.versions[0];

                        if (latest_version == null) continue;

                        resArr.push({
                            id: mod.id,
                            mod_reference: mod.mod_reference,
                            name: mod.name,
                            hidden: mod.hidden,
                            versions: mod.versions
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
            }).catch(reject);
        })
    }

    RetrieveModFromAPI(modReference) {
        return new Promise((resolve, reject) => {
            const query = `{
                getModByReference(modReference: "${modReference}") {
                    id,
                    name,
                    hidden,
                    logo,
                    mod_reference,
                    versions
                     {
                        version,
                        link,
                        sml_version,
                            dependencies {
                                mod_id
                            }
                    }
                }
            }`

            request(this.FicsitQueryURL, query).then(ModData => {
                const mod = ModData.getModByReference;
                resolve({
                    id: mod.id,
                    mod_reference: mod.mod_reference,
                    name: mod.name,
                    hidden: mod.hidden,
                    versions: mod.versions
                });
            }).catch(reject);
        });
    }
}

const modHandler = new ModHandler();
module.exports = modHandler;