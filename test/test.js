const SF_Config = require("../server/server_sf_config");

SF_Config.load();

console.log(SF_Config.getConfigData())