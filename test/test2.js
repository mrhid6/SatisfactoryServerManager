const { SatisfactoryInstall } = require("satisfactory-mod-launcher-api");

const sfInstall = new SatisfactoryInstall(
    "Satisfactory Early Access",
    "109075.0.0",
    "C:\\tmp\\SSM_Temp",
    "FactoryGame.exe"
);

console.log(sfInstall.mods);
sfInstall._getInstalledMods().then((mods) => {
    console.log(mods);
});
