const childProcess = require("child_process")
const path = require("path");
const si = require("systeminformation")
const fs = require("fs-extra");
const recursive = require("recursive-readdir");
const br = require('binary-reader');
const platform = process.platform;
const chmodr = require("chmodr");
const schedule = require('node-schedule');
const rimraf = require("rimraf");

const logger = require("../server_logger");
const Cleanup = require("../server_cleanup");
const Config = require("../server_config");


const iSteamCMD = require("../server_steamcmd");

const {
    SteamCMDNotInstalled,
    SFFailedInstall,
    SFActionFailedRunning,
    SteamCMDAlreadyInstalled
} = require("../../objects/errors/error_steamcmd");

class SF_Server_Handler {

    constructor() {
        this.SteamCMD = new iSteamCMD();
    }

    init() {
        return new Promise((resolve, reject) => {
            logger.info("[SFS_Handler] [INIT] - SFS Handler Initialized");
            this.setupEventHandlers();

            this.InstallSteamCmd().then(() => {
                this._getServerState();

                if (Config.get("satisfactory.updateonstart") == true) {
                    this.InstallSFServer().then(() => {
                        resolve()
                    }).catch(err => {
                        reject(err);
                    })
                } else {
                    resolve()
                }
            }).catch(err => {
                reject(err)
            })
        })
    }

    setupEventHandlers() {
        Cleanup.addEventHandler(() => {
            logger.info("[SFS_Handler] [CLEANUP] - Closing SFS Handler ...");
            this.CleanupSFSHandler();
        })

        schedule.scheduleJob('*/1 * * * *', () => {

            this._getServerState().then(state => {
                this.serverState = state;
            }).catch(err => {
                console.log(err)
            })
        });
    }

    CleanupSFSHandler() {
        this.stopServer().catch(err => {})
    }

    GetSteamCMD() {
        return this.SteamCMD;
    }

    InstallSteamCmd() {
        return new Promise((resolve, reject) => {

            this.SteamCMD.init(Config.get("ssm.steamcmd"));
            logger.info("[SFS_Handler] - Checking SteamCmd binaries ..")

            this.SteamCMD.download().then(() => {
                logger.info("[SFS_Handler] - SteamCmd Downloaded!")
                logger.info("[SFS_Handler] - SteamCmd Initializing!")
                return this.SteamCMD.run()
            }).then(() => {
                logger.info("[SFS_Handler] - SteamCmd Initialised!")
                logger.info("[SFS_Handler] - Installed/Validated SteamCmd binaries")
                this.FixSteamCmdPerms();
            }).then(() => {
                resolve();
            }).catch(err => {
                if (err instanceof SteamCMDAlreadyInstalled) {
                    logger.info("[SFS_Handler] - Installed/Validated SteamCmd binaries")
                    resolve()
                } else {
                    reject(err);
                }
            })
        });
    }

    FixSteamCmdPerms() {
        return new Promise((resolve, reject) => {
            if (platform == "linux") {
                const steamcmdexe = path.join(Config.get("ssm.steamcmd"), "steamcmd.sh")

                if (fs.existsSync(steamcmdexe)) {
                    chmodr(Config.get("ssm.steamcmd"), 0o777, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    reject(new SteamCMDNotInstalled())
                }
            } else {
                resolve();
            }
        })
    }

    InstallSFServer(forceInstall = false) {
        return new Promise((resolve, reject) => {

            if (forceInstall) {
                this.isServerRunning().then(running => {
                    if (running) {
                        reject(new SFActionFailedRunning());
                        return;
                    } else {
                        this._RemoveSFServer().then(() => {
                            return this._InstallSFServer()
                        }).then(() => {
                            resolve();
                        }).catch(err => {
                            reject(err);
                        })
                    }
                })
            } else {
                this._InstallSFServer().then(() => {
                    resolve();
                }).catch(err => {
                    reject(err);
                })
            }

        });
    }

    _RemoveSFServer() {
        return new Promise((resolve, reject) => {
            logger.info("[SFS_Handler] - Removing SF Dedicated Server");
            rimraf(Config.get("satisfactory.server_location"), ["unlink"], err => {
                if (err) {
                    logger.error("[SFS_Handler] - Remove SF Server Error")
                    reject(err);
                    return;
                }
                logger.info("[SFS_Handler] - Removed SF Dedicated Server");
                resolve();
            })
        });
    }

    _InstallSFServer() {
        return new Promise((resolve, reject) => {

            Config.set("satisfactory.installed", false);
            logger.info("[SFS_Handler] - Installing SF Dedicated Server");

            const installPath = `${path.resolve(Config.get("satisfactory.server_location"))}`

            if (installPath.indexOf(" ") > -1) {
                logger.error("[SFS_Handler] - Install path must not contain spaces!")
                reject(new Error("Install Path Contains Spaces!"));
                return;
            }

            this.SteamCMD.updateApp(1690800, installPath).then(() => {
                this.isGameInstalled().then(installed => {
                    if (installed) {
                        this._getServerState();
                        logger.info("[SFS_Handler] - Installed SF Dedicated Server");
                        Config.set("satisfactory.installed", true);
                        this.SteamCMD.getAppInfo(1690800).then(appInfo => {
                            const ServerVersion = appInfo.depots.branches.public.buildid;
                            Config.set("satisfactory.server_version", ServerVersion)
                            const GameConfig = require("./server_gameconfig");
                            return GameConfig.load()
                        }).then(() => {
                            resolve(true);
                        })
                    } else {
                        reject(new SFFailedInstall())
                        return;
                    }

                })


            }).catch(err => {
                reject(err);
            })
        });
    }

    execOSCmd(command) {
        return new Promise((resolve, reject) => {
            childProcess.exec(command, (error, stdout, stderr) => {
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

    execSFSCmd(command) {

        let SFSExeName = Config.get("satisfactory.server_exe")

        const SFSExe = path.join(Config.get("satisfactory.server_location"), SFSExeName);

        return new Promise((resolve, reject) => {
            const fullCommand = "\"" + SFSExe + "\" " + command;
            console.log(fullCommand)
            var process = childProcess.spawn(fullCommand, {
                shell: true,
                cwd: Config.get("satisfactory.server_location"),
                detached: true,
                stdio: 'ignore'
            });

            // @todo: We get the close after this function has ended, I don't know how to capture return code properly here
            process.on('error', (err) => {
                logger.debug(`[SFS_Handler] [SERVER_ACTION] - Child process with error ${err}`);
            });
            process.on('close', (code) => {
                logger.debug(`[SFS_Handler] [SERVER_ACTION] - Child process on close ${code}`);
            });

            process.unref();
            resolve();
        });
    }

    startServer() {

        return new Promise((resolve, reject) => {
            logger.debug("[SFS_Handler] [SERVER_ACTION] - SF Server Starting ...");
            this.getServerStatus().then(server_status => {
                if (server_status.pid == -1) {
                    const LogFile = path.join(Config.get("satisfactory.log.location"), "FactoryServer.Log")

                    const {
                        ServerQueryPort,
                        BeaconPort,
                        Port
                    } = this.getStartupPortConfig()


                    return this.execSFSCmd(`?listen -Port=${Port} -ServerQueryPort=${ServerQueryPort} -BeaconPort=${BeaconPort} -unattended`);
                } else {
                    logger.debug("[SFS_Handler] [SERVER_ACTION] - SF Server Already Running");
                    reject("Server is already started!")
                    return;
                }
            }).then(res => {
                this._getServerState();
                this.wailTillSFServerStarted().then(() => {
                    logger.debug("[SFS_Handler] [SERVER_ACTION] - SF Server Started");
                    resolve(res);
                }).catch(err => {
                    logger.warn("[SFS_Handler] [SERVER_ACTION] - SF Server Failed To Start");
                    reject(err);
                })

            }).catch(err => {
                logger.warn("[SFS_Handler] [SERVER_ACTION] - SF Server Failed To Start");
                reject(err);
            })
        });
    }

    getStartupPortConfig() {
        return {
            ServerQueryPort: (15776 + Config.get("ssm.agent.id")),
            BeaconPort: (14999 + Config.get("ssm.agent.id")),
            Port: (7776 + Config.get("ssm.agent.id"))
        }
    }

    wailTillSFServerStarted() {
        return new Promise((resolve, reject) => {


            let timeoutCounter = 0;
            let timeoutLimit = 30 * 1000; // 30 Seconds

            const interval = setInterval(() => {
                this._getServerState().then(info => {

                    if (timeoutCounter >= timeoutLimit) {
                        clearInterval(interval)
                        reject("Satisfactory server start timed out!")
                        return;
                    }

                    if (info.status == "running") {
                        clearInterval(interval)
                        resolve();
                    } else {
                        timeoutCounter++;
                    }
                })
            }, 1000)
        });
    }

    stopServer() {
        logger.debug("[SFS_Handler] [SERVER_ACTION] - Stopping SF Server ...");
        Cleanup.increaseCounter(1);
        return new Promise((resolve, reject) => {
            this.getServerStatus().then(server_status => {
                if (server_status.pid != -1) {
                    logger.debug("[SFS_Handler] [SERVER_ACTION] - SF Server Stopped");
                    Cleanup.decreaseCounter(1);
                    process.kill(server_status.pid, 'SIGINT');

                    this._getServerState().then(() => {
                        resolve();
                    })

                } else {
                    logger.debug("[SFS_Handler] [SERVER_ACTION] - SF Server Already Stopped");
                    Cleanup.decreaseCounter(1);
                    reject("Server is already stopped!")

                    return;
                }
            })
        })
    }

    killServer() {
        logger.debug("[SFS_Handler] [SERVER_ACTION] - Killing SF Server ...");
        Cleanup.increaseCounter(1);
        return new Promise((resolve, reject) => {
            this.getServerStatus().then(server_status => {
                if (server_status.pid != -1) {
                    process.kill(server_status.pid, 'SIGKILL');
                    logger.debug("[SFS_Handler] [SERVER_ACTION] - SF Server Killed");
                    Cleanup.decreaseCounter(1);
                    this._getServerState().then(() => {
                        resolve();
                    })

                } else {
                    logger.debug("[SFS_Handler] [SERVER_ACTION] - SF Server Already Stopped");
                    Cleanup.decreaseCounter(1);
                    reject("Server is already stopped!")
                    return;
                }
            })
        })
    }

    getServerStatus() {
        return new Promise((resolve, reject) => {
            if (this.serverState == null) {
                this._getServerState().then((state) => {
                    this.serverState = state;
                    resolve(state);
                })
            } else {
                resolve(this.serverState);
            }
        });
    }

    _getServerState() {
        return new Promise((resolve, reject) => {
            logger.debug("[SFS_Handler] - Getting Server State");
            const state = {
                pid: -1,
                status: "",
                pcpu: 0,
                pmem: 0
            }

            this.isGameInstalled().then(installed => {
                if (installed) {
                    return si.processes();
                } else {
                    state.status = "notinstalled";
                    logger.debug("[SFS_Handler] - Received Server State");
                    resolve(state);
                    return;
                }
            }).then(data => {

                if (data == null) {
                    return;
                }

                let process = data.list.find(el => el.name == Config.get("satisfactory.server_exe"))
                let process2 = data.list.find(el => el.name == Config.get("satisfactory.server_sub_exe"))

                if (process == null && process2 == null) {
                    state.status = "stopped"
                } else if (process2 != null) {
                    state.pid = process2.pid
                    state.status = "running"
                    state.pcpu = process2.cpu;
                    state.pmem = process2.mem;
                }

                logger.debug("[SFS_Handler] - Received Server State");
                resolve(state)
                return
            })

        });
    }

    isServerRunning() {
        return new Promise((resolve, reject) => {
            this.getServerStatus().then(status => {
                resolve(status.state == "running");
            })
        })
    }

    isGameInstalled() {
        return new Promise((resolve, reject) => {
            const SFServerExe = path.join(Config.get("satisfactory.server_location"), Config.get("satisfactory.server_exe"));
            if (fs.existsSync(SFServerExe)) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    }


    getSaves() {
        return new Promise((resolve, reject) => {
            const saveLocation = Config.get("satisfactory.save.location")
            if (saveLocation == "") {
                reject("Save location not set!")
                return;
            }

            if (fs.ensureDirSync(saveLocation) == false) {
                reject("Save location doesn't exist!")
                return;
            }


            recursive(saveLocation, [saveFileFilter], (err, files) => {

                if (err) {
                    reject(err);
                    return;
                }

                const promises = [];

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    promises.push(this.getSaveInfo(file))
                }

                Promise.all(promises).then(values => {
                    resolve(values)
                }).catch(err => {
                    console.log("Errored!", err)
                    reject(err);
                    return;
                })
            });
        });
    }

    getSaveInfo(file) {
        return new Promise((resolve, reject) => {
            this.validateSaveFile(file).then(valid => {
                if (valid == false) {
                    const stats = fs.statSync(file)
                    const basename = path.basename(file)
                    const savename = basename.slice(0, -4);
                    const fileObj = {
                        result: "failed",
                        fullpath: file,
                        last_modified: stats.mtime,
                        filename: basename,
                        savename: savename
                    }

                    resolve(fileObj)
                    return;
                } else {
                    return this.getSaveVersion(file);
                }
            }).then(saveVersion => {
                if (saveVersion == null) return;

                if (saveVersion < 20) {
                    const stats = fs.statSync(file)
                    const basename = path.basename(file)
                    const savename = basename.slice(0, -4);
                    const fileObj = {
                        result: "failed",
                        fullpath: file,
                        last_modified: stats.mtime,
                        filename: basename,
                        savename: savename
                    }

                    resolve(fileObj)
                    return;
                }

                return this.getSaveBodyLength(file)
            }).then(length => {
                if (length == null) return;

                return this.getSaveBodyString(file, length)
            }).then(savebody => {
                if (savebody == null) return;
                const stats = fs.statSync(file)
                const basename = path.basename(file)
                const savename = basename.slice(0, -4);

                const fileObj = {
                    result: "success",
                    fullpath: file,
                    last_modified: stats.mtime,
                    filename: basename,
                    savename: savename,
                    savebody: savebody
                }

                resolve(fileObj)
            }).catch(err => {
                console.log(err);
                reject(err);
            })
        });
    }

    readSaveFileOffset(file, start, length) {
        return new Promise((resolve, reject) => {
            let resBuffer = null;

            br.open(file)
                .on("error", function (error) {
                    reject(error);
                })
                .on("close", function () {
                    resolve(resBuffer);
                })
                .seek(start)
                .read(length, function (bytesRead, buffer) {
                    resBuffer = buffer;
                })
                .close();
        })
    }

    validateSaveFile(savefile) {
        return new Promise((resolve, reject) => {
            this.readSaveFileOffset(savefile, 38, 1).then(buffer => {
                const test = buffer.readUInt8();

                if (test == 0) {
                    resolve(false)
                } else {
                    resolve(true)
                }
            }).catch(err => {
                reject(err);
            })
        });
    }

    getSaveVersion(savefile) {
        return new Promise((resolve, reject) => {

            this.readSaveFileOffset(savefile, 4, 4).then(buffer => {
                resolve(buffer.readUInt8())
            }).catch(err => {
                reject(err);
            })
        })
    }

    getSaveBodyLength(savefile) {
        return new Promise((resolve, reject) => {
            this.readSaveFileOffset(savefile, 0, 4).then(buffer => {
                resolve(buffer.readUInt8());
            }).catch(err => {
                reject(err);
            })
        })
    }

    getSaveBodyString(savefile, length) {
        return new Promise((resolve, reject) => {

            this.readSaveFileOffset(savefile, 15, 100).then(buffer => {
                resolve(buffer.toString("utf-8").replace(/\0/g, ''))
            }).catch(err => {
                reject(err);
            })
        })
    }

    deleteSaveFile(savefile) {
        return new Promise((resolve, reject) => {
            const SaveFile = path.resolve(path.join(Config.get("satisfactory.save.location"), savefile + ".sav"))

            if (fs.existsSync(SaveFile) == false) {
                logger.error("[SFS_Handler] - Remove Save Error: Save File Doesn't Exist!")
                reject(new Error("Save File Doesn't Exist!"))
                return;
            }


            rimraf(SaveFile, ["unlink"], err => {
                if (err) {
                    logger.error("[SFS_Handler] - Remove Save Unknown Error")
                    reject(err);
                    return;
                }
                logger.info("[SFS_Handler] - Removed Save File");
                resolve();

            })
        });
    }

    updateSSMSettings(data) {
        return new Promise((resolve, reject) => {
            const updatesfonstart = data.updatesfonstart == "true";

            Config.set("satisfactory.updateonstart", updatesfonstart)
            resolve();

        });
    }

    updateSFSettings(data) {
        return new Promise((resolve, reject) => {
            const maxPlayers = data.maxplayers || 4;

            if (maxPlayers < 4) {
                reject("Max Players must be above 4 players!")
                return;
            }
            const GameConfig = require("./server_gameconfig");
            GameConfig.getGameConfig().set("/Script/Engine.GameSession.MaxPlayers", maxPlayers);
            resolve();
        });
    }

    updateModsSettings(data) {
        return new Promise((resolve, reject) => {
            const enabled = (data.enabled == "true");
            const autoupdate = (data.autoupdate == "true");

            Config.set("mods.enabled", enabled);
            Config.set("mods.autoupdate", autoupdate);
            resolve();

        });
    }
}

function saveFileFilter(file, stats) {
    return (path.extname(file) != ".sav" && stats.isDirectory() == false);
}

const sfs_handler = new SF_Server_Handler();

module.exports = sfs_handler;