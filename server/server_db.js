const Database = require('better-sqlite3');
const path = require("path");
const fs = require("fs-extra");
const platform = process.platform;
const logger = require("./server_logger");


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
            "permissions"
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
                        }
                    }
                })

                Promise.all(promises).then(() => {
                    resolve();
                }).catch(reject);
            })

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
                            "settings.saves.*"
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
                    "settings.saves.upload",
                    "settings.saves.download",
                    "settings.saves.delete",
                    "page.dashboard",
                    "page.servers",
                    "page.mods",
                    "page.logs",
                    "page.saves",
                    "page.settings",
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
}

const serverDb = new ServerDB();

module.exports = serverDb;