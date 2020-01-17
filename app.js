global.__basedir = __dirname;


const express = require('express');
const session = require('express-session');
const FSStore = require('connect-fs2')(session);
const exphbs = require('express-handlebars');
const cors = require('cors');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const fs = require('fs');

var logger = require("./server/server_logger");
var Cleanup = require("./server/server_cleanup");
const Config = require("./server/server_config");

const SSM_Server_App = require("./server/server_app");


class AppServer {
    constructor() {
        this.fixFileStoreSessionDelete()
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

        const fileStoreOptions = {
            dir: Config.getSessionStorePath(),
            reapInterval: 10000
        };

        const expsess = session({
            secret: 'SSM',
            store: new FSStore(fileStoreOptions),
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
            credentials: true,
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
        app.use("/api", require("./routes/api/"))

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

    fixFileStoreSessionDelete() {
        FSStore.prototype.reap = function () {
            var now = new Date().getTime();
            var self = this;
            //console.log("deleting old sessions");
            var checkExpiration = function (filePath) {
                fs.readFile(filePath, function (err, data) {
                    if (!err) {
                        data = JSON.parse(data);
                        if (data.expired && data.expired < now) {
                            //console.log("deleted file " + filePath);
                            fs.unlinkSync(filePath);
                        }
                    }
                });
            };
            fs.readdir(self.dir, function (err, files) {
                if (err || files.length <= 0) {
                    return;
                }
                files.forEach(function (file, i) {
                    if (/\.json$/.test(files[i])) {
                        checkExpiration(path.join(self.dir, files[i]));
                    }
                });
            });
        };

        FSStore.prototype.destroy = function (sid) {
            fs.unlinkSync(path.join(this.dir, sid + '.json'));
        };
    }

}

const appServer = new AppServer();
module.exports = appServer;