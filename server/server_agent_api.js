const axios = require("axios");
const Config = require("./server_config");
const fs = require("fs-extra");
const path = require("path");

const FormData = require("form-data");

class AgentAPI {
    constructor() {}

    remoteRequestGET(Agent, endpoint) {
        return new Promise((resolve, reject) => {
            const reqconfig = {
                headers: {
                    "x-ssm-key": Config.get("ssm.agent.publickey"),
                },
            };
            const url = Agent.getURL() + endpoint;
            //console.log(url)

            axios
                .get(url, reqconfig)
                .then((res) => {
                    const data = res.data;

                    if (data.result != "success") {
                        reject(
                            new Error(
                                "Request returned an error: " + data.error
                            )
                        );
                    } else {
                        resolve(res);
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
    remoteRequestPOST(Agent, endpoint, requestdata) {
        return new Promise((resolve, reject) => {
            const reqconfig = {
                headers: {
                    "x-ssm-key": Config.get("ssm.agent.publickey"),
                },
            };

            const url = Agent.getURL() + endpoint;
            //console.log(url, reqconfig, requestdata);

            axios
                .post(url, requestdata, reqconfig)
                .then((res) => {
                    const data = res.data;

                    if (data.result != "success") {
                        reject(
                            new Error(
                                "Request returned an error: " + data.error
                            )
                        );
                    } else {
                        resolve(res);
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    InitNewAgent(Agent) {
        return new Promise((resolve, reject) => {
            const postData = {
                publicKey: Config.get("ssm.agent.publickey"),
                agentId: Agent.getId(),
                ports: {
                    server: Agent.getServerPort(),
                    beacon: Agent.getBeaconPort(),
                    port: Agent.getPort(),
                },
            };
            this.remoteRequestPOST(Agent, "init", postData)
                .then((res) => {
                    resolve();
                })
                .catch((err) => {
                    //console.log(err);
                    reject(err);
                });
        });
    }

    PingAgent(Agent) {
        return new Promise((resolve, reject) => {
            if (Agent.isRunning() === false) {
                resolve(false);
                return;
            }

            this.remoteRequestGET(Agent, "ping")
                .then((res) => {
                    if (res.data.result == "success") {
                        resolve(true);
                    }
                })
                .catch(() => {
                    resolve(false);
                });
        });
    }

    GetAgentInfo(Agent) {
        return new Promise((resolve, reject) => {
            if (!Agent.isActive()) {
                resolve({});
                return;
            }

            this.remoteRequestGET(Agent, "info")
                .then((res) => {
                    if (res.data.result == "success") {
                        resolve(res.data.data);
                    }
                })
                .catch(() => {
                    resolve({});
                });
        });
    }

    StopAgent(Agent) {
        return new Promise((resolve, reject) => {
            this.remoteRequestPOST(Agent, "stopagent")
                .then((res) => {
                    if (res.data.result == "success") {
                        resolve();
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    UploadAgentSaveFile(Agent, file) {
        return new Promise((resolve, reject) => {
            const form = new FormData();
            form.append("savefile", fs.createReadStream(file.path));

            const request_config = {
                headers: {
                    "x-ssm-key": Config.get("ssm.agent.publickey"),
                    ...form.getHeaders(),
                },
            };

            const url = Agent.getURL() + "gamesaves/upload";

            axios
                .post(url, form, request_config)
                .then((res) => {
                    resolve(res);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    DownloadAgentSaveFile(Agent, file) {
        return new Promise((resolve, reject) => {
            const outputFile = path.join(
                Config.get("ssm.tempdir"),
                `Agent${Agent.getId()}_${file}.sav`
            );
            const writer = fs.createWriteStream(outputFile);

            const reqconfig = {
                headers: {
                    "x-ssm-key": Config.get("ssm.agent.publickey"),
                },
                responseType: "stream",
            };

            //const url = "http://localhost:3001/agent/gamesaves/download"
            const url = Agent.getURL() + "gamesaves/download";
            //console.log(url)

            axios
                .post(
                    url,
                    {
                        savefile: file,
                    },
                    reqconfig
                )
                .then((res) => {
                    res.data.pipe(writer);
                    let error = null;

                    writer.on("error", (err) => {
                        error = err;
                        writer.close();
                        reject(err);
                    });

                    writer.on("close", (err) => {
                        if (!error) {
                            resolve(outputFile);
                        }
                    });
                });
        });
    }

    DownloadAgentBackupFile(Agent, file) {
        return new Promise((resolve, reject) => {
            const outputFile = path.join(
                Config.get("ssm.tempdir"),
                `Agent${Agent.getId()}_${file}`
            );
            const writer = fs.createWriteStream(outputFile);

            const reqconfig = {
                headers: {
                    "x-ssm-key": Config.get("ssm.agent.publickey"),
                },
                responseType: "stream",
            };

            //const url = "http://localhost:3001/agent/gamesaves/download"
            const url = Agent.getURL() + "backups/download";
            //console.log(url)

            axios
                .post(
                    url,
                    {
                        backupfile: file,
                    },
                    reqconfig
                )
                .then((res) => {
                    res.data.pipe(writer);
                    let error = null;

                    writer.on("error", (err) => {
                        error = err;
                        writer.close();
                        reject(err);
                    });

                    writer.on("close", (err) => {
                        if (!error) {
                            resolve(outputFile);
                        }
                    });
                });
        });
    }
}
const agentApi = new AgentAPI();
module.exports = agentApi;
