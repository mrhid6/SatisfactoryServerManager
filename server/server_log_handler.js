const exec = require("child_process").exec
const path = require("path");
const moment = require("moment")
const fs = require("fs-extra")
const recursive = require("recursive-readdir");

const Config = require("./server_config");
const logger = require("./server_logger");

const {
    getLogFilePath
} = require("satisfactory-mod-manager-api")

class SSM_Log_Handler {
    constructor() {

    }

    init() {
        this.setupEventHandlers();
    }

    setupEventHandlers() {

    }

    getSSMLog() {
        return new Promise((resolve, reject) => {

            this.getLogFiles(logger.logdir).then(files => {
                const logfile = files.find(el => {
                    const filename = path.basename(el);

                    const date = moment().format("YYYYMMDD");

                    if (filename.startsWith(date)) {
                        return true;
                    }

                    return false;
                })

                if (logfile == null) {
                    reject("Can't find log file");
                    return;
                }

                fs.readFile(logfile, (err, data) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    const dataStr = data.toString().replace(/\r\n/g, '\n');
                    const dataArr = (dataStr.split("\n")).reverse().filter(el => el != "");
                    resolve(dataArr)
                })
            }).catch(err => {
                reject(err);
                return;
            })
        })
    }

    getSFServerLog() {
        return new Promise((resolve, reject) => {

            const logfile = path.join(Config.get("satisfactory.log.location"), "FactoryGame.log");

            if (fs.existsSync(logfile) == false) {
                reject("Can't find log file");
                return;
            }

            fs.readFile(logfile, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                const dataStr = data.toString().replace(/\r\n/g, '\n');
                const dataArr = (dataStr.split("\n")).reverse().filter(el => el != "");
                resolve(dataArr)
            })
        });
    }

    getSMLauncherLog() {
        return new Promise((resolve, reject) => {
            const logfile = getLogFilePath();

            if (fs.existsSync(logfile) == false) {
                reject("Can't find log file");
                return;
            }

            fs.readFile(logfile, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                const dataStr = data.toString().replace(/\r\n/g, '\n');
                const dataArr = (dataStr.split("\n")).reverse().filter(el => el != "");
                resolve(dataArr)
            })
        });
    }

    getLogFiles(directory) {
        return new Promise((resolve, reject) => {
            recursive(directory, [logFileFilter], (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(files);
            });
        });

    }
}


function logFileFilter(file, stats) {
    return (path.extname(file) != ".log" && stats.isDirectory() == false);
}




const ssm_log_handler = new SSM_Log_Handler();
module.exports = ssm_log_handler;