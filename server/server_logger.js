const iLogger = require("mrhid6utils").Logger;

class Logger extends iLogger {

    constructor() {
        super({
            logName: "SSM"
        })
    }
}

const logger = new Logger();
module.exports = logger;