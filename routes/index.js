var express = require('express');
var router = express.Router();

const Config = require(__basedir + "/server/server_config");

/* GET dashboard. */
router.get('/', function (req, res, next) {
    res.render('index.hbs', {
        layout: "main.hbs"
    });
});

/* GET mods. */
router.get('/mods', function (req, res, next) {
    res.render('mods.hbs', {
        layout: "main.hbs"
    });
});

/* GET settings. */
router.get('/settings', function (req, res, next) {
    res.render('settings.hbs', {
        layout: "main.hbs"
    });
});


module.exports = router;