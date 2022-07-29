class SteamCMDNotInstalled extends Error {
    constructor() {
        super("Steam CMD Not Installed!");
        this.name = "SteamCMDException";
        this.stack = new Error().stack;
    }
}

class SteamCMDAlreadyInstalled extends Error {
    constructor() {
        super("Steam CMD Is Already Installed!");
        this.name = "SteamCMDException";
        this.stack = new Error().stack;
    }
}

class SFFailedInstall extends Error {
    constructor() {
        super("Satisfactory Server Failed To Install");
        this.name = "SFFailedInstall";
        this.stack = new Error().stack;
    }
}

class SFActionFailedRunning extends Error {
    constructor() {
        super("Cant fulfill action cause server is running!");
        this.name = "SFActionFailedRunning";
        this.stack = new Error().stack;
    }
}

module.exports.SteamCMDAlreadyInstalled = SteamCMDAlreadyInstalled;
module.exports.SteamCMDNotInstalled = SteamCMDNotInstalled;
module.exports.SFFailedInstall = SFFailedInstall;
module.exports.SFActionFailedRunning = SFActionFailedRunning;
