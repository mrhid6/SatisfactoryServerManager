var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const Config = require("../../server/server_config");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare
]

router.post("/adduser", middleWare, (req, res) => {
    const post = req.body;

    ServerApp.API_CreateUser(post).then(() => {
        res.json({
            result: "success"
        })
    }).catch(err => {
        res.json({
            result: "error",
            error: err.message
        })
    })
})


module.exports = router;