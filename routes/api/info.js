var express = require("express");
var router = express.Router();

const ServerApp = require("../../server/server_app");
const Config = require("../../server/server_config");

const UserManager = require("../../server/server_user_manager");
const NotificationHandler = require("../../server/server_notifcation_handler");

const middleWare = [ServerApp.checkLoggedInAPIMiddleWare];

router.get("/ssmversion", middleWare, function (req, res, next) {
    Config.getSSMVersion()
        .then((data) => {
            res.json({
                result: "success",
                data: data,
            });
        })
        .catch((err) => {
            res.json({
                result: "error",
                error: err.message,
            });
        });
});

router.get("/loggedin", middleWare, function (req, res, next) {
    res.json({
        result: "success",
        data: "",
    });
});

router.get("/users", middleWare, function (req, res, next) {
    UserManager.API_GetAllUsers().then((users) => {
        res.json({
            result: "success",
            data: users,
        });
    });
});

router.get("/roles", middleWare, function (req, res, next) {
    UserManager.API_GetAllRoles().then((roles) => {
        res.json({
            result: "success",
            data: roles,
        });
    });
});

router.get("/apikeys", middleWare, function (req, res, next) {
    UserManager.API_GetAllAPIKeys().then((keys) => {
        res.json({
            result: "success",
            data: keys,
        });
    });
});

router.get("/permissions", middleWare, function (req, res, next) {
    UserManager.API_GetAllPermissions().then((perms) => {
        res.json({
            result: "success",
            data: perms,
        });
    });
});

router.get("/webhooks", middleWare, function (req, res, next) {
    NotificationHandler.API_GetAllWebhooks().then((webhooks) => {
        res.json({
            result: "success",
            data: webhooks,
        });
    });
});

router.get("/serverrunning", middleWare, function (req, res, next) {
    res.json({
        result: "success",
        running: ServerApp._init,
    });
});

module.exports = router;
