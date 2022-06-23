const Config = require("../server/server_config");
const ModHandler = require("../server/ms_agent/server_new_mod_handler");

Config.load().then(() => {
    return ModHandler.init();
}).then(() => {
    return ModHandler.InstallMod("RefinedPower", "3.0.9")
}).catch(err => {
    console.log(err);
})