var express = require('express');
var router = express.Router();

const ServerApp = require("../../server/server_app");
const SFS_Handler = require("../../server/server_sfs_handler");
const Config = require("../../server/server_config");

const path = require("path");
const multer = require("multer");

const middleWare = [
    ServerApp.checkLoggedInAPIMiddleWare
]


//set Storage Engine
const storage = multer.diskStorage({
    destination: path.resolve(Config.get("satisfactory.save.location")),
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
})

const upload = multer({
    storage: storage,
    limits: {
        fileSize: (200 * 1024 * 1024 * 1024) //give no. of bytes
    },
    // fileFilter: function(req, file, cb){
    //     checkFileType(file, cb);
    // }
}).single('savefile');

router.get('/', middleWare, function (req, res, next) {
    SFS_Handler.getSaves().then(result => {
        res.json({
            result: "success",
            data: result
        });
    }).catch(err => {
        res.json({
            result: "error",
            error: err
        });
    })
});

router.post('/upload', middleWare, function (req, res) {
    upload(req, res, (err) => {
        if (err) {
            res.json({
                result: "error",
                error: err.message
            })
        } else {
            res.json({
                result: "success"
            })
        }
    });
});

module.exports = router;