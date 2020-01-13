const fs = require('fs');
const path = require('path');
const platformfolder = require('platform-folders');
const platform = process.platform;

const Mrhid6Utils = require("../Mrhid6Utils");
const iConfig = Mrhid6Utils.Config;


let LocalAppData = "";
switch (platform) {
    case "win32":
        LocalAppData = path.resolve(platformfolder.getDataHome() + "/../local");
        break;
    case "linux":
    case "darwin":
        LocalAppData = path.resolve(platformfolder.getDataHome());
        break;
}


class SFConfig extends iConfig {
    constructor() {
        super({
            configPath: path.resolve(LocalAppData + "/FactoryGame/Saved/Config/WindowsNoEditor"),
            filename: "Game.ini"
        })

        this._data = {};
    }

    load() {
        super.load();
    }
}

const sfConfig = new SFConfig();

module.exports = sfConfig;