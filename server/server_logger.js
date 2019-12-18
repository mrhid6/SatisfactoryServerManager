const fs = require("fs-extra");
const path = require("path");
const platform = process.platform;

let userDataPath = null;

switch (platform) {
    case "win32":
        userDataPath = path.resolve("C:\\ProgramData\\SatisfactoryServerManager");
        break;
    case "linux":
    case "darwin":
        userDataPath = path.join(require('os').homedir(), "/.SatisfactoryServerManager");
        break;
}

if (fs.pathExistsSync(userDataPath) == false) {
    fs.mkdirSync(userDataPath);
}

const LogDir = path.join(userDataPath, "/logs")

if (fs.pathExistsSync(LogDir) == false) {
    fs.mkdirSync(LogDir);
}


const LoggerOpts = {
    timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
    logDirectory: LogDir,
    fileNamePattern: '<DATE>-SSM.log',
    dateFormat: 'YYYYMMDD',
    level: 'debug'
}


const LogManager = require('simple-node-logger').createLogManager(LoggerOpts);
LogManager.createConsoleAppender(LoggerOpts);
const Logger = LogManager.createLogger();

Logger.info("[LOGGER] - Log Directory: " + LogDir)

Logger.logdir = LogDir;

module.exports = Logger;