const CryptoJS = require("crypto-js");

const logger = require("./server_logger");
const Cleanup = require("./server_cleanup");
const Config = require("./server_config");

const AgentApp = require("./server_agent_app");

const SSM_Log_Handler = require("./server_log_handler");
const SSM_Agent_Handler = require("./server_agent_handler");
const DB = require("./server_db");
const UserManager = require("./server_user_manager");

class SSM_Server_App {

    constructor() {

    }

    init() {
        logger.info("[SERVER_APP] [INIT] - Starting Server App...");
        this.setupEventHandlers();

        SSM_Log_Handler.init();

        if (Config.get("ssm.agent.isagent") === true) {
            AgentApp.init();
        } else {
            DB.init().then(() => {
                UserManager.init();
                SSM_Agent_Handler.init();
            })
        }

    }

    setupEventHandlers() {
        Cleanup.addEventHandler(() => {
            logger.info("[SERVER_APP] [CLEANUP] - Closing Server App...");
        })
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
                error: "not logged in to ssm!"
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
                error: "Mods not enabled!"
            });

        } else {
            next();
        }
    }

    loginUserAccount(req, res, next) {
        const post = req.body;
        const user = post.inp_user;
        const pass = post.inp_pass;

        const UserAccount = UserManager.getUserByUername(user);

        var clientip = req.headers['x-real-ip'] || req.connection.remoteAddress;

        if (UserAccount == null || typeof UserAccount === 'undifined') {
            req.loginresult = "error";
            req.loginerror = "User Doesn't Exist!";

            logger.warn("[SERVER_APP] [LOGIN] - Failed Login Attempt from " + clientip)

            next();
            return;
        }

        if (!UserAccount.HasPermission("login.login")) {
            req.loginresult = "error";
            req.loginerror = "User Doesn't Have Permission to Login!";

            logger.warn("[SERVER_APP] [LOGIN] - Failed Login Attempt from " + clientip)

            next();
            return;
        }

        const defaultpasshash = CryptoJS.MD5(`SSM:${UserAccount.getUsername()}-ssm`).toString();

        const passString = "SSM:" + UserAccount.getUsername() + "-" + pass;
        const passhash = CryptoJS.MD5(passString).toString();

        if (UserAccount.getUsername() != user || UserAccount.getPassword() != passhash) {
            req.loginresult = "error";
            req.loginerror = "Invalid Login Credientials!";

            logger.warn("[SERVER_APP] [LOGIN] - Failed Login Attempt from " + clientip)

            next();
            return;
        }

        req.loginresult = "success";
        req.session.loggedin = true;
        req.session.userid = UserAccount.getId();



        if (UserAccount.getPassword() == defaultpasshash) {
            console.log(UserAccount.getPassword(), defaultpasshash)
            req.changepass = true;
            req.session.changepass = true;
        } else {
            req.changepass = false;
        }

        logger.debug("[SERVER_APP] [LOGIN] - Successful Login from " + clientip + " User:" + UserAccount.getUsername())
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

        if (UserAccount == null || typeof UserAccount === 'undifined') {
            req.passchangeresult = "error";
            req.passchangeerror = "Server Error";

            logger.warn("[SERVER_APP] [LOGIN] - Failed change default password Attempt from " + clientip)
            next();
            return;
        }

        if (!UserAccount.HasPermission("login.resetpass")) {
            req.passchangeresult = "error";
            req.passchangeerror = "User Doesn't Have Permission to Change Password!";

            logger.warn("[SERVER_APP] [LOGIN] - Failed Login Attempt from " + clientip)

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

        const defaultpasshash = CryptoJS.MD5(`SSM:${UserAccount.getUsername()}-ssm`).toString();

        var clientip = req.headers['x-real-ip'] || req.connection.remoteAddress;

        if (pass1hash != pass2hash) {
            req.passchangeresult = "error";
            req.passchangeerror = "Passwords dont match!";

            logger.warn("[SERVER_APP] [LOGIN] - Failed change default password Attempt from " + clientip)

            next();
            return;
        }

        if (pass1 == UserAccount.getUsername()) {
            req.passchangeresult = "error";
            req.passchangeerror = "You can't use the same password as your username!";

            logger.warn("[SERVER_APP] [LOGIN] - Failed change default password Attempt from " + clientip)

            next();
            return;
        }

        if (pass1hash == UserAccount.getPassword()) {
            req.passchangeresult = "error";
            req.passchangeerror = "The password you entered is the same as the current one!";

            logger.warn("[SERVER_APP] [LOGIN] - Failed change default password Attempt from " + clientip)

            next();
            return;
        }

        if (pass1hash == defaultpasshash) {
            req.passchangeresult = "error";
            req.passchangeerror = "You can't use the default password!";

            logger.warn("[SERVER_APP] [LOGIN] - Failed change default password Attempt from " + clientip)

            next();
            return;
        }


        UserManager.UpdateUserPassword(UserAccount, pass1hash).then(() => {
            // Make the user resigin.
            req.session.loggedin = false;
            req.session.userid = null;
            req.session.changepass = false;
            req.session.touch();
            req.passchangeresult = "success";
            next();
        }).catch(err => {
            req.passchangeresult = "error";
            req.passchangeerror = err;
        })


    }

    logoutUserAccount(req, res, next) {

        if (req.session.loggedin != true) {
            req.isLoggedin = false;
            req.session.destroy();
            next();
            return;
        }

        const UserAccount = UserManager.getUserById(req.session.userid);
        var clientip = req.headers['x-real-ip'] || req.connection.remoteAddress;

        logger.debug("[SERVER_APP] [LOGIN] - Successful Logged Out from " + clientip + " User:" + UserAccount.getUsername())
        req.session.destroy();

        next();
        return;


    }
}

const SSM_server_app = new SSM_Server_App();

module.exports = SSM_server_app;