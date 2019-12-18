var express = require('express');
var router = express.Router();

const ServerApp = require("../server/server_app");
const Config = require("../server/server_config");

const middleWare = [
    ServerApp.checkLoggedInMiddleWare
]

/* GET Login. */
router.get('/login', middleWare, function (req, res, next) {
    if (req.isLoggedin == true) {
        res.redirect("/");
    } else {
        res.render('login.hbs', {
            layout: "login.hbs"
        });
    }
});

/* GET Login. */
router.post('/login', ServerApp.loginUserAccount, function (req, res, next) {
    if (req.loginresult == 'success') {
        if (req.changepass == true) {
            res.redirect("/changedefaultpass");
        } else {
            res.redirect("/");
        }

    } else {
        res.render('login.hbs', {
            layout: "login.hbs",
            ERROR_MSG: req.loginerror
        });
    }
});

/* GET ChangeDefaultPassword. */
router.get('/changedefaultpass', middleWare, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.redirect("/login");
    } else {
        const UserAccount = Config.get("ssm.users." + req.session.userid);

        if (UserAccount == null || typeof UserAccount === 'undifined') {
            res.redirect("/login");
            return;
        }

        if (req.session.changepass != true) {
            res.redirect("/login");
            return;
        }

        res.render('changedefaultpass.hbs', {
            layout: "login.hbs",
            UserName: UserAccount.username
        });
    }
});

/* GET ChangeDefaultPassword. */
router.post('/changedefaultpass', middleWare, ServerApp.changeUserDefaultPassword, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.redirect("/login");
        return;
    }
    const UserAccount = Config.get("ssm.users." + req.session.userid);

    if (UserAccount == null || typeof UserAccount === 'undifined') {
        res.redirect("/login");
        return;
    }

    if (req.session.changepass != true) {
        res.redirect("/login");
        return;
    }

    if (req.passchangeresult == "error") {
        res.render('changedefaultpass.hbs', {
            layout: "login.hbs",
            UserName: UserAccount.username,
            ERROR_MSG: req.passchangeerror
        });
        return;
    }

    res.redirect("/login");
});

/* GET Logout. */
router.get('/logout', middleWare, function (req, res, next) {
    req.session.destroy();
    res.render('logout.hbs', {
        layout: "login.hbs"
    });
});

/* GET dashboard. */
router.get('/', middleWare, function (req, res, next) {
    if (req.isLoggedin == true) {
        res.render('index.hbs', {
            layout: "main.hbs"
        });
    } else {
        res.redirect("/login");
    }
});

/* GET mods. */
router.get('/mods', middleWare, function (req, res, next) {
    if (req.isLoggedin == true) {
        res.render('mods.hbs', {
            layout: "main.hbs"
        });
    } else {
        res.redirect("/login");
    }
});

/* GET Logs. */
router.get('/logs', middleWare, function (req, res, next) {
    if (req.isLoggedin == true) {
        res.render('logs.hbs', {
            layout: "main.hbs"
        });
    } else {
        res.redirect("/login");
    }
});

/* GET settings. */
router.get('/settings', middleWare, function (req, res, next) {
    if (req.isLoggedin == true) {
        res.render('settings.hbs', {
            layout: "main.hbs"
        });
    } else {
        res.redirect("/login");
    }
});


module.exports = router;