const exec = require("child_process").exec
const path = require("path");
const moment = require("moment")
const fs = require("fs-extra")
const recursive = require("recursive-readdir");

const Config = require("./server_config");
const logger = require("./server_logger");
const es = require('event-stream');
const rimraf = require("rimraf");
const fsR = require('fs-reverse')

class SSM_Log_Handler {
    constructor() {
        this._TotalSFLogLineCount = 0;
    }

    init() {
        this.setupEventHandlers();

        if (Config.get("ssm.agent.isagent") == true) {
            this.ProcessSFServerLog().catch(err => {
                console.log(err);
            })

            const interval = setInterval(() => {
                this.ProcessSFServerLog().catch(err => {
                    console.log(err);
                })
            }, 10000)
        }
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
                    reject(new Error("Can't find log file"));
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

    ProcessSFServerLog() {
        return new Promise((resolve, reject) => {
            var lineNr = 0;
            let tempFileContents = [];
            const joinArray = [];

            const logfile = path.join(Config.get("satisfactory.log.location"), "FactoryGame.log");
            const splitlogDir = path.join(Config.get("ssm.tempdir"), "logSplit");
            const playerJoinsFile = path.join(splitlogDir, "playerJoins.log");

            fs.ensureDirSync(splitlogDir)

            rimraf.sync(`${splitlogDir}/*`);

            if (fs.existsSync(logfile) == false) {
                resolve();
                return;
            }

            let fileData = [];

            var s = fs.createReadStream(logfile)
                .pipe(es.split())
                .pipe(es.mapSync(line => {
                        if (line != "") {
                            // pause the readstream
                            s.pause();

                            if (line.includes("Join suc")) {
                                joinArray.push(line);
                            }

                            tempFileContents.push(line)
                            lineNr++;
                            if (lineNr % 500 == 0) {
                                fileData.push(tempFileContents)
                                tempFileContents = [];
                            }

                            // resume the readstream, possibly from a callback
                            s.resume();
                        }
                    })
                    .on('error', err => {
                        reject(err);
                    })
                    .on('end', () => {

                        if (tempFileContents.length > 0) {
                            fileData.push(tempFileContents)
                            tempFileContents = [];
                        }

                        fileData = fileData.reverse()

                        for (let i = 0; i < fileData.length; i++) {
                            const d = fileData[i];
                            fileData[i] = d.reverse();
                        }

                        for (let i = 0; i < fileData.length; i++) {
                            const d = fileData[i];
                            fs.writeFileSync(`${splitlogDir}/FactoryGame_${i+1}.log`, JSON.stringify(d));
                        }

                        this._TotalSFLogLineCount = lineNr;

                        fs.writeFileSync(playerJoinsFile, JSON.stringify(joinArray));
                        resolve();
                    })
                );
        });
    }

    getSFServerLog(offset = 0) {
        return new Promise((resolve, reject) => {


            const fileNumber = Math.floor(offset / 500) + 1;
            const splitlogDir = path.join(Config.get("ssm.tempdir"), "logSplit");
            const logFile = `${splitlogDir}/FactoryGame_${fileNumber}.log`
            const playerJoinsFile = path.join(splitlogDir, "playerJoins.log");

            if (fs.existsSync(logFile) == false || fs.existsSync(playerJoinsFile) == false) {
                resolve({
                    lineCount: 0,
                    logArray: [],
                    playerJoins: []
                });
                return;
            }

            const fileData = fs.readFileSync(logFile);
            let JsonData = [];
            try {
                JsonData = JSON.parse(fileData);
            } catch (err) {
                reject(err)
                return;
            }

            const playerFileData = fs.readFileSync(playerJoinsFile);
            let JoinArray = [];
            try {
                JoinArray = JSON.parse(playerFileData);
            } catch (err) {
                reject(err)
                return;
            }

            resolve({
                lineCount: this._TotalSFLogLineCount,
                logArray: JsonData,
                playerJoins: JoinArray
            });

        });
    }

    getSMLauncherLog() {
        return new Promise((resolve, reject) => {
            resolve([]);
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