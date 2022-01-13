const {
    Docker
} = require('node-docker-api');

const Config = require("./server_config");
const logger = require("./server_logger");

const platform = process.platform;

const AgentAPI = require("./server_agent_api");
const SSM_Log_Handler = require("./server_log_handler");

const IAgent = require("../objects/obj_agent");

const UserManager = require("./server_user_manager");
const DB = require("./server_db");

const promisifyStream = (stream) => new Promise((resolve, reject) => {
    stream.on('data', (d) => {})
    stream.on('end', resolve)
    stream.on('error', reject)
})



class AgentHandler {
    constructor() {

        let dockerSettings = {
            host: "http://127.0.0.1",
            port: 2375
        }

        if (platform != "win32") {
            dockerSettings = {
                socketPath: "/var/run/docker.sock"
            }
        }

        this._docker = new Docker(dockerSettings);

        this._NextAgentId = 1;

        this._AGENTS = [];
    }

    init() {
        this.PullDockerImage().then(() => {
            return this.BuildAgentList()
        }).then(() => {
            //console.log(this._AGENTS)
        }).catch(err => {
            console.log(err);
        })
    }

    PullDockerImage() {
        return new Promise((resolve, reject) => {
            this._docker.image.create({}, {
                    fromImage: "mrhid6/ssmagent",
                    tag: "latest"
                })
                .then(stream => promisifyStream(stream))
                .then(() => {
                    resolve()
                });
        })
    }


    BuildAgentList() {
        return new Promise((resolve, reject) => {

            this._AGENTS = [];

            const SQL = `SELECT * FROM agents`

            DB.query(SQL).then(rows => {

                const containerPromises = [];

                rows.forEach(row => {
                    const Agent = new IAgent();
                    Agent.parseDBData(row);
                    this._AGENTS.push(Agent);

                    containerPromises.push(this.GetDockerForAgent(Agent));
                })

                Promise.all(containerPromises).then(values => {
                    for (let i = 0; i < values.length; i++) {
                        const container = values[i];
                        const Agent = this._AGENTS[i];

                        Agent.setContainer(container);


                    }

                    const removePromises = [];

                    this.GetAllAgents().forEach(Agent => {
                        if (!Agent.isValid()) {
                            removePromises.push(this.RemoveAgentFromDB(Agent));
                        } else {
                            if (Agent.getId() >= this._NextAgentId) {
                                this._NextAgentId = Agent.getId() + 1;
                            }
                        }
                    })

                    return Promise.all(removePromises);
                }).then(values => {

                    for (let i = 0; i < values.length; i++) {
                        const agentId = values[i];
                        const Agent = this.GetAgentById(agentId);

                        const index = this._AGENTS.indexOf(Agent);

                        if (index > -1) {
                            this._AGENTS.splice(index, 1);
                        }
                    }

                    return this.CheckAllAgentsActive();
                }).then(() => {
                    return this.FixAgentsMigrationPortData();
                }).then(() => {
                    resolve();
                }).catch(reject)
            });

        });
    }

    GetDockerForAgent(Agent) {
        return new Promise((resolve, reject) => {
            this._docker.container.list({
                all: 1
            }).then(containers => {
                containers.forEach(container => {
                    if (container.data.Id == Agent.getDockerId()) {
                        resolve(container);
                        return;
                    }
                })

                resolve(null)
            }).catch(reject)

        });
    }

    GetAgentByDockerId(id) {
        return this._AGENTS.find(agent => agent.getDockerId() == id);
    }

    GetAllAgents() {
        return this._AGENTS;
    }

    GetAgentById(id) {
        return this._AGENTS.find(agent => agent.getId() == id);
    }

    GetAgentByDisplayName(name) {
        return this._AGENTS.find(agent => agent.getDisplayName().toLowerCase() == name.toLowerCase());
    }

    GetAgentByServerPort(port) {
        return this._AGENTS.find(agent => agent.getServerPort() == port);
    }

    GetNewDockerInfo(ServerName, portOffset) {
        return {
            Name: "SSMAgent_" + ServerName,
            AgentPort: (3000 + portOffset),
            ServerQueryPort: (15776 + portOffset),
            BeaconPort: (14999 + portOffset),
            Port: (7776 + portOffset),
        }
    }

    FixAgentsMigrationPortData() {
        return new Promise((resolve, reject) => {
            const promises = [];

            this.GetAllAgents().forEach(Agent => {
                if (Agent.getSSMPort() == 0 && Agent.isRunning()) {

                    const Ports = Agent.getContainerInfo().Ports;
                    let BeaconPort = 0,
                        ServerPort = 0,
                        SSMPort = 0,
                        Port = 0;

                    if (Ports.length > 0) {
                        BeaconPort = Ports[0].PublicPort;
                        ServerPort = Ports[1].PublicPort;
                        SSMPort = Ports[2].PublicPort;
                        Port = Ports[3].PublicPort;
                    }

                    const SQL = `UPDATE agents SET agent_ssm_port=?, agent_serverport=?, agent_beaconport=?, agent_port=? WHERE agent_id=?`
                    const SQLData = [
                        SSMPort,
                        ServerPort,
                        BeaconPort,
                        Port,
                        Agent.getId()
                    ];
                    promises.push(DB.queryRun(SQL, SQLData));
                }
            })

            Promise.all(promises).then(() => {
                resolve();
            })

        });
    }

    CreateNewDockerAgent(UserID, Data) {
        return new Promise((resolve, reject) => {

            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            if (!UserAccount.HasPermission("agentactions.create")) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }


            const portOffset = Data.port - 15776;

            if (portOffset < 0) {
                reject(new Error("Server Port must be above 15776"))
                return;
            }

            const DisplayName = Data.name.replace(" ", "");


            const {
                Name,
                AgentPort,
                ServerQueryPort,
                BeaconPort,
                Port
            } = this.GetNewDockerInfo(DisplayName, portOffset)

            let ExistingAgent = this.GetAgentByServerPort(ServerQueryPort);

            if (ExistingAgent != null) {
                reject(new Error(`Server Instance with this port (${ServerQueryPort}) Already Exist!`))
                return;
            }

            ExistingAgent = this.GetAgentByDisplayName(DisplayName);

            if (ExistingAgent != null) {
                reject(new Error(`Server Instance with this name (${DisplayName}) Already Exist!`))
                return;
            }

            logger.info(`[AGENT_HANDLER] - Creating Agent (${DisplayName}) ...`);

            const PortBindings = {};

            PortBindings["3000/tcp"] = [{
                "HostPort": `${AgentPort}`
            }]

            PortBindings[`${ServerQueryPort}/udp`] = [{
                "HostPort": `${ServerQueryPort}`
            }]

            PortBindings[`${BeaconPort}/udp`] = [{
                "HostPort": `${BeaconPort}`
            }]

            PortBindings[`${Port}/udp`] = [{
                "HostPort": `${Port}`
            }]

            const ExposedPorts = {
                "3000/tcp": {}
            }

            ExposedPorts[`${ServerQueryPort}/udp`] = {}
            ExposedPorts[`${BeaconPort}/udp`] = {}
            ExposedPorts[`${Port}/udp`] = {}

            this._docker.container.create({
                Image: 'mrhid6/ssmagent:latest',
                name: Name,
                HostConfig: {
                    PortBindings: PortBindings
                },
                ExposedPorts
            }).then(container => {
                logger.info("[AGENT_HANDLER] - Created agent successfully!");
                return this.CreateAgentInDB(container, Name, DisplayName, AgentPort, ServerQueryPort, BeaconPort, Port).then(() => {
                    logger.info("[AGENT_HANDLER] - Starting Agent ...");
                    return container.start()
                })
            }).then(container => {
                const Agent = new IAgent(container);
                return this.WaitForAgentToStart(Agent)
            }).then(Agent => {
                logger.info("[AGENT_HANDLER] - Agent Started!");
                return AgentAPI.InitNewAgent(Agent)
            }).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            })

        });
    }

    CreateAgentInDB(container, Name, DisplayName, SSMPort, ServerPort, BeaconPort, Port) {
        return new Promise((resolve, reject) => {
            const SQL = "INSERT INTO agents(agent_name, agent_displayname, agent_docker_id, agent_ssm_port, agent_serverport, agent_beaconport, agent_port) VALUES (?,?,?,?,?,?,?)"

            const SQLData = [
                Name,
                DisplayName,
                container.data.Id,
                SSMPort,
                ServerPort,
                BeaconPort,
                Port
            ];
            DB.queryRun(SQL, SQLData).then(() => {
                return this.BuildAgentList();
            }).then(() => {
                resolve();
            }).catch(reject)
        });
    }

    RemoveAgentFromDB(Agent) {
        return new Promise((resolve, reject) => {
            const AgentID = Agent.getId();
            const SQL = "DELETE FROM agents WHERE agent_id=?";
            DB.queryRun(SQL, [Agent.getId()]).then(() => {
                resolve(AgentID);
            })
        });
    }


    DeleteAgent(UserID, Data) {
        return new Promise((resolve, reject) => {
            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            if (!UserAccount.HasPermission("agentactions.delete")) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }

            logger.info(`[AGENT_HANDLER] - Deleting Agent`);
            let VolumeID = "";
            this.StopDockerAgent(Data.agentid, UserID).then(() => {
                logger.info(`[AGENT_HANDLER] - Agent Stopped`);
                const Agent = this.GetAgentById(Data.agentid);
                if (Agent == null) {
                    logger.error(`[AGENT_HANDLER] - Cant Find Agent ${Data.agentid}`);
                    reject("Agent is Null");
                    return;
                }


                VolumeID = Agent.getContainerInfo().Mounts[0].Name
                const Container = Agent.getContainer();

                return Container.delete({
                    force: true
                })
            }).then(() => {
                logger.info(`[AGENT_HANDLER] - Docker Deleted`);
                return this._docker.volume.get(VolumeID);
            }).then(Volume => {
                return Volume.remove({
                    force: true
                });
            }).then(() => {
                logger.info(`[AGENT_HANDLER] - Docker Volume Deleted`);
                return this.BuildAgentList();
            }).then(() => {
                logger.info(`[AGENT_HANDLER] - Agent Deleted!`);
                resolve();
            }).catch(reject)

        });
    }

    WaitForAgentToStart(Agent) {
        return new Promise((resolve, reject) => {
            const AgentId = Agent.getContainerInfo().Id;

            let interval = setInterval(() => {
                logger.debug("[AGENT_HANDLER] - Waiting for agent to start ...");

                this.BuildAgentList().then(() => {
                    const TempAgent = this.GetAgentByDockerId(AgentId);

                    if (TempAgent == null) {
                        return;
                    }

                    if (TempAgent.isActive() === true) {
                        resolve(TempAgent);
                        clearInterval(interval);
                    }
                }).catch(err => {})
            }, 5000)
        });
    }

    WaitForAgentToStop(Agent) {
        return new Promise((resolve, reject) => {
            const AgentId = Agent.getContainerInfo().Id;

            let interval = setInterval(() => {
                logger.debug("[AGENT_HANDLER] - Waiting for agent to stop ...");

                this.BuildAgentList().then(() => {
                    const TempAgent = this.GetAgentByDockerId(AgentId);

                    if (TempAgent == null) {
                        return;
                    }

                    if (TempAgent.isActive() === false && TempAgent.isRunning() == false) {
                        resolve(TempAgent);
                        clearInterval(interval);
                    }
                }).catch(err => {})
            }, 5000)
        });
    }

    CheckAllAgentsActive() {
        return new Promise((resolve, reject) => {
            const promises = [];

            for (let i = 0; i < this._AGENTS.length; i++) {
                const Agent = this._AGENTS[i];
                promises.push(AgentAPI.PingAgent(Agent))
            }

            Promise.all(promises).then(values => {
                for (let i = 0; i < values.length; i++) {
                    const active = values[i];
                    this._AGENTS[i].setActive(active);
                }
                return this.CheckAgentInfo()
            }).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            })
        });
    }

    CheckAgentInfo() {
        return new Promise((resolve, reject) => {
            const promises = [];
            for (let i = 0; i < this._AGENTS.length; i++) {
                const Agent = this._AGENTS[i];
                promises.push(AgentAPI.GetAgentInfo(Agent));
            }

            Promise.all(promises).then(values => {
                for (let i = 0; i < values.length; i++) {
                    const active = values[i];
                    this._AGENTS[i].setInfo(active);
                }
                resolve();
            }).catch(err => {
                reject(err);
            })
        })
    }

    StartDockerAgent(id, UserID) {

        return new Promise((resolve, reject) => {

            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            if (!UserAccount.HasPermission("agentactions.start")) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }

            logger.info("[AGENT_HANDLER] - Starting Agent...");

            const Agent = this.GetAgentById(id);

            if (Agent == null) {
                logger.error(`[AGENT_HANDLER] - Cant Find Agent ${id}`);
                reject("Agent is Null");
                return;
            }

            Agent.getContainer().start().then(() => {
                return this.BuildAgentList();
            }).then(() => {
                logger.info("[AGENT_HANDLER] - Agent Started!");
                resolve();
            }).catch(err => {
                reject(err);
            })
        });
    }

    StopDockerAgent(id, UserID) {

        return new Promise((resolve, reject) => {


            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            if (!UserAccount.HasPermission("agentactions.stop")) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }

            logger.info("[AGENT_HANDLER] - Stopping Agent...");

            const Agent = this.GetAgentById(id);

            if (Agent == null) {
                logger.error(`[AGENT_HANDLER] - Cant Find Agent ${id}`);
                reject("Agent is Null");
                return;
            }

            if (Agent.isActive() == false && Agent.isRunning() == false) {
                logger.info("[AGENT_HANDLER] - Agent Already Stopped!");
                resolve();
                return;
            }

            let stoppromise;

            if (Agent.isActive() == false) {
                stoppromise = Agent.getContainer().stop();
            } else {
                stoppromise = AgentAPI.StopAgent(Agent)
            }

            stoppromise.then(() => {
                return this.WaitForAgentToStop(Agent)
            }).then(() => {
                return this.BuildAgentList();
            }).then(() => {
                logger.info("[AGENT_HANDLER] - Agent Stopped!");
                resolve();
            }).catch(err => {
                reject(err);
            })
        });
    }

    API_GetAllAgents() {
        return new Promise((resolve, reject) => {
            this.CheckAllAgentsActive().then(() => {
                const ResAgents = []
                for (let i = 0; i < this.GetAllAgents().length; i++) {
                    const agent = this.GetAllAgents()[i];
                    ResAgents.push(agent.getWebJson());
                }

                resolve(ResAgents);
            }).catch(err => {
                reject(err);
            })
        })
    }

    API_SetConfigSettings(ConfigKey, data, UserID) {
        return new Promise((resolve, reject) => {

            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            const shortKey = ConfigKey.replace("settings", "");

            if (!UserAccount.HasPermission(`settings.agent.${shortKey}`)) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }

            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is null!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }


            AgentAPI.remoteRequestPOST(Agent, "config/" + ConfigKey, data).then(res => {
                if (res.data.result == "success") {
                    resolve();
                } else {
                    reject(new Error(res.data.error));
                }
            }).catch(err => {
                reject(err);
            })
        })
    }

    API_InstallSF(data, UserID) {
        return new Promise((resolve, reject) => {

            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            if (!UserAccount.HasPermission(`serveractions.install`)) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }

            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is null!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }

            AgentAPI.remoteRequestPOST(Agent, "installsf", {}).then(res => {
                if (res.data.result == "success") {
                    resolve();
                } else {
                    reject(new Error(res.data.error));
                }
            }).catch(err => {
                reject(err);
            })

        });
    }

    API_ExecuteServerAction(data, UserID) {
        return new Promise((resolve, reject) => {

            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            if (!UserAccount.HasPermission(`serveractions.${data.action}`)) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }



            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is null!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }

            AgentAPI.remoteRequestPOST(Agent, "serveraction", data).then(res => {
                if (res.data.result == "success") {
                    resolve();
                } else {
                    reject(new Error(res.data.error));
                }
            }).catch(err => {
                reject(err);
            })

        })
    }

    API_GetModInfo(data) {
        return new Promise((resolve, reject) => {

            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is null!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }

            AgentAPI.remoteRequestGET(Agent, `modinfo/${data.info}`).then(res => {
                if (res.data.result == "success") {
                    resolve(res.data.data);
                } else {
                    reject(new Error(res.data.error));
                }
            }).catch(err => {
                reject(err);
            })

        })
    }

    API_ExecuteModAction(data) {
        return new Promise((resolve, reject) => {

            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is null!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }

            AgentAPI.remoteRequestPOST(Agent, `modaction/${data.action}`, data).then(res => {
                if (res.data.result == "success") {
                    resolve();
                } else {
                    reject(new Error(res.data.error));
                }
            }).catch(err => {
                reject(err);
            })

        })
    }

    API_UploadSaveFile(fileData, data, UserID) {
        return new Promise((resolve, reject) => {

            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            if (!UserAccount.HasPermission(`settings.saves.upload`)) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }

            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is null!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }

            AgentAPI.UploadAgentSaveFile(Agent, fileData).then(res => {
                resolve(res)
            }).catch(err => {
                reject(err);
            })

        });
    }

    API_GetGameSaves(data) {
        return new Promise((resolve, reject) => {

            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is null!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }

            AgentAPI.remoteRequestGET(Agent, "gamesaves").then(res => {
                resolve(res.data.data)
            }).catch(err => {
                reject(err);
            })
        })
    }

    API_DeleteSaveFile(data, UserID) {
        return new Promise((resolve, reject) => {

            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            if (!UserAccount.HasPermission(`settings.saves.delete`)) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }

            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is null!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }

            AgentAPI.remoteRequestPOST(Agent, "gamesaves/delete", data).then(res => {
                resolve(res.data)
            }).catch(err => {
                reject(err);
            })
        })
    }

    API_DownloadSaveFile(data, UserID) {
        return new Promise((resolve, reject) => {


            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            if (!UserAccount.HasPermission(`settings.saves.download`)) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }

            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is null!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }

            AgentAPI.DownloadAgentSaveFile(Agent, data.savefile).then(savefile => {
                resolve(savefile)
            }).catch(err => {
                reject(err);
            })
        });
    }

    API_GetLogs(LogType, data) {
        return new Promise((resolve, reject) => {

            if (data.agentid == -1 && LogType == "ssmlog") {
                SSM_Log_Handler.getSSMLog().then(logs => {
                    resolve(logs);
                    return;
                })
                return;
            }

            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is not defined!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }

            AgentAPI.remoteRequestGET(Agent, `logs/${LogType}`).then(res => {
                resolve(res.data.data);
            }).catch(err => {
                reject(err);
            })

        });
    }

    API_GetBackups(data, UserID) {
        return new Promise((resolve, reject) => {

            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            if (!UserAccount.HasPermission(`settings.backup.view`)) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }


            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is not defined!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }

            AgentAPI.remoteRequestGET(Agent, "backups").then(res => {
                resolve(res.data.data);
            }).catch(err => {
                reject(err);
            })
        });
    }

    API_DownloadBackupFile(data, UserID) {
        return new Promise((resolve, reject) => {


            const UserAccount = UserManager.getUserById(UserID);

            if (UserAccount == null || typeof UserAccount == undefined) {
                reject(new Error("User Not Found!"));
                return;
            }

            if (!UserAccount.HasPermission(`settings.backup.download`)) {
                reject(new Error("User Doesn't Have Permission!"));
                return;
            }

            const Agent = this.GetAgentById(data.agentid)
            if (Agent == null) {
                reject(new Error("Agent is null!"))
                return;
            }

            if (Agent.isRunning() == false || Agent.isActive() == false) {
                reject(new Error("Agent is offline"))
                return;
            }

            AgentAPI.DownloadAgentBackupFile(Agent, data.backupfile).then(backupfile => {
                resolve(backupfile)
            }).catch(err => {
                reject(err);
            })
        });
    }
}

const agentHandler = new AgentHandler();
module.exports = agentHandler;