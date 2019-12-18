global.__basedir = __dirname;


const express = require('express');
const session = require('express-session');
const exphbs = require('express-handlebars');
const cors = require('cors');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const app = express();
const http = require('http').Server(app);
const path = require('path');

var logger = require("./server/server_logger");
var Cleanup = require("./server/server_cleanup");
const Config = require("./server/server_config");

const SSM_Server_App = require("./server/server_app");


class AppServer {
    constructor() {
        this.init();
    }

    init() {
        Config.load();
        logger.info("[APP] [PREINIT] - Starting SSM..");
        this.startExpress()
    }

    startExpress() {
        var cookieParser = require('cookie-parser')

        logger.info("[APP] [EXPRESS] - Starting Express..");

        const expsess = session({
            secret: 'SSM',
            resave: false,
            saveUninitialized: true,
            cookie: {
                maxAge: (15 * 60 * 1000)
            },
            rolling: true
        });

        app.use(expsess);

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

        const rawBodyBuffer = (req, res, buf, encoding) => {
            if (buf && buf.length) {
                req.rawBody = buf.toString(encoding || 'utf8');
            }
        };

        // methodOverride
        app.use(methodOverride('_method'));

        logger.info("[APP] [EXPRESS] - Setup Express Static Routes..");
        app.use("/libraries", express.static(__dirname + '/node_modules'));
        app.use("/public", express.static(__dirname + '/public'));
        app.use("/docs", express.static(__dirname + '/docs'));
        logger.info("[APP] [EXPRESS] - Finished");

        app.use(cookieParser());

        app.use(bodyParser.urlencoded({
            verify: rawBodyBuffer,
            extended: true
        }));
        app.use(bodyParser.json({
            verify: rawBodyBuffer
        }));
        logger.info("[APP] [EXPRESS] - Setup Express Routers..");
        app.use("/", require("./routes"))
        app.use("/api", require("./routes/api"))

        logger.info("[APP] [EXPRESS] - Finished");

        logger.info("[APP] [EXPRESS] - Started Express.");

        const http_port = Config.get("ssm.http_port");

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