const logger = require("./server_logger");
const Cleanup = require("./server_cleanup");
const Config = require("./server_config");

class SSM_Server_App {

    constructor() {

    }

    init() {
        logger.info("[SERVER_APP] [INIT] - Starting Server App...");
    }
}

const SSM_server_app = new SSM_Server_App();

module.exports = SSM_server_app;