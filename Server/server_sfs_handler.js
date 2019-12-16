const exec = require("child_process").exec
const path = require("path");
const {
    snapshot
} = require("process-list");

const process = require("process");

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

        let SFSExe = "";

        if (Config.get("satisfactory.testmode") == true) {
            SFSExe = path.join(Config.get("satisfactory.server_location"), "FactoryGame.exe");
        } else {
            SFSExe = path.join(Config.get("satisfactory.server_location"), "FactoryServer.exe");
        }

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
                    return this.execSFSCmd("Persistent_Level?loadgame=" + Config.get("satisfactory.save.game") + " &");
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
            snapshot('pid', 'name').then(res => {

                const state = {
                    pid: -1,
                    status: ""
                }

                const process = res.find(el => el.name == "FactoryGame-Win64-Shipping.exe")

                if (process == null) {
                    state.status = "stopped"
                } else {
                    state.pid = process.pid
                    state.status = "running"
                }
                resolve(state);
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
}

function saveFileFilter(file, stats) {
    return path.extname(file) != ".sav";
}

const sfs_handler = new SF_Server_Handler();

module.exports = sfs_handler;