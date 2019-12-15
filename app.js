global.__basedir = __dirname;


var logger = require("./Server/server_logger");
var Cleanup = require("./Server/server_cleanup");

const express = require('express');
const exphbs = require('express-handlebars');
const cors = require('cors');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const app = express();
const http = require('http').Server(app);
const path = require('path');

const SSM_Server_App = require("./Server/server_app");

class AppServer {
    constructor() {
        console.log("Test!");
        this.init();
    }

    init() {
        this.startExpress()
    }

    startExpress() {
        var cookieParser = require('cookie-parser')

        logger.info("Starting Express..");

        // View Engine
        app.set('views', path.join(__dirname + '/views'));
        app.engine('.hbs', exphbs({
            defaultLayout: 'main.hbs',
            layoutsDir: path.join(__dirname + '/views/layouts')
        }));
        app.set('view engine', '.hbs');

        var corsOptions = {
            origin: '*',
            optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204 
        }
        app.use(cors(corsOptions));

        app.use(function (req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });

        // methodOverride
        app.use(methodOverride('_method'));

        logger.info("Setup Express Static Routes..");
        app.use("/libraries", express.static(__dirname + '/node_modules'));
        app.use("/public", express.static(__dirname + '/public'));
        app.use("/docs", express.static(__dirname + '/docs'));
        logger.info("Finished");

        app.use(cookieParser());

        logger.info("Setup Express Routes..");
        app.use("/", require("./routes"))
        app.use("/api", require("./routes/api"))

        logger.info("Finished");

        logger.info("Started Express.");

        const http_port = 3000;

        http.listen(http_port, (req, res) => {
            logger.info("[APP] [INIT] - Server listening on port: (" + http_port + ")..");
            this.startAppServer();
        });
    }

    startAppServer() {
        SSM_Server_App.init();
    }

}

const appServer = new AppServer();
module.exports = appServer;