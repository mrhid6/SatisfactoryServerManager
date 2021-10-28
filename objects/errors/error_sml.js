class SMLAPINotReady extends Error {
    constructor() {
        super("SMLAPI Not ready!")
        this.name = "SMLAPIException"
        this.stack = (new Error()).stack;
    }
}

module.exports.SMLAPINotReady = SMLAPINotReady;