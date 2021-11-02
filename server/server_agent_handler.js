const {
    Docker
} = require('node-docker-api');

const Config = require("./server_config");
const logger = require("./server_logger");

const platform = process.platform;

const AgentAPI = require("./server_agent_api");

const IAgent = require("../objects/obj_agent");


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

            this._docker.container.list({
                all: 1
            }).then(containers => {

                for (let i = 0; i < containers.length; i++) {

                    const container = containers[i];
                    const name = container.data.Names[0];
                    if (name.startsWith("/SSMAgent")) {
                        const name = container.data.Names[0];
                        const id = parseInt(name.replace("/SSMAgent", ""))

                        if (id >= this._NextAgentId) {
                            this._NextAgentId = id + 1;
                        }

                        const Agent = new IAgent(container);
                        this._AGENTS.push(Agent);
                    }
                }

                //console.log(this._AGENTS)

                return this.CheckAllAgentsActive();
            }).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            })
        });
    }

    GetAgentByDockerId(id) {
        return this._AGENTS.find(agent => agent.getContainerInfo().Id == id);
    }

    GetAgentById(id) {
        return this._AGENTS.find(agent => agent.getId() == id);
    }

    GetNewDockerInfo() {
        return {
            Name: "SSMAgent" + this._NextAgentId,
            AgentPort: (3000 + this._NextAgentId),
            ServerQueryPort: (15777 + this._NextAgentId),
            BeaconPort: (15000 + this._NextAgentId),
            Port: (7777 + this._NextAgentId),
        }
    }

    CreateNewDockerAgent() {
        return new Promise((resolve, reject) => {

            const {
                Name,
                AgentPort,
                ServerQueryPort,
                BeaconPort,
                Port
            } = this.GetNewDockerInfo()

            this._docker.container.create({
                Image: 'mrhid6/ssmagent:latest',
                name: Name,
                HostConfig: {
                    PortBindings: {
                        "3000/tcp": [{
                            "HostPort": `${AgentPort}`
                        }],
                        "15777/udp": [{
                            "HostPort": `${ServerQueryPort}`
                        }],
                        "15000/udp": [{
                            "HostPort": `${BeaconPort}`
                        }],
                        "7777/udp": [{
                            "HostPort": `${Port}`
                        }]
                    }
                }
            }).then(container => {
                logger.info("[AGENT_HANDLER] - Created agent successfully!");
                return container.start()
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
                })
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
            })
        })
    }

    StartDockerAgent(id) {
        logger.info("[AGENT_HANDLER] - Starting Agent...");
        return new Promise((resolve, reject) => {
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

    StopDockerAgent(id) {
        logger.info("[AGENT_HANDLER] - Stopping Agent...");
        return new Promise((resolve, reject) => {
            const Agent = this.GetAgentById(id);

            if (Agent == null) {
                logger.error(`[AGENT_HANDLER] - Cant Find Agent ${id}`);
                reject("Agent is Null");
                return;
            }

            let stoppromise;

            if (Agent.isActive() == false) {
                stoppromise = Agent.getContainer().stop();
            } else {
                stoppromise = AgentAPI.StopAgent(Agent)
            }

            stoppromise.then(() => {
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
            this.BuildAgentList().then(() => {
                const ResAgents = []
                for (let i = 0; i < this._AGENTS.length; i++) {
                    const agent = this._AGENTS[i];
                    ResAgents.push(agent.getWebJson());
                }

                resolve(ResAgents);
            })
        })
    }

    API_SetConfigSettings(ConfigKey, data) {
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

    API_InstallSF(data) {
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

    API_ExecuteServerAction(data) {
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
                    resolve();
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
}

const agentHandler = new AgentHandler();
module.exports = agentHandler;