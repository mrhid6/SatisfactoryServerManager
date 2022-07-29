const path = require("path");

global.__basedir = path.resolve(path.join(__dirname, "../"));

const Config = require("../server/server_config");
const Logger = require("../server/server_logger");
const DB = require("../server/server_db");
const ServerApp = require("../server/server_app");

Number.prototype.pad = function (width, z) {
    let n = this;
    z = z || "0";
    n = n + "";
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

String.prototype.IsJsonString = () => {
    try {
        JSON.parse(this);
    } catch (e) {
        return false;
    }
    return true;
};

Config.load()
    .then(() => {
        Logger.init();
        return DB.init();
    })
    .then(() => {
        return ServerApp.API_GenerateDebugReport();
    })
    .then(() => {
        console.log("Done");
    });
