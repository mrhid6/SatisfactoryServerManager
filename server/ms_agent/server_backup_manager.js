const path = require("path");
const fs = require("fs-extra");
const archiver = require('archiver');
const platform = process.platform;
const recursive = require("recursive-readdir");
const rimraf = require("rimraf");

const Config = require("../server_config");
const Cleanup = require("../server_cleanup");
const logger = require("../server_logger");

class BackupManager {

    init() {


        this.userDataPath = null;

        switch (platform) {
            case "win32":
                this.userDataPath = "C:\\ProgramData\\SatisfactoryServerManager";
                break;
            case "linux":
            case "darwin":
                this.userDataPath = require('os').homedir() + "/.SatisfactoryServerManager";
                break;
        }

        let PlatformFolder = ""
        if (platform == "win32") {
            PlatformFolder = "WindowsServer";
        } else {
            PlatformFolder = "LinuxServer";
        }

        this.GameConfigDir = path.join(Config.get("satisfactory.server_location"), "FactoryGame", "Saved", "Config", PlatformFolder);


        this.SetupEventHandlers();
        this.startBackupTimer()

        logger.info("[BACKUP_MANAGER] [INIT] - Backup Manager Initialized")
    }

    SetupEventHandlers() {

    }

    startBackupTimer() {
        setInterval(() => {
            const date = new Date();
            if (Config.get("ssm.backup.nextbackup") < date.getTime()) {
                this.ExecBackupTask().then(() => {
                    return this.CleanupBackupFiles();
                })
            }

            this.CleanupBackupFiles()

        }, 5000);
    }

    ExecBackupTask() {
        return new Promise((resolve, reject) => {
            const date = new Date();
            const date_Year = date.getFullYear();
            const date_Month = (date.getMonth() + 1).pad(2);
            const date_Day = date.getDate().pad(2);
            const date_Hour = date.getHours().pad(2);
            const date_Min = date.getMinutes().pad(2);
            const backupFile = `${date_Year}${date_Month}${date_Day}_${date_Hour}${date_Min}_Backup.zip`
            const backupFilePath = path.join(Config.get("ssm.backup.location"), backupFile)

            const interval = parseInt(Config.get("ssm.backup.interval")) * 60 * 60 * 1000;

            const NextBackupTime = new Date(date.getTime() + interval);

            logger.info("[BACKUP_MANAGER] - Starting Backup Task..")
            Cleanup.increaseCounter(1);

            fs.ensureDirSync(Config.get("ssm.backup.location"));


            var outputStream = fs.createWriteStream(backupFilePath);
            var archive = archiver('zip');

            outputStream.on('close', function () {
                logger.info("[BACKUP_MANAGER] - Backup Task Finished!")
                Cleanup.decreaseCounter(1);
                Config.set("ssm.backup.nextbackup", NextBackupTime.getTime())
                resolve();
            });

            archive.on('error', function (err) {
                Cleanup.decreaseCounter(1);
                reject(err)
            });

            archive.pipe(outputStream);

            const SSMConfigFile = path.join(this.userDataPath, "SSM.json")

            // append files from a sub-directory, putting its contents at the root of archive
            archive.directory(Config.get("satisfactory.save.location"), "Saves");
            archive.directory(Config.get("satisfactory.log.location"), "Logs");
            archive.directory(this.GameConfigDir, "Configs/Game");
            archive.file(SSMConfigFile, {
                name: "Configs/SSM/SSM.json"
            });

            archive.finalize();
        })
    }

    CleanupBackupFiles() {
        return new Promise((resolve, reject) => {
            recursive(Config.get("ssm.backup.location"), [BackupFileFilter], (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                const sortedFiles = files.sort().reverse();
                const filesToRemove = [];

                for (let i = 0; i < sortedFiles.length; i++) {
                    const file = sortedFiles[i];
                    if (i >= Config.get("ssm.backup.keep")) {
                        filesToRemove.push(file);
                    }
                }
                const removePromises = [];
                for (let i = 0; i < filesToRemove.length; i++) {
                    const file = filesToRemove[i];
                    removePromises.push(this.RemoveBackupFile(file))
                }
                Promise.all(removePromises).then(() => {
                    resolve();
                })
            });

        });
    }

    RemoveBackupFile(file) {
        return new Promise((resolve, reject) => {
            rimraf(file, ["unlink"], err => {
                if (err) {
                    logger.error("[BACKUP_MANAGER] - Remove Backup Error")
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }


    API_ListBackups() {
        return new Promise((resolve, reject) => {
            recursive(Config.get("ssm.backup.location"), [BackupFileFilter], (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                const sortedFiles = files.sort().reverse();
                const resarray = [];
                sortedFiles.forEach(file => {
                    const fileInfo = fs.statSync(file);
                    const pathInfo = path.parse(file);
                    resarray.push({
                        filename: pathInfo.base,
                        size: fileInfo.size,
                        created: fileInfo.birthtime
                    })
                })
                resolve(resarray)
            })
        });
    }
}

function BackupFileFilter(file, stats) {
    return (path.extname(file) != ".zip" && stats.isDirectory() == false);
}

const backupManager = new BackupManager();
module.exports = backupManager;