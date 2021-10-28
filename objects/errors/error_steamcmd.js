class SteamCMDNotInstalled extends Error{
    constructor(){
        super("Steam CMD Not Installed!")
        this.name = "SteamCMDException"
        this.stack = (new Error()).stack;
    }
}