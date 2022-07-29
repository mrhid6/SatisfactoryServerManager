const Config = require("../server_config");
const Logger = require("../server_logger");

const fs = require("fs-extra");
const path = require("path");
const rimraf = require("rimraf");
const axios = require("axios").default;
const StreamZip = require("node-stream-zip");
const semver = require("semver");

const schedule = require("node-schedule");

const {
    ModsNotEnabled,
    ModManifestNotExists,
    ModNotInstalled,
} = require("../../objects/errors/error_sml");

const { request } = require("graphql-request");
const { async } = require("node-stream-zip");

class ModHandler {
    constructor() {
        this.FicsitApiURL = "https://api.ficsit.app";
        this.FicsitQueryURL = `${this.FicsitApiURL}/v2/query`;

        this._Manifest = {};
    }

    init() {
        return new Promise((resolve, reject) => {
            Logger.info("[ModHandler] - Validating Mods Directory ...");
            this.ValidateModsDirectory();
            Logger.info("[ModHandler] - Mods Directory Validation Completed!");

            schedule.scheduleJob("*/30 * * * *", () => {
                this.AutoUpdateMods();
            });

            if (Config.get("mods.enabled") == false) {
                resolve();
                return;
            }

            this.CreateModManifests()
                .then(() => {
                    return this.CreateOrLoadManifest();
                })
                .then(() => {
                    return this.CreateSMLManifest();
                })
                .then(() => {
                    this.ValidateInstalledModsManifest();
                    resolve();
                })
                .catch((err) => {
                    console.log(err);
                });
        });
    }

    CreateOrLoadManifest() {
        return new Promise((resolve, reject) => {
            Logger.info("[ModHandler] - Loading Manifest ...");
            const manifestFileName = path.join(
                Config.get("ssm.manifestdir"),
                `mod_manifest.json`
            );

            if (fs.existsSync(manifestFileName)) {
                const manifestData = fs.readFileSync(manifestFileName);
                try {
                    this._Manifest = JSON.parse(manifestData);
                    Logger.info("[ModHandler] - Finshed Loading Manifest!");
                    resolve();
                } catch (e) {
                    reject(e);
                }
            } else {
                Logger.info(
                    "[ModHandler] - Manifest Not Found Creating New One ..."
                );
                const manifestData = {
                    sml_version: {
                        version: "0.0.0",
                        installed: false,
                    },
                    installed_mods: [],
                };

                this._Manifest = manifestData;

                this.SaveManifest().then(() => {
                    Logger.info(
                        "[ModHandler] - Finshed Creating New Manifest!"
                    );
                    resolve();
                });
            }
        });
    }

    SaveManifest() {
        return new Promise((resolve, reject) => {
            const manifestFileName = path.join(
                Config.get("ssm.manifestdir"),
                `mod_manifest.json`
            );
            fs.writeFileSync(manifestFileName, JSON.stringify(this._Manifest));
            resolve();
        });
    }

    CreateModManifests() {
        return new Promise((resolve, reject) => {
            Logger.info("[ModHandler] - Creating Mod Manifests ...");
            this.RetrieveModListFromAPI().then((mods) => {
                mods.forEach((mod) => {
                    const manifestName = path.join(
                        Config.get("ssm.manifestdir"),
                        `${mod.mod_reference}.json`
                    );
                    fs.writeFileSync(manifestName, JSON.stringify(mod));
                });
                Logger.info("[ModHandler] - Finished Creating Mod Manifests!");
                resolve();
            });
        });
    }

    CreateSMLManifest() {
        return new Promise((resolve, reject) => {
            Logger.info("[ModHandler] - Creating SML Manifest ...");
            this.RetrieveSMLVersions().then((versions) => {
                const manifestName = path.join(
                    Config.get("ssm.manifestdir"),
                    `SML.json`
                );
                fs.writeFileSync(manifestName, JSON.stringify(versions));

                Logger.info("[ModHandler] - Finished Creating SML Manifest!");
                resolve();
            });
        });
    }

    GetSMLManifest() {
        return new Promise((resolve, reject) => {
            Logger.debug("[ModHandler] - Getting SML Manifest ...");
            const manifestFileName = path.join(
                Config.get("ssm.manifestdir"),
                `SML.json`
            );
            if (fs.existsSync(manifestFileName)) {
                const manifestData = fs.readFileSync(manifestFileName);
                try {
                    const manifestJSON = JSON.parse(manifestData);
                    Logger.debug(
                        "[ModHandler] - Finished Getting SML Manifest!"
                    );
                    resolve(manifestJSON);
                } catch (e) {
                    reject(e);
                }
            } else {
                resolve(null);
            }
        });
    }

    ValidateModsDirectory() {
        if (Config.get("satisfactory.installed") == false) {
            Config.set("mods.enabled", false);
            return;
        }

        if (Config.get("mods.enabled") == false) {
            const ModsDirectory = Config.get("mods.directory");
            if (
                ModsDirectory != null &&
                ModsDirectory != "" &&
                fs.existsSync(ModsDirectory)
            ) {
                rimraf.sync(ModsDirectory);
            }
            return;
        }

        const ModsDirectory = path.join(
            Config.get("satisfactory.server_location"),
            "FactoryGame",
            "Mods"
        );
        Config.set("mods.directory", ModsDirectory);
        fs.ensureDirSync(ModsDirectory);
    }

    ValidateInstalledModsManifest() {
        Logger.info(`[ModHandler] - Validating Installed Mods Manifest ...`);
        const promises = [];

        for (let i = 0; i < this._Manifest.installed_mods.length; i++) {
            const installed_mod = this._Manifest.installed_mods[i];
            Logger.debug(
                `[ModHandler] - Checking Mod ${installed_mod.mod_reference} is correctly installed ...`
            );
            promises.push(
                this.CheckModInstalledInModsFolder(
                    installed_mod.mod_reference,
                    installed_mod.version
                ).then((installed) => {
                    if (installed == false) {
                        return this.InstallMod(
                            installed_mod.mod_reference,
                            installed_mod.version
                        ).catch((err) => {});
                    } else {
                        Logger.debug(
                            `[ModHandler] - Verified Mod ${installed_mod.mod_reference} is correctly installed!`
                        );
                        return;
                    }
                })
            );
        }
        Promise.all(promises)
            .then(() => {
                Logger.info(
                    `[ModHandler] - Validated Installed Mods Manifest!`
                );
            })
            .catch((err) => {});
    }

    DoesModManifestExist(modReference) {
        return new Promise((resolve, reject) => {
            const manifestFileName = path.join(
                Config.get("ssm.manifestdir"),
                `${modReference}.json`
            );
            resolve(fs.existsSync(manifestFileName));
        });
    }

    UpdateModManifest(modReference) {
        return new Promise((resolve, reject) => {
            this.DoesModManifestExist(modReference).then((exists) => {
                if (exists == false) {
                    reject(new ModManifestNotExists());
                    return;
                } else {
                    Logger.debug(
                        `[ModHandler] - Updating Mod (${modReference}) Manifest ...`
                    );
                    this.RetrieveModFromAPI(modReference)
                        .then((mod) => {
                            const manifestName = path.join(
                                Config.get("ssm.manifestdir"),
                                `${modReference}.json`
                            );
                            fs.writeFileSync(manifestName, JSON.stringify(mod));
                            Logger.debug(
                                `[ModHandler] - Updated Mod (${modReference}) Manifest!`
                            );
                            resolve();
                        })
                        .catch(reject);
                }
            });
        });
    }

    GetModManifest(modReference) {
        return new Promise((resolve, reject) => {
            this.DoesModManifestExist(modReference).then((exists) => {
                if (exists == false) {
                    reject(new ModManifestNotExists());
                    return;
                } else {
                    Logger.debug("[ModHandler] - Getting Mod Manifest ...");
                    const manifestFileName = path.join(
                        Config.get("ssm.manifestdir"),
                        `${modReference}.json`
                    );
                    if (fs.existsSync(manifestFileName)) {
                        const manifestData = fs.readFileSync(manifestFileName);
                        try {
                            const manifestJSON = JSON.parse(manifestData);
                            Logger.debug(
                                "[ModHandler] - Finished Getting Mod Manifest!"
                            );
                            resolve(manifestJSON);
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        resolve(null);
                    }
                }
            });
        });
    }

    GetInstalledMod(modReference) {
        return new Promise((resolve, reject) => {
            resolve(
                this._Manifest.installed_mods.find(
                    (mod) => mod.mod_reference == modReference
                )
            );
        });
    }

    IsModInstalled(modReference) {
        return new Promise((resolve, reject) => {
            this.GetInstalledMod(modReference).then((InstalledMod) => {
                resolve(InstalledMod != null);
            });
        });
    }

    AddInstalledModToManifest(ModManifest, InstalledVersion) {
        return new Promise((resolve, reject) => {
            this.IsModInstalled(ModManifest.mod_reference).then((installed) => {
                if (installed) {
                    this.GetInstalledMod(ModManifest.mod_reference)
                        .then((ModInstalledManifest) => {
                            return this._GetModUPlugin(
                                ModManifest.mod_reference
                            ).then((upluginData) => {
                                ModInstalledManifest.version =
                                    InstalledVersion.version;
                                ModInstalledManifest.dependencies =
                                    upluginData.Plugins.filter(
                                        (p) => p.Name != "SML"
                                    );
                                return this.SaveManifest();
                            });
                        })
                        .then(() => {
                            resolve();
                        })
                        .catch(reject);
                } else {
                    this._GetModUPlugin(ModManifest.mod_reference)
                        .then((upluginData) => {
                            this._Manifest.installed_mods.push({
                                name: ModManifest.name,
                                mod_reference: ModManifest.mod_reference,
                                version: InstalledVersion.version,
                                dependencies: upluginData.Plugins.filter(
                                    (p) => p.Name != "SML"
                                ),
                            });

                            return this.SaveManifest();
                        })
                        .then(() => {
                            resolve();
                        })
                        .catch(reject);
                }
            });
        });
    }

    InstallMod(modReference, version = "latest") {
        return new Promise((resolve, reject) => {
            if (Config.get("mods.enabled") == false) {
                Logger.warn(
                    `[ModHandler] - Install Mod (${modReference}) Skipped - Mods Not Enabled!`
                );
                reject(new ModsNotEnabled());
                return;
            }

            this.UpdateModManifest(modReference)
                .then(() => {
                    return this.GetModManifest(modReference);
                })
                .then((modManifest) => {
                    if (modManifest == null) {
                        reject(new ModManifestNotExists());
                        return;
                    }
                    Logger.info(
                        `[ModHandler] - Installing Mod (${modManifest.mod_reference}) ...`
                    );

                    this.GetInstalledMod(modReference).then((InstalledMod) => {
                        let versionToInstall = null;

                        if (modManifest.versions.length == 0) {
                            reject(new Error("Mod has no published versions!"));
                            return;
                        }

                        if (version == "latest") {
                            versionToInstall = modManifest.versions[0];
                        } else {
                            const versions = modManifest.versions.filter((v) =>
                                semver.satisfies(v.version, version)
                            );
                            if (version.length > 0) {
                                versionToInstall = versions[0];
                            }
                        }

                        if (versionToInstall == null) {
                            reject(new Error("Mod Version is invalid"));
                            return;
                        }

                        if (
                            InstalledMod != null &&
                            semver.eq(
                                InstalledMod.version,
                                versionToInstall.version
                            )
                        ) {
                            Logger.info(
                                `[ModHandler] - Installing Mod (${modManifest.mod_reference}) Skipped!`
                            );
                            resolve();
                            return;
                        }

                        this._DownloadModVersion(modManifest, versionToInstall)
                            .then(() => {
                                return this.InstallModDependencies(
                                    modManifest.mod_reference,
                                    versionToInstall.version
                                );
                            })
                            .then(() => {
                                return this._CopyModToModsFolder(
                                    modManifest.mod_reference,
                                    versionToInstall.version
                                );
                            })
                            .then(() => {
                                return this.AddInstalledModToManifest(
                                    modManifest,
                                    versionToInstall
                                );
                            })
                            .then(() => {
                                Logger.info(
                                    `[ModHandler] - Successfully Installed Mod (${modManifest.mod_reference})!`
                                );
                                resolve();
                            })
                            .catch(reject);
                    });
                })
                .catch(reject);
        });
    }

    InstallModDependencies(modReference, VersionString) {
        return new Promise((resolve, reject) => {
            const TempDownloadDir = path.join(
                Config.get("ssm.tempdir"),
                "mods"
            );
            const ModFolder = path.join(
                TempDownloadDir,
                `${modReference}_${VersionString}`
            );
            const uPluginFile = path.join(ModFolder, `${modReference}.uplugin`);

            if (fs.existsSync(uPluginFile) == false) {
                reject(new Error(`Cant find mod uplugin file: ${uPluginFile}`));
                return;
            }

            const pluginFileData = fs.readFileSync(uPluginFile);

            try {
                const pluginFileJSON = JSON.parse(pluginFileData);
                const dependencies = pluginFileJSON.Plugins.filter(
                    (d) => d.Name != "SML"
                );

                const promises = [];
                dependencies.forEach((modDependency) => {
                    promises.push(
                        this.InstallMod(
                            modDependency.Name,
                            modDependency.SemVersion
                        )
                    );
                });

                Promise.all(promises).then(() => {
                    resolve();
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    _CheckIfModAlreadyDownloaded(modReference, versionString) {
        return new Promise((resolve, reject) => {
            const TempDownloadDir = path.join(
                Config.get("ssm.tempdir"),
                "mods"
            );

            const ModFolder = path.join(
                TempDownloadDir,
                `${modReference}_${versionString}`
            );

            if (fs.existsSync(ModFolder) == false) {
                resolve(false);
                return;
            }

            const uPluginFile = path.join(ModFolder, `${modReference}.uplugin`);

            if (fs.existsSync(uPluginFile) == false) {
                resolve(false);
                return;
            }

            resolve(true);
        });
    }

    _DownloadModVersion(modManifest, version) {
        return new Promise((resolve, reject) => {
            this._CheckIfModAlreadyDownloaded(
                modManifest.mod_reference,
                version.version
            ).then((exists) => {
                if (exists == true) {
                    Logger.debug(
                        `[ModHandler] - Download Skipped Mod (${modManifest.mod_reference}) Already Downloaded`
                    );
                    resolve();
                } else {
                    Logger.debug(
                        `[ModHandler] - Downloading Mod (${modManifest.mod_reference}) ...`
                    );
                    const TempDownloadDir = path.join(
                        Config.get("ssm.tempdir"),
                        "mods"
                    );

                    fs.ensureDirSync(TempDownloadDir);

                    const outputFile = path.join(
                        TempDownloadDir,
                        `${modManifest.mod_reference}.zip`
                    );
                    const writer = fs.createWriteStream(outputFile);

                    const reqconfig = {
                        responseType: "stream",
                    };

                    const url = `${this.FicsitApiURL}${version.link}`;
                    //console.log(url)

                    axios
                        .get(url, reqconfig)
                        .then((res) => {
                            res.data.pipe(writer);
                            let error = null;

                            writer.on("error", (err) => {
                                error = err;
                                writer.close();
                                reject(err);
                            });

                            writer.on("close", (err) => {
                                if (!error) {
                                    Logger.debug(
                                        `[ModHandler] - Finished Downloading Mod (${modManifest.mod_reference})!`
                                    );
                                    Logger.debug(
                                        `[ModHandler] - Extracting Downloaded Mod (${modManifest.mod_reference}) ...`
                                    );
                                    const extractPath = path.join(
                                        TempDownloadDir,
                                        `${modManifest.mod_reference}_${version.version}`
                                    );
                                    this.UnzipSMODFile(outputFile, extractPath)
                                        .then(() => {
                                            Logger.debug(
                                                `[ModHandler] - Finished Extracting Mod (${modManifest.mod_reference})!`
                                            );
                                            fs.unlinkSync(outputFile);
                                            resolve();
                                        })
                                        .catch(reject);
                                }
                            });
                        })
                        .catch(reject);
                }
            });
        });
    }

    UnzipSMODFile = async (filePath, destPath) => {
        const zipData = new StreamZip.async({
            file: filePath,
        });
        const extractPath = destPath;
        fs.ensureDirSync(extractPath);
        await zipData.extract(null, extractPath);
        await zipData.close();
    };

    _CopyModToModsFolder(modReference, VersionString) {
        return new Promise((resolve, reject) => {
            //const ModsDir = path.join(Config.get("ssm.tempdir"), "installed_mods");
            const ModsDir = Config.get("mods.directory");
            const DestModFolder = path.join(ModsDir, modReference);

            if (fs.existsSync(DestModFolder)) {
                rimraf.sync(DestModFolder);
            }

            const TempDownloadDir = path.join(
                Config.get("ssm.tempdir"),
                "mods"
            );
            const ModFolder = path.join(
                TempDownloadDir,
                `${modReference}_${VersionString}`
            );

            fs.copySync(ModFolder, DestModFolder);
            resolve();
        });
    }

    _GetModUPlugin(modReference) {
        return new Promise((resolve, reject) => {
            const ModsDir = Config.get("mods.directory");
            const ModFolder = path.join(ModsDir, modReference);

            const uPluginFile = path.join(ModFolder, `${modReference}.uplugin`);

            if (fs.existsSync(uPluginFile) == false) {
                reject(new Error(`Cant find mod uplugin file: ${uPluginFile}`));
                return;
            }

            const pluginFileData = fs.readFileSync(uPluginFile);

            try {
                const pluginFileJSON = JSON.parse(pluginFileData);
                resolve(pluginFileJSON);
            } catch (err) {
                reject(err);
            }
        });
    }

    UninstallMod(modReference) {
        return new Promise((resolve, reject) => {
            this.IsModInstalled(modReference).then((installed) => {
                if (installed == false) {
                    reject(new ModNotInstalled());
                    return;
                }

                this.GetInstalledMod(modReference).then((InstalledMod) => {
                    Logger.info(
                        `[ModHandler] - Uninstalling Mod (${modReference}) ...`
                    );
                    const promises = [];
                    InstalledMod.dependencies.forEach((dep) => {
                        const OtherMods = this.GetModsUsingDependency(
                            dep.Name
                        ).filter((mod) => mod.mod_reference != modReference);

                        if (OtherMods.length == 0) {
                            promises.push(this.UninstallMod(dep.Name));
                        }
                    });

                    Promise.all(promises).then(() => {
                        const ModsDir = Config.get("mods.directory");
                        const ModFolder = path.join(ModsDir, modReference);

                        if (fs.existsSync(ModFolder)) {
                            rimraf.sync(ModFolder);
                        }

                        const ModIndex = this._Manifest.installed_mods
                            .map((e) => e.mod_reference)
                            .indexOf(modReference);
                        this._Manifest.installed_mods.splice(ModIndex, 1);
                        this.SaveManifest().then(() => {
                            Logger.info(
                                `[ModHandler] - Uninstalled Mod (${modReference}) Successfully!`
                            );
                            resolve();
                        });
                    });
                });
            });
        });
    }

    GetModsUsingDependency(ModDependency) {
        return this._Manifest.installed_mods.filter(
            (mod) =>
                mod.dependencies.find((d) => d.Name == ModDependency) != null
        );
    }

    InstallSMLVersion(version = "latest") {
        return new Promise((resolve, reject) => {
            if (Config.get("mods.enabled") == false) {
                reject(new ModsNotEnabled());
                return;
            }

            this.GetSMLManifest().then((SMLManifest) => {
                let versionToInstall = null;
                if (version == "latest") {
                    versionToInstall = SMLManifest.versions[0];
                } else {
                    const versions = SMLManifest.versions.filter((v) =>
                        semver.satisfies(v.version, version)
                    );
                    if (version.length > 0) {
                        versionToInstall = versions[0];
                    }
                }

                if (versionToInstall == null) {
                    reject(new Error("Mod Version is invalid"));
                    return;
                }

                Logger.info(
                    `[ModHandler] - Installing SML (${versionToInstall.version}) ...`
                );

                this._DownloadSMLVersion(versionToInstall)
                    .then(() => {
                        return this._CopyModToModsFolder(
                            "SML",
                            versionToInstall.version
                        );
                    })
                    .then(() => {
                        this._Manifest.sml_version.version =
                            versionToInstall.version;
                        this._Manifest.sml_version.installed = true;

                        return this.SaveManifest();
                    })
                    .then(() => {
                        Logger.info(`[ModHandler] - Completed Install Of SML!`);
                        resolve();
                    })
                    .catch(reject);
            });
        });
    }

    _DownloadSMLVersion(SMLVersion) {
        return new Promise((resolve, reject) => {
            this._CheckIfModAlreadyDownloaded("SML", SMLVersion.version).then(
                (exists) => {
                    if (exists == true) {
                        Logger.debug(
                            `[ModHandler] - Download Skipped SML Already Downloaded`
                        );
                        resolve();
                    } else {
                        Logger.debug(
                            `[ModHandler] - Downloading Mod (SML) ...`
                        );
                        const TempDownloadDir = path.join(
                            Config.get("ssm.tempdir"),
                            "mods"
                        );

                        fs.ensureDirSync(TempDownloadDir);

                        const outputFile = path.join(
                            TempDownloadDir,
                            `SML.zip`
                        );
                        const writer = fs.createWriteStream(outputFile);

                        const reqconfig = {
                            responseType: "stream",
                        };
                        const gitHubURL = SMLVersion.link.replace(
                            "tag",
                            "download"
                        );
                        const url = `${gitHubURL}/SML.zip`;
                        //console.log(url)

                        axios
                            .get(url, reqconfig)
                            .then((res) => {
                                res.data.pipe(writer);
                                let error = null;

                                writer.on("error", (err) => {
                                    error = err;
                                    writer.close();
                                    reject(err);
                                });

                                writer.on("close", (err) => {
                                    if (!error) {
                                        Logger.debug(
                                            `[ModHandler] - Finished Downloading Mod (SML)!`
                                        );
                                        Logger.debug(
                                            `[ModHandler] - Extracting Downloaded Mod (SML) ...`
                                        );
                                        const extractPath = path.join(
                                            TempDownloadDir,
                                            `SML_${SMLVersion.version}`
                                        );
                                        this.UnzipSMODFile(
                                            outputFile,
                                            extractPath
                                        )
                                            .then(() => {
                                                Logger.debug(
                                                    `[ModHandler] - Finished Extracting Mod (SML)!`
                                                );
                                                fs.unlinkSync(outputFile);
                                                resolve();
                                            })
                                            .catch(reject);
                                    }
                                });
                            })
                            .catch(reject);
                    }
                }
            );
        });
    }

    UpdateModToLatest(modReference) {
        return new Promise((resolve, reject) => {
            this.IsModInstalled(modReference).then((installed) => {
                if (installed == false) {
                    reject(new ModNotInstalled());
                    return;
                } else {
                    Logger.info(
                        `[ModHandler] - Updating Mod (${modReference})`
                    );

                    this.UpdateModManifest(modReference)
                        .then(() => {
                            return this.GetInstalledMod(modReference);
                        })
                        .then((InstalledMod) => {
                            this.GetModManifest(modReference).then(
                                (modManifest) => {
                                    const latestVersion =
                                        modManifest.versions[0];

                                    if (
                                        semver.gt(
                                            latestVersion.version,
                                            InstalledMod.version
                                        )
                                    ) {
                                        Logger.info(
                                            `[ModHandler] - Update Mod (${modReference}) Found Version (${latestVersion.version})`
                                        );
                                        this.InstallMod(
                                            modReference,
                                            latestVersion.version
                                        ).then(() => {
                                            Logger.info(
                                                `[ModHandler] - Successfully Updated Mod (${modReference}) To Version (${latestVersion.version})`
                                            );
                                            resolve();
                                        });
                                    } else {
                                        Logger.info(
                                            `[ModHandler] - Update Mod (${modReference}) Skipped - On Latest Version`
                                        );
                                        resolve();
                                    }
                                }
                            );
                        });
                }
            });
        });
    }

    CheckModInstalledInModsFolder(modReference, version) {
        return new Promise((resolve, reject) => {
            const ModsDir = Config.get("mods.directory");
            const DestModFolder = path.join(ModsDir, modReference);

            if (fs.existsSync(DestModFolder)) {
                this._GetModUPlugin(modReference)
                    .then((uPluginData) => {
                        resolve(version == uPluginData.SemVersion);
                    })
                    .catch(reject);
            } else {
                resolve(false);
            }
        });
    }

    AutoUpdateMods = async () => {
        Logger.info(`[ModHandler] - Auto Updating Mods`);
        const ServerHandler = require("./server_sfs_handler");
        const serverState = await ServerHandler._getServerState();

        if (serverState.status == "running") {
            Logger.info(
                `[ModHandler] - Auto Updating Mods Skipped Server Running`
            );
            return;
        }

        if (Config.get("mods.enabled") == false) {
            Logger.info(
                `[ModHandler] - Auto Updating Mods Skipped Mods Disabled`
            );
            return;
        }

        for (let i = 0; i < this._Manifest.installed_mods.length; i++) {
            const installMod = this._Manifest.installed_mods[i];
            await this.UpdateModToLatest(installMod.mod_reference);
        }
    };

    /* Ficsit API Requests */

    RetrieveModCountFromAPI() {
        return new Promise((resolve, reject) => {
            const query = ` {
                            getMods(filter: {
                                hidden: true
                            }) {
                                count
                            }
                        }
                        `;
            request(this.FicsitQueryURL, query)
                .then((res) => {
                    resolve(res.getMods.count);
                })
                .catch(reject);
        });
    }

    RetrieveModListFromAPI() {
        return new Promise((resolve, reject) => {
            const resArr = [];

            this.RetrieveModCountFromAPI()
                .then((count) => {
                    const promises = [];
                    for (let i = 0; i < count / 100; i++) {
                        const query = ` {
                            getMods(filter: {
                                limit: 100,
                                offset: ${i * 100},
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
                        }
                        `;
                        promises.push(request(this.FicsitQueryURL, query));
                    }
                    return Promise.all(promises);
                })
                .then((values) => {
                    for (let i = 0; i < values.length; i++) {
                        const value = values[i];

                        const mods = value.getMods.mods;
                        for (let i = 0; i < mods.length; i++) {
                            const mod = mods[i];

                            const latestVersion =
                                mod.versions.length == 0
                                    ? "0.0.0"
                                    : mod.versions[0].version;

                            resArr.push({
                                id: mod.id,
                                mod_reference: mod.mod_reference,
                                name: mod.name,
                                logo: mod.logo,
                                hidden: mod.hidden,
                                versions: mod.versions,
                                latestVersion,
                            });
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
                .catch(reject);
        });
    }

    RetrieveModFromAPI(modReference) {
        return new Promise((resolve, reject) => {
            const query = ` {
                            getModByReference(modReference: "${modReference}") {
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
                        `;

            request(this.FicsitQueryURL, query)
                .then((ModData) => {
                    const mod = ModData.getModByReference;

                    const latestVersion =
                        mod.versions.length == 0
                            ? "0.0.0"
                            : mod.versions[0].version;

                    resolve({
                        id: mod.id,
                        mod_reference: mod.mod_reference,
                        name: mod.name,
                        logo: mod.logo,
                        hidden: mod.hidden,
                        versions: mod.versions,
                        latestVersion,
                    });
                })
                .catch(reject);
        });
    }

    RetrieveSMLVersions() {
        return new Promise((resolve, reject) => {
            const query = ` {
                            getSMLVersions {
                                sml_versions {
                                    version,
                                    link
                                }
                            }
                        }
                        `;

            request(this.FicsitQueryURL, query)
                .then((ModData) => {
                    const versions = ModData.getSMLVersions.sml_versions;
                    resolve({
                        versions: versions,
                    });
                })
                .catch(reject);
        });
    }

    /** API Requests */

    API_GetInstalledMods() {
        return new Promise((resolve, reject) => {
            const resData = [];

            if (Config.get("mods.enabled") == false) {
                resolve([]);
                return;
            }

            this._Manifest.installed_mods.forEach((mod) => {
                resData.push({
                    name: mod.name,
                    mod_reference: mod.mod_reference,
                    version: mod.version,
                });
            });

            resolve(resData);
        });
    }

    API_GetSMLInstalledInfo() {
        return new Promise((resolve, reject) => {
            const infoObject = {
                state: this._Manifest.sml_version.installed
                    ? "installed"
                    : "not_installed",
                version: this._Manifest.sml_version.version,
            };

            resolve(infoObject);
        });
    }
}

const modHandler = new ModHandler();
module.exports = modHandler;
