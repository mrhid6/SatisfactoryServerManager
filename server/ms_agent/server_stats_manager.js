const Config = require("../server_config");
const SFS_HANDLER = require("./server_sfs_handler");
const AgentDB = require("./server_agent_db");

var fs = require("fs-extra");
const path = require("path");
const sfSavToJson = require("satisfactory-json").sav2json;
const sfjson2sav = require("satisfactory-json").json2sav;

class ServerStatsManager {
    constructor() {
        this._SaveFile = null;
    }

    init = async () => {
        try {
            let saveFiles = await SFS_HANDLER.GetBasicSavesInfo();
            if (saveFiles.length > 0) {
                saveFiles.sort(function (a, b) {
                    // Turn your strings into dates, and then subtract them
                    // to get a value that is either negative, positive, or zero.
                    return new Date(b.stats.mtime) - new Date(a.stats.mtime);
                });

                this._SaveFile = saveFiles[0].fullname;
            }
        } catch (err) {
            throw err;
        }

        try {
            await this.validateStatsDBTable();
            await this.LoadStatsFromSaveFile();
        } catch (err) {
            console.log(err);
        }
    };

    validateStatsDBTable = async () => {
        const expectedKeys = [
            "game.foundations",
            "game.conveyors",
            "game.factories",
            "game.pipes",
            "game.playtime",
        ];

        const rows = await AgentDB.query("SELECT * FROM stats");

        const missingKeys = [];

        for (let i = 0; i < expectedKeys.length; i++) {
            const statkey = expectedKeys[i];
            let foundKey = false;
            for (let j = 0; j < rows.length; j++) {
                const row = rows[j];
                if (statkey == row.stat_key) {
                    foundKey = true;
                }
            }

            if (foundKey == false) {
                missingKeys.push(statkey);
            }
        }

        for (let i = 0; i < missingKeys.length; i++) {
            const missingKey = missingKeys[i];
            await AgentDB.queryRun(
                "INSERT INTO stats(stat_key, stat_value) VALUES (?,?)",
                [missingKey, ""]
            );
        }
    };

    LoadStatsFromSaveFile = async () => {
        if (fs.existsSync(this._SaveFile) == false) {
            throw new Error("Save file doesn't exist!");
        }

        try {
            var data = fs.readFileSync(this._SaveFile);
            const SavefileData = await sfSavToJson(data);

            await this.GetFoundationsCountFromSaveData(SavefileData);
            await this.GetConveyorCountFromSaveData(SavefileData);
            await this.GetFactoriesCountFromSaveData(SavefileData);
            await this.GetPipelineCountFromSaveData(SavefileData);
            await this.GetPlaytimeFromSaveData(SavefileData);
        } catch (err) {
            throw err;
        }
    };

    GetFoundationsCountFromSaveData = async (SaveData) => {
        const actors = SaveData.actors;
        const filteredActors = actors.filter((a) =>
            a.pathName.includes("Foundation")
        );

        try {
            await this.StoreStatInDB(
                "game.foundations",
                parseInt(filteredActors.length)
            );
        } catch (err) {
            throw err;
        }
    };
    GetConveyorCountFromSaveData = async (SaveData) => {
        const actors = SaveData.actors;
        const filteredActors = actors.filter((a) =>
            a.pathName.includes("ConveyorBelt")
        );

        try {
            await this.StoreStatInDB(
                "game.conveyors",
                parseInt(filteredActors.length)
            );
        } catch (err) {
            throw err;
        }
    };

    GetFactoriesCountFromSaveData = async (SaveData) => {
        const actors = SaveData.actors;
        const filteredActors = actors.filter(
            (a) =>
                a.pathName.includes("Constructor") ||
                a.pathName.includes("Assembler") ||
                a.pathName.includes("Manufacturer") ||
                a.pathName.includes("Blender") ||
                a.pathName.includes("Foundry") ||
                a.pathName.includes("Smelter") ||
                a.pathName.includes("HadronCollider") ||
                a.pathName.includes("Packager")
        );

        try {
            await this.StoreStatInDB(
                "game.factories",
                parseInt(filteredActors.length)
            );
        } catch (err) {
            throw err;
        }
    };

    GetPipelineCountFromSaveData = async (SaveData) => {
        const actors = SaveData.actors;
        const filteredActors = actors.filter(
            (a) =>
                a.pathName.includes("Pipeline_C") ||
                a.pathName.includes("PipelineMK2_C")
        );

        try {
            await this.StoreStatInDB(
                "game.pipes",
                parseInt(filteredActors.length)
            );
        } catch (err) {
            throw err;
        }
    };

    GetPlaytimeFromSaveData = async (SaveData) => {
        try {
            await this.StoreStatInDB(
                "game.playtime",
                parseInt(SaveData.playDurationSeconds)
            );
        } catch (err) {
            throw err;
        }
    };

    StoreStatInDB = async (key, data) => {
        const SQL = "UPDATE stats SET stat_value=? WHERE stat_key=?";
        const SQLData = [data, key];
        try {
            await AgentDB.queryRun(SQL, SQLData);
        } catch (err) {
            throw err;
        }
    };
}

const serverStatsManager = new ServerStatsManager();
module.exports = serverStatsManager;
