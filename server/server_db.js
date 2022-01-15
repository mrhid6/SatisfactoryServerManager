const Database = require('better-sqlite3');
const path = require("path");
const fs = require("fs-extra");
const platform = process.platform;
const logger = require("./server_logger");

const Config = require("./server_config");

const semver = require("semver");

class ServerDB {
    constructor() {
        let userDataPath = null;

        switch (platform) {
            case "win32":
                userDataPath = "C:\\ProgramData\\SatisfactoryServerManager";
                break;
            case "linux":
            case "darwin":
                userDataPath = require('os').homedir() + "/.SatisfactoryServerManager";
                break;
        }

        this.DBDir = path.join(userDataPath, "DB");
        fs.ensureDirSync(this.DBDir);

        this.DBFile = path.join(this.DBDir, "SSM.db");

        this._ExpectedTables = [
            "users",
            "roles",
            "permissions",
            "agents",
            "config"
        ]

    }

    init() {
        return new Promise((resolve, reject) => {
            this.connect().then(() => {
                resolve();
            }).catch(reject);
        })
    }

    connect() {
        return new Promise((resolve, reject) => {

            try {
                this.DB = new Database(this.DBFile, {
                    //verbose: console.log,
                    fileMustExist: false
                });

                logger.info('Connected to the database.');
                this.createTables().then(() => {
                    return this.applyDBPatches();
                }).then(() => {
                    resolve();
                }).catch(reject);

            } catch (err) {
                reject(err);
                return;
            }

        })
    }

    getTables() {
        return new Promise((resolve, reject) => {

            const sql = `SELECT name FROM sqlite_master WHERE type='table'`;
            this.query(sql).then(rows => {
                const tableNames = [];

                rows.forEach(row => {
                    tableNames.push(row.name)
                })

                resolve(tableNames);
            }).catch(reject);
        })
    }

    getTableCount() {

        return new Promise((resolve, reject) => {
            this.getTables().then(rows => {
                resolve(rows.length)
            }).catch(reject);
        })
    }

    createTables() {
        return new Promise((resolve, reject) => {
            const promises = [];

            this.getTables().then(tables => {

                this._ExpectedTables.forEach(expectedTable => {
                    if (tables.includes(expectedTable) == false) {
                        switch (expectedTable) {
                            case "users":
                                promises.push(this.createUsersTable())
                                break;
                            case "roles":
                                promises.push(this.createRolesTable())
                                break;
                            case "permissions":
                                promises.push(this.createPermissionsTable())
                                break;
                            case "agents":
                                promises.push(this.createAgentsTable())
                                break;
                            case "config":
                                promises.push(this.createConfigTable())
                                break;
                        }
                    }
                })

                Promise.all(promises).then(() => {
                    resolve();
                }).catch(reject);
            })

        });
    }

    createConfigTable() {
        return new Promise((resolve, reject) => {

            logger.info("Creating Config Table")
            const configTableSql = `CREATE TABLE "config" (
                "config_key" VARCHAR(255) NOT NULL DEFAULT '' UNIQUE,
                "config_value" TEXT NOT NULL DEFAULT ''
            );`

            let InsertSQL = `INSERT INTO config(config_key, config_value) VALUES `

            const defaultValues = [
                ["version", Config.get("ssm.version")]
            ]

            const sqlData = [];

            defaultValues.forEach(configVal => {
                InsertSQL += `(?, ?), `
                sqlData.push(configVal[0]);
                sqlData.push(configVal[1]);
            })

            InsertSQL = InsertSQL.substring(0, InsertSQL.length - 2);
            InsertSQL += ";";



            this.queryRun(configTableSql).then(() => {
                return this.queryRun(InsertSQL, sqlData)
            }).then(() => {
                resolve();
            }).catch(err => {
                console.log(err);
            });
        });
    }

    createUsersTable() {
        return new Promise((resolve, reject) => {

            logger.info("Creating Users Table")
            const userTableSql = `CREATE TABLE "users" (
                "user_id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "user_name" VARCHAR(255) NOT NULL DEFAULT '',
                "user_pass" VARCHAR(255) NOT NULL DEFAULT '',
                "user_role_id" INTEGER DEFAULT 1
            );`

            const AdminUser = `INSERT INTO users(user_name, user_pass, user_role_id) VALUES (?,?,?);`

            this.queryRun(userTableSql).then(() => {
                return this.queryRun(AdminUser, ["admin", "209a221fa0090f144de33f88ab3fd88d", 3])
            }).then(() => {
                resolve();
            }).catch(err => {
                console.log(err);
            });
        });
    }

    createRolesTable() {
        return new Promise((resolve, reject) => {
            logger.info("Creating Roles Table")
            const rolesTableSql = `CREATE TABLE "roles" (
                "role_id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "role_name" VARCHAR(255) NOT NULL DEFAULT '',
                "role_permissions" TEXT NOT NULL DEFAULT ''
            );`

            this.queryRun(rolesTableSql).then(() => {
                let RoleSQL = `INSERT INTO roles(role_name, role_permissions) VALUES `
                const sqlData = [];

                const defaultRoles = [{
                        name: "User",
                        permissions: ["login.*", "page.dashboard"]
                    },
                    {
                        name: "Moderator",
                        permissions: [
                            "login.*",
                            "serveractions.start",
                            "serveractions.stop",
                            "serveractions.kill",
                            "page.dashboard",
                            "page.servers",
                            "page.mods",
                            "page.logs",
                            "page.saves",
                            "mods.*",
                            "manageusers.create",
                            "settings.saves.*",
                            "settings.backups.*",
                        ]
                    },
                    {
                        name: "Administrator",
                        permissions: ["*"]
                    }
                ]

                defaultRoles.forEach(role => {
                    RoleSQL += `(?, ?), `
                    sqlData.push(role.name);
                    sqlData.push(JSON.stringify(role.permissions));
                })

                RoleSQL = RoleSQL.substring(0, RoleSQL.length - 2);
                RoleSQL += ";";

                return this.queryRun(RoleSQL, sqlData)
            }).then(() => {
                resolve();
            }).catch(err => {
                console.log(err);
            });
        });
    }

    createPermissionsTable() {
        return new Promise((resolve, reject) => {
            logger.info("Creating Permissions Table")
            const permsTableSql = `CREATE TABLE "permissions" (
                "perm_name" VARCHAR(255) NOT NULL DEFAULT '' UNIQUE
            );`

            this.queryRun(permsTableSql).then(() => {
                const defaultPerms = [
                    "login.login",
                    "login.resetpass",
                    "login.forgotpass",
                    "serveractions.start",
                    "serveractions.stop",
                    "serveractions.kill",
                    "serveractions.install",
                    "mods.install",
                    "mods.uninstall",
                    "mods.update",
                    "agentactions.create",
                    "agentactions.start",
                    "agentactions.stop",
                    "agentactions.delete",
                    "manageusers.create",
                    "manageusers.delete",
                    "manageusers.resetpass",
                    "settings.agent.sf",
                    "settings.agent.mod",
                    "settings.agent.backup",
                    "settings.backup.view",
                    "settings.backup.download",
                    "settings.backup.delete",
                    "settings.saves.upload",
                    "settings.saves.download",
                    "settings.saves.delete",
                    "page.dashboard",
                    "page.servers",
                    "page.mods",
                    "page.logs",
                    "page.saves",
                    "page.admin",
                    "page.admin.settings",
                    "page.admin.users",
                    "page.admin.backups",
                ];
                let PermSQL = `INSERT INTO permissions(perm_name) VALUES `
                PermSQL += defaultPerms.map(perm => "(?)").join(",");

                return this.queryRun(PermSQL, defaultPerms)
            }).then(() => {
                resolve();
            }).catch(err => {
                console.log(err);
                reject(err)
            });
        });
    }

    createAgentsTable() {
        return new Promise((resolve, reject) => {
            logger.info("Creating Agents Table")
            const agentsTableSql = `CREATE TABLE "agents" (
                "agent_id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "agent_name" VARCHAR(255) NOT NULL DEFAULT '',
                "agent_displayname" VARCHAR(255) NOT NULL DEFAULT '',
                "agent_docker_id" TEXT NOT NULL DEFAULT '',
                "agent_ssm_port" INTEGER NOT NULL DEFAULT 0,
                "agent_serverport" INTEGER NOT NULL DEFAULT 0,
                "agent_beaconport" INTEGER NOT NULL DEFAULT 0,
                "agent_port" INTEGER NOT NULL DEFAULT 0
            );`

            this.queryRun(agentsTableSql).then(() => {
                const {
                    Docker
                } = require('node-docker-api');

                let dockerSettings = {
                    host: "http://127.0.0.1",
                    port: 2375
                }

                if (process.platform != "win32") {
                    dockerSettings = {
                        socketPath: "/var/run/docker.sock"
                    }
                }

                const docker = new Docker(dockerSettings);

                docker.container.list({
                    all: 1
                }).then(containers => {

                    const SQLData = [];

                    let AgentSQL = `INSERT INTO agents(agent_name, agent_displayname, agent_docker_id, agent_ssm_port, agent_serverport, agent_beaconport, agent_port) VALUES `

                    for (let i = 0; i < containers.length; i++) {

                        const container = containers[i];
                        let name = container.data.Names[0];
                        const ports = container.data.Ports;

                        if (name.startsWith("/SSMAgent")) {
                            name = name.replace("/", "");
                            AgentSQL += "(?,?,?,?,?,?,?), "



                            const NameArr = name.split("_");
                            let DisplayName = name;
                            if (NameArr.length > 1) {
                                DisplayName = NameArr[1];
                            }

                            const Ports = containers[0].data.Ports;
                            let BeaconPort = 15000,
                                ServerPort = 15777,
                                SSMPort = 3001,
                                Port = 7777;

                            const parsedID = parseInt(name.replace("SSMAgent"));

                            if (isNaN(parsedID)) {

                                if (Ports.length > 0) {
                                    BeaconPort = Ports[0].PublicPort;
                                    ServerPort = Ports[1].PublicPort;
                                    SSMPort = Ports[2].PublicPort;
                                    Port = Ports[3].PublicPort;
                                }

                            } else {
                                const relativeID = parsedID - 1;
                                SSMPort = 3001 + relativeID;
                                ServerPort = 15777 + relativeID;
                                BeaconPort = 15000 + relativeID;
                                Port = 7777 + relativeID;
                            }

                            SQLData.push(name, DisplayName, container.data.Id, SSMPort, ServerPort, BeaconPort, Port);
                        }
                    }

                    if (SQLData.length == 0) {
                        return;
                    }

                    AgentSQL = AgentSQL.substring(0, AgentSQL.length - 2);
                    AgentSQL += ";";

                    return this.queryRun(AgentSQL, SQLData)
                }).then(() => {
                    resolve();
                }).catch(err => {
                    console.log(err);
                    reject(err)
                });
            });

        })
    }

    applyDBPatches = async () => {
        const needPatch = await this.DoesDBNeedPatching();

        if (needPatch == true) {
            const manifestPath = path.join(__basedir, "db_updates", "manifest.json");
            const manifest = require(manifestPath)

            const patches = manifest.patches;
            let startAddingVersions = false;
            const versionPatches = [];

            for (let i = 0; i < patches.length; i++) {
                const patch = patches[i];
                if (semver.compare(this._DBVERSION, patch) == 0) {
                    startAddingVersions = true;
                    continue;
                }

                if (startAddingVersions) {
                    versionPatches.push(patch)
                }
            }

            for (let i = 0; i < versionPatches.length; i++) {
                const patchVersion = versionPatches[i];
                await this.applyPatch(patchVersion);
            }
        }
    }

    applyPatch = async version => {

        const versionFolder = path.join(__basedir, "db_updates", version);

        if (fs.existsSync(versionFolder)) {

            logger.info(`[DB] - Applying DB patch (${version})..`)
            const sqlFile = path.join(versionFolder, `${version}.sql`)
            let SQL = fs.readFileSync(sqlFile).toString();

            const dataFile = path.join(versionFolder, "data.json")
            const data = JSON.parse(fs.readFileSync(dataFile).toString());

            SQL = this.buildSqlData(SQL, data);

            await this.queryExec(SQL);
        }
    }

    DoesDBNeedPatching = async () => {
        return this.getDBVersion().then(DBVersion => {
            if (Config.get("ssm.version") != DBVersion) {
                return true;
            }

            return false;
        }).catch(err => {
            return false;
        })
    }

    getDBVersion() {
        return new Promise((resolve, reject) => {
            this.querySingle("SELECT config_value FROM config WHERE config_key='version'").then(row => {
                this._DBVERSION = row.config_value;
                resolve(this._DBVERSION)
            }).catch(reject)
        });
    }


    query(sql, data = []) {
        return new Promise((resolve, reject) => {
            const stmt = this.DB.prepare(sql)
            try {
                const rows = stmt.all(data);
                resolve(rows);
            } catch (err) {
                reject(err);
            }
        })
    }

    querySingle(sql, data = []) {
        return new Promise((resolve, reject) => {
            const stmt = this.DB.prepare(sql)
            try {
                const row = stmt.get(data);
                resolve(row);
            } catch (err) {
                reject(err);
            }
        })
    }

    queryRun(sql, data = []) {
        return new Promise((resolve, reject) => {
            const stmt = this.DB.prepare(sql)
            try {
                stmt.run(data);
                resolve();
            } catch (err) {
                reject(err);
            }
        })
    }

    queryExec(sql) {
        return new Promise((resolve, reject) => {

            try {
                this.DB.exec(sql);
                resolve();
            } catch (err) {
                reject(err);
            }
        })
    }

    buildSqlData(SQL, data = []) {
        let NewSQL = SQL;
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            NewSQL = NewSQL.replace("?", d)
        }

        return NewSQL;
    }
}

const serverDb = new ServerDB();

module.exports = serverDb;