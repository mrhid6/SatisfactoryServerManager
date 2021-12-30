var express = require('express');
var router = express.Router();

const ServerApp = require("../server/server_app");
const Config = require("../server/server_config");

const UserManager = require("../server/server_user_manager");

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
        const UserAccount = UserManager.getUserById(req.session.userid);

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
            UserName: UserAccount.getUsername()
        });
    }
});

/* GET ChangeDefaultPassword. */
router.post('/changedefaultpass', middleWare, ServerApp.changeUserDefaultPassword, function (req, res, next) {
    if (req.isLoggedin != true) {
        res.redirect("/login");
        return;
    }
    const UserAccount = UserManager.getUserById(req.session.userid);

    if (UserAccount == null || typeof UserAccount === 'undifined') {
        res.redirect("/login");
        if (req.session != null) {
            req.session.destroy();
        }
        return;
    }

    if (req.session.changepass != true) {
        res.redirect("/login");
        if (req.session != null) {
            req.session.destroy();
        }
        return;
    }

    if (req.passchangeresult == "error") {
        res.render('changedefaultpass.hbs', {
            layout: "login.hbs",
            UserName: UserAccount.getUsername(),
            ERROR_MSG: req.passchangeerror
        });
        return;
    }

    res.redirect("/login");
});

/* GET Logout. */
router.get('/logout', middleWare, ServerApp.logoutUserAccount, function (req, res, next) {
    if (req.session != null) {
        req.session.destroy();
    }

    res.render('logout.hbs', {
        layout: "login.hbs"
    });
});

/* GET dashboard. */
router.get('/', middleWare, function (req, res, next) {
    if (req.isLoggedin == true) {

        const UserID = req.session.userid;
        const perms = GetPagePermissions(UserID);

        if (perms.dashboard == false) {
            res.redirect("/logout");
            return;
        }
        res.render('index.hbs', {
            layout: "main.hbs",
            perms
        });
    } else {
        res.redirect("/login");
    }
});

/* GET servers. */
router.get('/servers', middleWare, function (req, res, next) {
    if (req.isLoggedin == true) {
        const UserID = req.session.userid;
        const perms = GetPagePermissions(UserID);

        if (perms.servers == false) {
            res.redirect("/");
            return;
        }

        res.render('servers.hbs', {
            layout: "main.hbs",
            perms
        });
    } else {
        res.redirect("/login");
    }
});

/* GET agents. */
router.get('/server/:id', middleWare, function (req, res, next) {
    const agentid = req.params.id;
    if (req.isLoggedin == true) {
        const UserID = req.session.userid;
        const perms = GetPagePermissions(UserID);

        if (perms.servers == false) {
            res.redirect("/");
            return;
        }

        res.render('server.hbs', {
            layout: "main.hbs",
            AGENTID: agentid,
            perms
        });
    } else {
        res.redirect("/login");
    }
});

/* GET mods. */
router.get('/mods', middleWare, function (req, res, next) {
    if (req.isLoggedin == true) {
        const UserID = req.session.userid;
        const perms = GetPagePermissions(UserID);

        if (perms.mods == false) {
            res.redirect("/");
            return;
        }

        res.render('mods.hbs', {
            layout: "main.hbs",
            perms
        });
    } else {
        res.redirect("/login");
    }
});

/* GET Logs. */
router.get('/logs', middleWare, function (req, res, next) {
    if (req.isLoggedin == true) {
        const UserID = req.session.userid;
        const perms = GetPagePermissions(UserID);

        if (perms.logs == false) {
            res.redirect("/");
            return;
        }

        res.render('logs.hbs', {
            layout: "main.hbs",
            perms
        });
    } else {
        res.redirect("/login");
    }
});

/* GET settings. */
router.get('/settings', middleWare, function (req, res, next) {
    if (req.isLoggedin == true) {
        const UserID = req.session.userid;
        const perms = GetPagePermissions(UserID);

        if (perms.settings == false) {
            res.redirect("/");
            return;
        }
        res.render('settings.hbs', {
            layout: "main.hbs",
            perms
        });
    } else {
        res.redirect("/login");
    }
});

/* GET settings. */
router.get('/saves', middleWare, function (req, res, next) {
    if (req.isLoggedin == true) {
        const UserID = req.session.userid;

        const perms = GetPagePermissions(UserID);

        if (perms.saves == false) {
            res.redirect("/");
            return;
        }

        res.render('saves.hbs', {
            layout: "main.hbs",
            perms
        });
    } else {
        res.redirect("/login");
    }
});


function GetPagePermissions(UserID) {
    const UserAccount = UserManager.getUserById(UserID);

    const Perms = {
        dashboard: UserAccount.HasPermission("page.dashboard"),
        servers: UserAccount.HasPermission("page.servers"),
        mods: UserAccount.HasPermission("page.mods"),
        logs: UserAccount.HasPermission("page.logs"),
        saves: UserAccount.HasPermission("page.saves"),
        settings: UserAccount.HasPermission("page.settings"),
    }

    return Perms;
}


module.exports = router;