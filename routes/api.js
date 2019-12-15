var express = require('express');
var router = express.Router();

router.post('/serveraction/:action', function (req, res, next) {
    const params = req.params
    console.log(JSON.stringify(params, null, 2));
    res.json({
        result: "success"
    });
});

module.exports = router;