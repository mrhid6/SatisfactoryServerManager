const fs = require("fs-extra");
const platform = process.platform;

let userDataPath = null;

switch (platform) {
    case "win32":
        userDataPath = "C:\\ProgramData\\StatisfactoryServerManager";
        break;
    case "linux":
    case "darwin":
        userDataPath = require('os').homedir() + "/.StatisfactoryServerManager";
        break;
}

if (fs.pathExistsSync(userDataPath) == false) {
    fs.mkdirSync(userDataPath);
}
const LogFile = userDataPath + "/StatisfactoryServerManager.log"
const Logger = require('simple-node-logger').createSimpleLogger(LogFile);
Logger.setLevel('debug');

console.log(LogFile);

module.exports = Logger;