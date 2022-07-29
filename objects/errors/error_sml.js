class SMLAPINotReady extends Error {
    constructor() {
        super("SMLAPI Not ready!");
        this.name = "SMLAPIException";
        this.stack = new Error().stack;
    }
}

class ModsNotEnabled extends Error {
    constructor() {
        super("Mods are not enabled!");
        this.name = "ModsNotEnabledException";
        this.stack = new Error().stack;
    }
}

class ModManifestNotExists extends Error {
    constructor() {
        super("Mod Manifest Doesn't Exist!");
        this.name = "ModManifestNotExistsException";
        this.stack = new Error().stack;
    }
}

class ModNotInstalled extends Error {
    constructor() {
        super("Mod Is Not Installed!");
        this.name = "ModNotInstalledException";
        this.stack = new Error().stack;
    }
}

module.exports.SMLAPINotReady = SMLAPINotReady;
module.exports.ModsNotEnabled = ModsNotEnabled;
module.exports.ModManifestNotExists = ModManifestNotExists;
module.exports.ModNotInstalled = ModNotInstalled;
