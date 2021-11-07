const fs = require("fs-extra");
const path = require("path");
const childProcess = require("child_process")
const platform = process.platform;
const axios = require('axios').default;
const {
    file
} = require("tmp-promise");

const FileType = require("file-type");
const extractZip = require("extract-zip");
const tar = require("tar");

const pty = require("node-pty");

const {
    SteamCMDError
} = require("../objects/errors/error_steamcmdrun");

const {
    SteamCMDAlreadyInstalled
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
            exeName: ""
        }

        switch (process.platform) {
            case 'win32':
                this.options.downloadUrl =
                    'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip'
                this.options.exeName = 'steamcmd.exe'
                break
            case 'darwin':
                this.options.downloadUrl =
                    'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz'
                this.options.exeName = 'steamcmd.sh'
                break
            case 'linux':
                this.options.downloadUrl =
                    'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz'
                this.options.exeName = 'steamcmd.sh'
                break
            default:
                throw new Error(`Platform "${process.platform}" is not supported`)
        }

        this.options.exePath = path.join(this.options.binDir, this.options.exeName);
    }

    download = async () => {

        if (fs.existsSync(this.options.exePath)) {
            throw new SteamCMDAlreadyInstalled();
        }

        await fs.ensureDir(this.options.binDir);

        const tempFile = await file()
        try {
            const responseStream = await axios.get(this.options.downloadUrl, {
                responseType: 'stream'
            })

            const tempFileWriteStream = fs.createWriteStream(tempFile.path)

            responseStream.data.pipe(tempFileWriteStream)
            await new Promise(resolve => {
                tempFileWriteStream.on('finish', resolve)
            })

            await this.extractArchive(tempFile.path, this.options.binDir)
        } finally {
            // Cleanup the temp file
            await tempFile.cleanup()
        }

        try {
            // Automatically set the correct file permissions for the executable
            await fs.chmod(this.options.exePath, 0o755)
        } catch (error) {
            // If the executable's permissions couldn't be set then throw an error.
            throw new Error('Steam CMD executable\'s permissions could not be set')
        }

        try {
            // Test if the file is accessible and executable
            await fs.access(this.options.exePath, fs.constants.X_OK)
        } catch (ex) {
            // If the Steam CMD executable couldn't be accessed as an executable
            // then throw an error.
            throw new Error('Steam CMD executable cannot be run')
        }
    }

    async extractArchive(pathToArchive, targetDirectory) {
        const fileTypeDetails = await FileType.fromFile(pathToArchive)

        switch (fileTypeDetails.mime) {
            case 'application/gzip':
                return tar.extract({
                    cwd: targetDirectory,
                    strict: true,
                    file: pathToArchive
                })
            case 'application/zip':
                return extractZip(pathToArchive, {
                    dir: targetDirectory
                })
            default:
                throw new Error('Archive format not recognised')
        }
    }

    run = async (commands = []) => {
        const allCommands = [
            '@ShutdownOnFailedCommand 1',
            '@NoPromptForPassword 1',
            `login "${this.options.username}"`,
            ...commands,
            'quit'
        ];

        const commandFile = await file()

        try {
            await fs.appendFile(commandFile.path,
                allCommands.join('\n') + '\n')

            const steamCmdPty = pty.spawn(this.options.exePath, [
                `+runscript ${commandFile.path}`
            ], {
                cwd: this.options.binDir
            })

            const exitCode = await this.getPtyExitPromise(steamCmdPty);

            if (exitCode !== SteamCMDError.EXIT_CODES.NO_ERROR &&
                exitCode !== SteamCMDError.EXIT_CODES.INITIALIZED) {
                throw new SteamCMDError(exitCode)
            }

        } finally {
            // Always cleanup the temp file
            await commandFile.cleanup()
        }
    }

    getPtyExitPromise(pty) {
        return new Promise(resolve => {
            // noinspection JSUnresolvedFunction
            const {
                dispose: disposeExitListener
            } = pty.onExit(event => {
                resolve(event.exitCode)
                disposeExitListener()
            })
        })
    }

    updateApp = async (appId, installDir) => {
        if (!path.isAbsolute(installDir)) {
            throw new TypeError('installDir must be an absolute path to update an app')
        }

        await fs.ensureDir(installDir);

        const commands = [
            `force_install_dir "${installDir}"`,
            `app_update ${appId}`
        ];
        await this.run(commands);
    }
}

module.exports = ServerSteamCMD;