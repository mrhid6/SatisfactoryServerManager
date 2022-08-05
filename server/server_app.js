const CryptoJS = require("crypto-js");

const logger = require("./server_logger");
const Cleanup = require("./server_cleanup");
const Config = require("./server_config");

const AgentApp = require("./server_agent_app");

const SSM_Log_Handler = require("./server_log_handler");
const SSM_Agent_Handler = require("./server_agent_handler");
const DB = require("./server_db");
const UserManager = require("./server_user_manager");

const NotificationHandler = require("./server_notifcation_handler");

const ObjNotifySSMStartup = require("../objects/notifications/obj_notify_ssmstartup");
const ObjNotifySSMShutdown = require("../objects/notifications/obj_notify_ssmshutdown");

const archiver = require("archiver");
const path = require("path");
const fs = require("fs-extra");

const rimraf = require("rimraf");

class SSM_Server_App {
    constructor() {
        this._init = false;
    }

    init = async () => {
        logger.info("[SERVER_APP] [INIT] - Starting Server App...");
        this.setupEventHandlers();

        SSM_Log_Handler.init();

        if (Config.get("ssm.agent.isagent") === true) {
            await AgentApp.init();
            this._init == true;
        } else {
            await DB.init();
            await UserManager.init();
            await SSM_Agent_Handler.init();
            this._init = true;

            NotificationHandler.init().then(() => {
                const Notification = new ObjNotifySSMStartup();
                Notification.build();

                NotificationHandler.StoreNotification(Notification);
            });
        }
    };

    setupEventHandlers() {
        Cleanup.addEventHandler(() => {
            logger.info("[SERVER_APP] [CLEANUP] - Closing Server App...");

            Cleanup.increaseCounter(1);
            const Notification = new ObjNotifySSMShutdown();
            Notification.build();

            NotificationHandler.StoreNotification(Notification).then(() => {
                Cleanup.decreaseCounter(1);
            });
        });
    }

    checkLoggedInMiddleWare(req, res, next) {
        if (req.session.loggedin == true) {
            req.isLoggedin = true;
            req.session.touch();
            req.session.save();
            next();
        } else {
            req.isLoggedin = false;
            next();
        }
    }

    checkLoggedInAPIMiddleWare(req, res, next) {
        if (req.session.loggedin == true) {
            req.isLoggedin = true;
        } else {
            req.isLoggedin = false;
        }

        if (req.isLoggedin != true) {
            res.json({
                result: "error",
                error: "not logged in to ssm!",
            });
            return;
        } else {
            next();
        }
    }

    checkModsEnabledAPIMiddleWare(req, res, next) {
        if (Config.get("mods.enabled") == false) {
            res.json({
                result: "error",
                error: "Mods not enabled!",
            });
        } else {
            next();
        }
    }

    loginUserAccount(req, res, next) {
        const post = req.body;
        const user = post.inp_user;
        const pass = post.inp_pass;

        const UserAccount = UserManager.getUserByUsername(user);

        var clientip = req.headers["x-real-ip"] || req.connection.remoteAddress;

        if (UserAccount == null || typeof UserAccount === "undifined") {
            req.loginresult = "error";
            req.loginerror = "User Doesn't Exist!";

            logger.warn(
                "[SERVER_APP] [LOGIN] - Failed Login Attempt from " + clientip
            );

            next();
            return;
        }

        if (!UserAccount.HasPermission("login.login")) {
            req.loginresult = "error";
            req.loginerror = "User Doesn't Have Permission to Login!";

            logger.warn(
                "[SERVER_APP] [LOGIN] - Failed Login Attempt from " + clientip
            );

            next();
            return;
        }

        const defaultpasshash = CryptoJS.MD5(
            `SSM:${UserAccount.getUsername()}-ssm`
        ).toString();

        const passString = "SSM:" + UserAccount.getUsername() + "-" + pass;
        const passhash = CryptoJS.MD5(passString).toString();

        if (
            UserAccount.getUsername() != user ||
            UserAccount.getPassword() != passhash
        ) {
            req.loginresult = "error";
            req.loginerror = "Invalid Login Credientials!";

            logger.warn(
                "[SERVER_APP] [LOGIN] - Failed Login Attempt from " + clientip
            );

            next();
            return;
        }

        req.loginresult = "success";
        req.session.loggedin = true;
        req.session.userid = UserAccount.getId();

        if (UserAccount.getPassword() == defaultpasshash) {
            console.log(UserAccount.getPassword(), defaultpasshash);
            req.changepass = true;
            req.session.changepass = true;
        } else {
            req.changepass = false;
        }

        logger.debug(
            "[SERVER_APP] [LOGIN] - Successful Login from " +
                clientip +
                " User:" +
                UserAccount.getUsername()
        );
        next();
        return;
    }

    changeUserDefaultPassword(req, res, next) {
        if (req.session.loggedin != true) {
            req.isLoggedin = false;
            next();
            return;
        }

        const UserAccount = UserManager.getUserById(req.session.userid);

        if (UserAccount == null || typeof UserAccount === "undifined") {
            req.passchangeresult = "error";
            req.passchangeerror = "Server Error";

            logger.warn(
                "[SERVER_APP] [LOGIN] - Failed change default password Attempt from " +
                    clientip
            );
            next();
            return;
        }

        if (!UserAccount.HasPermission("login.resetpass")) {
            req.passchangeresult = "error";
            req.passchangeerror =
                "User Doesn't Have Permission to Change Password!";

            logger.warn(
                "[SERVER_APP] [LOGIN] - Failed Login Attempt from " + clientip
            );

            next();
            return;
        }

        const post = req.body;
        const pass1 = post.inp_pass1;
        const pass2 = post.inp_pass2;

        const pass1String = "SSM:" + UserAccount.getUsername() + "-" + pass1;
        const pass2String = "SSM:" + UserAccount.getUsername() + "-" + pass2;

        const pass1hash = CryptoJS.MD5(pass1String).toString();
        const pass2hash = CryptoJS.MD5(pass2String).toString();

        const defaultpasshash = CryptoJS.MD5(
            `SSM:${UserAccount.getUsername()}-ssm`
        ).toString();

        var clientip = req.headers["x-real-ip"] || req.connection.remoteAddress;

        if (pass1hash != pass2hash) {
            req.passchangeresult = "error";
            req.passchangeerror = "Passwords dont match!";

            logger.warn(
                "[SERVER_APP] [LOGIN] - Failed change default password Attempt from " +
                    clientip
            );

            next();
            return;
        }

        if (pass1 == UserAccount.getUsername()) {
            req.passchangeresult = "error";
            req.passchangeerror =
                "You can't use the same password as your username!";

            logger.warn(
                "[SERVER_APP] [LOGIN] - Failed change default password Attempt from " +
                    clientip
            );

            next();
            return;
        }

        if (pass1hash == UserAccount.getPassword()) {
            req.passchangeresult = "error";
            req.passchangeerror =
                "The password you entered is the same as the current one!";

            logger.warn(
                "[SERVER_APP] [LOGIN] - Failed change default password Attempt from " +
                    clientip
            );

            next();
            return;
        }

        if (pass1hash == defaultpasshash) {
            req.passchangeresult = "error";
            req.passchangeerror = "You can't use the default password!";

            logger.warn(
                "[SERVER_APP] [LOGIN] - Failed change default password Attempt from " +
                    clientip
            );

            next();
            return;
        }

        UserManager.UpdateUserPassword(UserAccount, pass1hash)
            .then(() => {
                // Make the user resigin.
                req.session.loggedin = false;
                req.session.userid = null;
                req.session.changepass = false;
                req.session.touch();
                req.passchangeresult = "success";
                next();
            })
            .catch((err) => {
                req.passchangeresult = "error";
                req.passchangeerror = err;
            });
    }

    logoutUserAccount(req, res, next) {
        if (req.session.loggedin != true) {
            req.isLoggedin = false;
            req.session.destroy();
            next();
            return;
        }

        const UserAccount = UserManager.getUserById(req.session.userid);
        var clientip = req.headers["x-real-ip"] || req.connection.remoteAddress;

        logger.debug(
            "[SERVER_APP] [LOGIN] - Successful Logged Out from " +
                clientip +
                " User:" +
                UserAccount.getUsername()
        );
        req.session.destroy();

        next();
        return;
    }

    API_CreateUser(data) {
        return UserManager.API_CreateUser(data);
    }

    API_GenerateDebugReport = async () => {
        const date = new Date();
        const date_Year = date.getFullYear();
        const date_Month = (date.getMonth() + 1).pad(2);
        const date_Day = date.getDate().pad(2);
        const date_Hour = date.getHours().pad(2);
        const date_Min = date.getMinutes().pad(2);
        const debugFile = `${date_Year}${date_Month}${date_Day}_${date_Hour}${date_Min}_DebugReport.zip`;
        const debugFilePath = path.join(Config.get("ssm.tempdir"), debugFile);

        var outputStream = fs.createWriteStream(debugFilePath);
        var archive = archiver("zip");

        outputStream.on("close", async () => {
            logger.info("[SERVER_APP] - Debug Report Finished!");

            const sql =
                "INSERT INTO debugreports(dr_created,dr_path) VALUES (?,?)";
            const data = [date.getTime(), debugFilePath];
            await DB.queryRun(sql, data);
        });

        archive.on("error", (err) => {
            throw err;
        });

        archive.pipe(outputStream);

        const SSMConfigFile = Config._options.configFilePath;

        archive.file(SSMConfigFile, {
            name: "Configs/SSM/SSM.json",
        });

        archive.file(DB.DBFile, {
            name: "DB/SSM.db",
        });

        archive.directory(logger._options.logDirectory, "Logs/SSM");

        const SSMAgentDirectory = path.resolve("/SSMAgents");
        const Agents = SSM_Agent_Handler.GetAllAgents();

        for (let i = 0; i < Agents.length; i++) {
            const Agent = Agents[i];

            const AgentConfigFile = path.join(
                SSMAgentDirectory,
                Agent.getName(),
                "SSM",
                "configs",
                "SSM.json"
            );

            archive.file(AgentConfigFile, {
                name: `Configs/${Agent.getName()}/SSM.json`,
            });

            const container = await SSM_Agent_Handler.GetDockerForAgent(Agent);

            const dockerInfo = await container.status();
            delete dockerInfo["modem"];
            delete dockerInfo["fs"];
            delete dockerInfo["exec"];

            const DockerStatusFile = path.join(
                Config.get("ssm.tempdir"),
                `${Agent.getName()}.dockerfile.txt`
            );

            fs.writeFileSync(
                DockerStatusFile,
                JSON.stringify(dockerInfo, null, 4)
            );

            archive.file(DockerStatusFile, {
                name: `Configs/${Agent.getName()}/dockerfile.json`,
            });
        }

        archive.finalize();
    };

    API_GetDebugReports = async () => {
        const rows = await DB.query("SELECT * FROM debugreports");
        return rows;
    };

    API_DownloadDebugReportFile = async (data) => {
        const row = await DB.querySingle(
            "SELECT * FROM debugreports WHERE dr_id=?",
            [data.debugreportid]
        );
        return row;
    };

    API_RemoveDebugReportFile = async (data) => {
        const row = await DB.querySingle(
            "SELECT * FROM debugreports WHERE dr_id=?",
            [data.debugreportid]
        );
        const filePath = row.dr_path;

        if (fs.existsSync(filePath)) {
            rimraf.sync(filePath);
        }

        await DB.queryRun("DELETE FROM debugreports WHERE dr_id=?", [
            data.debugreportid,
        ]);
    };

    API_AddWebhook = async (data) => {
        const sqlData = [
            data.name,
            data.url,
            data.enabled == "true" ? 1 : 0,
            JSON.stringify(data.events),
            data.url.startsWith("https://discord.com/api/webhooks") ? 1 : 0,
        ];

        const sql =
            "INSERT INTO webhooks(webhook_name, webhook_url, webhook_enabled, webhook_events, webhook_discord) VALUES (?,?,?,?,?)";
        await DB.queryRun(sql, sqlData);

        await NotificationHandler.LoadWebHooksFromDB();
    };

    API_AddAPIKey = async (data) => {
        const sqlData = [data.apikey, data.userid];

        const sql = "INSERT INTO apikeys(api_key, api_user_id) VALUES (?,?)";
        await DB.queryRun(sql, sqlData);
    };

    API_RevokeAPIKey = async (data) => {
        const sqlData = [data.id];

        const sql = "DELETE FROM apikeys WHERE api_id=?";
        await DB.queryRun(sql, sqlData);
    };
}

const SSM_server_app = new SSM_Server_App();

module.exports = SSM_server_app;
