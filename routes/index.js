var express = require('express');
var router = express.Router();

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


module.exports = router;