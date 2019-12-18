const exec = require("child_process").exec
const path = require("path");

const si = require("systeminformation")

const fs = require("fs-extra");
const recursive = require("recursive-readdir");


const logger = require("./server_logger");
const Cleanup = require("./server_cleanup");
const Config = require("./server_config");

class SF_Server_Handler {

    constructor() {


    }

    execOSCmd(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
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

    startServer() {
        return new Promise((resolve, reject) => {

            this.getServerStatus().then(server_status => {

                if (server_status.pid == -1) {
                    return this.execSFSCmd("Persistent_Level?loadgame=" + Config.get("satisfactory.save.file") + " &");
                } else {
                    reject("Server is already started!")
                    return;
                }
            }).then(res => {
                resolve(res);
            }).catch(err => {
                reject(err);
            })
        });
    }

    stopServer() {
        return new Promise((resolve, reject) => {
            this.getServerStatus().then(server_status => {
                if (server_status.pid != -1) {
                    process.kill(server_status.pid, 'SIGINT');
                    resolve();
                } else {
                    reject("Server is already stopped!")
                    return;
                }
            })
        })
    }

    killServer() {
        return new Promise((resolve, reject) => {
            this.getServerStatus().then(server_status => {
                if (server_status.pid != -1) {
                    process.kill(server_status.pid, 'SIGKILL');
                    resolve();
                } else {
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

            const ResFiles = [];

            recursive(saveLocation, [saveFileFilter], (err, files) => {

                if (err) {
                    reject(err);
                    return;
                }

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];

                    const stats = fs.statSync(file)
                    const basename = path.basename(file)
                    const savename = basename.slice(0, -4);

                    const fileObj = {
                        fullpath: file,
                        last_modified: stats.mtime,
                        filename: basename,
                        savename: savename
                    }
                    ResFiles.push(fileObj);
                }

                resolve(ResFiles);
            });
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
}

function saveFileFilter(file, stats) {
    return (path.extname(file) != ".sav" && stats.isDirectory() == false);
}

const sfs_handler = new SF_Server_Handler();

module.exports = sfs_handler;