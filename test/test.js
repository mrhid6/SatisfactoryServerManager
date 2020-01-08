const {
    SatisfactoryInstall
} = require("../SMLauncherAPI/lib/satisfactoryInstall")

const {
    getAvailableSMLVersions,
    getModVersions
} = require("../SMLauncherAPI/lib/ficsitApp")

const sml_api = new SatisfactoryInstall("C:\\tmp\\SSM_Temp");

getModVersions("oapk7n37fGskj").then(res => {
    console.log(res)
})