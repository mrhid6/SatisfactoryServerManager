const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs-extra");
const platform = process.platform;
const logger = require("../server_logger");

const Config = require("../server_config");

const semver = require("semver");

class AgentDB {
    constructor() {
        let userDataPath = null;

        switch (platform) {
            case "win32":
                userDataPath = "C:\\ProgramData\\SatisfactoryServerManager";
                break;
            case "linux":
            case "darwin":
                userDataPath =
                    require("os").homedir() + "/.SatisfactoryServerManager";
                break;
        }

        this.DBDir = path.join(userDataPath, "DB");
        fs.ensureDirSync(this.DBDir);

        this.DBFile = path.join(this.DBDir, "Agent.db");

        this._ExpectedTables = ["config", "stats"];
    }

    init = async () => {
        try {
            await this.connect();
        } catch (err) {
            throw err;
        }
    };

    connect = async () => {
        try {
            this.DB = new Database(this.DBFile, {
                //verbose: console.log,
                fileMustExist: false,
            });

            logger.info("Connected to the database.");
            await this.createTables();
        } catch (err) {
            throw err;
        }
    };

    getTables() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT name FROM sqlite_master WHERE type='table'`;
            this.query(sql)
                .then((rows) => {
                    const tableNames = [];

                    rows.forEach((row) => {
                        tableNames.push(row.name);
                    });

                    resolve(tableNames);
                })
                .catch(reject);
        });
    }

    getTableCount() {
        return new Promise((resolve, reject) => {
            this.getTables()
                .then((rows) => {
                    resolve(rows.length);
                })
                .catch(reject);
        });
    }

    createTables = async () => {
        try {
            const tables = await this.getTables();

            for (let i = 0; i < this._ExpectedTables.length; i++) {
                const expectedTable = this._ExpectedTables[i];
                if (tables.includes(expectedTable) == false) {
                    switch (expectedTable) {
                        case "config":
                            await this.createConfigTable();
                            break;
                        case "stats":
                            await this.createStatsTable();
                            break;
                    }
                }
            }
        } catch (err) {
            throw err;
        }
    };

    createConfigTable() {
        return new Promise((resolve, reject) => {
            logger.info("Creating Config Table");
            const configTableSql = `CREATE TABLE "config" (
                "config_key" VARCHAR(255) NOT NULL DEFAULT '' UNIQUE,
                "config_value" TEXT NOT NULL DEFAULT ''
            );`;

            let InsertSQL = `INSERT INTO config(config_key, config_value) VALUES `;

            const defaultValues = [["version", Config.get("ssm.version")]];

            const sqlData = [];

            defaultValues.forEach((configVal) => {
                InsertSQL += `(?, ?), `;
                sqlData.push(configVal[0]);
                sqlData.push(configVal[1]);
            });

            InsertSQL = InsertSQL.substring(0, InsertSQL.length - 2);
            InsertSQL += ";";

            this.queryRun(configTableSql)
                .then(() => {
                    return this.queryRun(InsertSQL, sqlData);
                })
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    console.log(err);
                });
        });
    }

    createStatsTable() {
        return new Promise((resolve, reject) => {
            logger.info("Creating Stats Table");
            const statsTableSql = `CREATE TABLE "stats" (
                "stat_key" VARCHAR(255) NOT NULL DEFAULT '' UNIQUE,
                "stat_value" TEXT NOT NULL DEFAULT ''
            );`;

            this.queryRun(statsTableSql)
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    console.log(err);
                });
        });
    }

    query(sql, data = []) {
        return new Promise((resolve, reject) => {
            const stmt = this.DB.prepare(sql);
            try {
                const rows = stmt.all(data);
                resolve(rows);
            } catch (err) {
                reject(err);
            }
        });
    }

    querySingle(sql, data = []) {
        return new Promise((resolve, reject) => {
            const stmt = this.DB.prepare(sql);
            try {
                const row = stmt.get(data);
                resolve(row);
            } catch (err) {
                reject(err);
            }
        });
    }

    queryRun(sql, data = []) {
        return new Promise((resolve, reject) => {
            const stmt = this.DB.prepare(sql);
            try {
                stmt.run(data);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    queryExec(sql) {
        return new Promise((resolve, reject) => {
            try {
                this.DB.exec(sql);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    buildSqlData(SQL, data = []) {
        let NewSQL = SQL;
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            NewSQL = NewSQL.replace("?", d);
        }

        return NewSQL;
    }
}

const agentDB = new AgentDB();
module.exports = agentDB;
