const fs = require("fs-extra");
const path = require("path");
const childProcess = require("child_process");
const platform = process.platform;
const axios = require("axios").default;
const stripAnsi = require("@electerm/strip-ansi").default;

const { file } = require("tmp-promise");

const mime = require("mime-types");
const extractZip = require("extract-zip");
const tar = require("tar");

const pty = require("node-pty");
const vdf = require("vdf");

const {
    SteamCMDError,
    EXIT_CODES,
} = require("../objects/errors/error_steamcmdrun");

const {
    SteamCMDAlreadyInstalled,
} = require("../objects/errors/error_steamcmd");

const logger = require("./server_logger");
const Cleanup = require("./server_cleanup");
const Config = require("./server_config");

class ServerSteamCMD {
    constructor() {}

    init(binDir) {
        this.options = {
            binDir: path.resolve(binDir),
            username: "anonymous",
            downloadUrl: "",
            exeName: "",
            ArchiveType: "",
        };

        switch (process.platform) {
            case "win32":
                this.options.downloadUrl =
                    "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip";
                this.options.ArchiveType = "application/zip";
                this.options.exeName = "steamcmd.exe";
                break;
            case "darwin":
                this.options.downloadUrl =
                    "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz";
                this.options.ArchiveType = "application/gzip";
                this.options.exeName = "steamcmd.sh";
                break;
            case "linux":
                this.options.downloadUrl =
                    "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz";
                this.options.ArchiveType = "application/gzip";
                this.options.exeName = "steamcmd.sh";
                break;
            default:
                throw new Error(
                    `Platform "${process.platform}" is not supported`
                );
        }

        this.options.exePath = path.join(
            this.options.binDir,
            this.options.exeName
        );
    }

    download = async () => {
        if (fs.existsSync(this.options.exePath)) {
            logger.warn("[STEAM CMD] [DOWNLOAD] - Already Installed!");
            throw new SteamCMDAlreadyInstalled();
        }

        await fs.ensureDir(this.options.binDir);

        const tempFile = await file();

        logger.debug("[STEAM CMD] [DOWNLOAD] - TempFile: " + tempFile.path);

        try {
            const responseStream = await axios.get(this.options.downloadUrl, {
                responseType: "stream",
            });

            const tempFileWriteStream = fs.createWriteStream(tempFile.path);

            responseStream.data.pipe(tempFileWriteStream);
            await new Promise((resolve) => {
                tempFileWriteStream.on("finish", resolve);
            });

            logger.debug(
                "[STEAM CMD] [DOWNLOAD] - Downloaded SteamCMD Archive"
            );

            await this.extractArchive(tempFile.path, this.options.binDir);
            logger.debug("[STEAM CMD] [EXTRACT] - Extracted Steam CMD Archive");
        } finally {
            // Cleanup the temp file
            //await tempFile.cleanup()
        }

        try {
            // Automatically set the correct file permissions for the executable
            await fs.chmod(this.options.exePath, 0o755);
        } catch (error) {
            // If the executable's permissions couldn't be set then throw an error.
            throw new Error(
                "Steam CMD executable's permissions could not be set"
            );
        }

        try {
            // Test if the file is accessible and executable
            await fs.access(this.options.exePath, fs.constants.X_OK);
        } catch (ex) {
            // If the Steam CMD executable couldn't be accessed as an executable
            // then throw an error.
            throw new Error("Steam CMD executable cannot be run");
        }
    };

    async extractArchive(pathToArchive, targetDirectory) {
        switch (this.options.ArchiveType) {
            case "application/gzip":
                return tar.extract({
                    cwd: targetDirectory,
                    strict: true,
                    file: pathToArchive,
                });
            case "application/zip":
                return extractZip(pathToArchive, {
                    dir: targetDirectory,
                });
            default:
                logger.error(
                    "[STEAM CMD] [EXTRACT] - Invalid Archive Type: " +
                        this.options.ArchiveType
                );
                throw new Error("Archive format not recognised");
        }
    }

    run = async (commands = []) => {
        const allCommands = [
            "@ShutdownOnFailedCommand 1",
            "@NoPromptForPassword 1",
            `login "${this.options.username}"`,
            ...commands,
            "quit",
        ];

        const commandFile = await file();

        try {
            await fs.appendFile(
                commandFile.path,
                allCommands.join("\n") + "\n"
            );

            const steamCmdPty = pty.spawn(
                this.options.exePath,
                [`+runscript ${commandFile.path}`],
                {
                    cwd: this.options.binDir,
                }
            );

            const exitPromise = this.getPtyExitPromise(steamCmdPty);

            const outputPromise = this.getPtyDataIterator(steamCmdPty);

            const exitCode = await exitPromise;

            if (
                exitCode !== EXIT_CODES.NO_ERROR &&
                exitCode !== EXIT_CODES.INITIALIZED
            ) {
                throw new SteamCMDError(exitCode);
            }

            const output = await outputPromise;

            return output;
        } catch (err) {
            throw err;
        } finally {
            // Always cleanup the temp file
            await commandFile.cleanup();
        }
    };

    getPtyExitPromise(pty) {
        return new Promise((resolve) => {
            // noinspection JSUnresolvedFunction
            const { dispose: disposeExitListener } = pty.onExit((event) => {
                resolve(event.exitCode);
                disposeExitListener();
            });
        });
    }

    getPtyDataIterator = async (pty) => {
        const datalines = [];

        const { dispose: disposeDataListener } = pty.onData((outputLine) => {
            const normalisedLine = outputLine
                .replace(/\r\n/g, "\n")
                .replace(/\r/, "")
                .trim();
            const line = `${stripAnsi(normalisedLine)}`;
            console.log(line);

            datalines.push(line);
        });

        const output = await new Promise((resolve) => {
            const { dispose: disposeExitListener } = pty.onExit(() => {
                disposeExitListener();
                disposeDataListener();

                resolve(datalines.join(""));
            });
        });

        return output;
    };

    updateApp = async (appId, installDir) => {
        if (!path.isAbsolute(installDir)) {
            throw new TypeError(
                "installDir must be an absolute path to update an app"
            );
        }

        await fs.ensureDir(installDir);

        const commands = [
            `force_install_dir "${installDir}"`,
            `app_update ${appId}`,
        ];
        const output = await this.run(commands);
        console.log(output);
        return;
    };

    getAppInfo = async (appId) => {
        var commands = [
            "app_info_update 1", // force data update
            "app_info_print " + appId,
            "find e", // fill the buffer so info's not truncated on Windows
        ];

        try {
            const output = await this.run(commands);

            var infoTextStart = output.indexOf('"' + appId + '"');
            var infoTextEnd = output.indexOf("ConVars:");
            var infoText = output
                .substr(infoTextStart, infoTextEnd - infoTextStart)
                .replace("find e", "");

            return vdf.parse(infoText)[appId];
        } catch (err) {
            throw err;
        }
    };

    isInstalled() {
        return fs.existsSync(this.options.exePath);
    }
}

module.exports = ServerSteamCMD;
