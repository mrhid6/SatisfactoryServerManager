const childProcess = require("child_process")
const path = require("path");

const si = require("systeminformation")

const fs = require("fs-extra");
const recursive = require("recursive-readdir");

const br = require('binary-reader');


const logger = require("./server_logger");
const Cleanup = require("./server_cleanup");
const Config = require("./server_config");

class SF_Server_Handler {

    constructor() {

    }

    init() {
        logger.info("[SFS_Handler] [INIT] - SFS Handler Initialized");
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        Cleanup.addEventHandler(() => {
            logger.info("[SFS_Handler] [CLEANUP] - Closing SFS Handler ...");
            this.CleanupSFSHandler();
        })
    }

    CleanupSFSHandler() {
        this.stopServer().catch(err => {})
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

        let SFSExeName = ""
        if (Config.get("satisfactory.testmode") == true) {
            SFSExeName = "FactoryGame.exe"
        } else {
            SFSExeName = "FactoryServer.exe"
        }

        const SFSExe = path.join(Config.get("satisfactory.server_location"), SFSExeName);

        return new Promise((resolve, reject) => {
            const fullCommand = "\"" + SFSExe + "\" " + command;
            console.log(fullCommand)
            var process = childProcess.spawn( fullCommand, {
                shell: true,
                detached: true,
                stdio: 'ignore'
            } );
        
            // @todo: We get the close after this function has ended, I don't know how to capture return code properly here
            process.on('error', (err) => {
                logger.debug(`[SFS_Handler] [SERVER_ACTION] - Child process with error ${error}`);
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
                var saveFileName = Config.get("satisfactory.save.file");
                var loadGameString = ""
                if (saveFileName && saveFileName.length) {
                    loadGameString = "?loadgame=" + saveFileName;
                }
                var sessionName = Config.get("satisfactory.save.session");
                var sessionString = "";
                if (sessionName && sessionName.length) {
                    sessionString = "?sessionName=" + sessionName
                }
                if (server_status.pid == -1) {
                    return this.execSFSCmd( "Persistent_Level?listen?bUseIpSockets" + loadGameString + sessionString + " -NoEpicPortal -unattended" );
                } else {
                    logger.debug("[SFS_Handler] [SERVER_ACTION] - SF Server Already Running");
                    reject("Server is already started!")
                    return;
                }
            }).then(res => {
                logger.debug("[SFS_Handler] [SERVER_ACTION] - SF Server Started");
                resolve(res);
            }).catch(err => {
                logger.warn("[SFS_Handler] [SERVER_ACTION] - SF Server Failed To Start");
                reject(err);
            })
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
                    resolve();
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
                    resolve();
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

            si.processes().then(data => {
                const process = data.list.find(el => el.name == "FactoryGame-Win64-Shipping.exe")

                const state = {
                    pid: -1,
                    status: "",
                    pcpu: 0,
                    pmem: 0
                }

                if (process == null) {
                    state.status = "stopped"
                } else {
                    state.pid = process.pid
                    state.status = "running"
                    state.pcpu = process.pcpu;
                    state.pmem = process.pmem;
                }


                resolve(state)
                return
            })

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
            this.readSaveFileOffset(savefile, 33, 4).then(buffer => {
                resolve(buffer.readUInt8());
            }).catch(err => {
                reject(err);
            })
        })
    }

    getSaveBodyString(savefile, length) {
        return new Promise((resolve, reject) => {

            this.readSaveFileOffset(savefile, 37, length).then(buffer => {
                resolve(buffer.toString("utf-8").replace(/\0/g, ''))
            }).catch(err => {
                reject(err);
            })
        })
    }



    selectSave(savename) {
        return new Promise((resolve, reject) => {
            this.getSaves().then(saves => {
                const saveFile = saves.find(el => el.savename == savename);

                if (saveFile == null) {
                    reject("Save Doesn't Exist!")
                    return;
                }

                Config.set("satisfactory.save.file", saveFile.savename);
                resolve();
            })
        });
    }

    updateSFSettings(data) {
        return new Promise((resolve, reject) => {
            const testmode = (data.testmode == "true");
            const server_location = data.server_location || "";
            const server_password = data.server_password || "";
            const save_location = data.save_location || "";

            if (server_location == "" || save_location == "") {
                reject("Both server location & save locations are required!")
                return;
            }

            if (fs.pathExistsSync(server_location) == false) {
                reject("Server location path doesn't exist!")
                return;
            }

            if (fs.pathExistsSync(save_location) == false) {
                reject("Save location path doesn't exist!")
                return;
            }

            let SFSExeName = ""

            if (testmode == true) {
                SFSExeName = "FactoryGame.exe"
            } else {
                SFSExeName = "FactoryServer.exe"
            }

            const SFSExe = path.join(server_location, SFSExeName);
            if (fs.existsSync(SFSExe) == false) {
                reject("Cant find server executable (" + SFSExeName + ")")
                return;
            }

            Config.set("satisfactory.testmode", testmode);
            Config.set("satisfactory.server_location", server_location);
            Config.set("satisfactory.password", server_password);
            Config.set("satisfactory.save.location", save_location);
            resolve();

        });
    }

    updateModsSettings(data) {
        return new Promise((resolve, reject) => {
            const enabled = (data.enabled == "true");
            const sml_location = data.sml_location || "";
            const mods_location = data.mods_location || "";

            if (sml_location == "" || mods_location == "") {
                reject("Both SMLauncher & Mods folder locations are required!")
                return;
            }

            if (fs.pathExistsSync(sml_location) == false) {
                reject("SMLauncher path doesn't exist!")
                return;
            }

            if (fs.pathExistsSync(mods_location) == false) {
                reject("Mods path doesn't exist!")
                return;
            }

            let SMLExeName = "SatisfactoryModLauncherCLI.exe"

            const SMLExe = path.join(sml_location, SMLExeName);
            if (fs.existsSync(SMLExe) == false) {
                reject("Cant find SMLauncher executable (" + SMLExeName + ")")
                return;
            }

            Config.set("mods.enabled", enabled);
            Config.set("mods.SMLauncher_location", sml_location);
            Config.set("mods.location", mods_location);
            resolve();

        });
    }

    validSessionName(sessionName) {
        logger.info("[SFS_Handler] [validSessionName] - sessionName = " + sessionName ); 
        return sessionName.length > 3;
    }

    updateNewSession(sessionName) {
        return new Promise((resolve, reject) => {
            if( this.validSessionName( sessionName ) ) {
                Config.set("satisfactory.save.file", "");
                Config.set("satisfactory.save.session", sessionName);
                Config.set("satisfactory.save.game")
                resolve();
                return;
            }
            reject("Invalid session name");
        });
    }
}

function saveFileFilter(file, stats) {
    return (path.extname(file) != ".sav" && stats.isDirectory() == false);
}

const sfs_handler = new SF_Server_Handler();

module.exports = sfs_handler;