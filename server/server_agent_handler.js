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
        }).then(() => {
            return this.CreateNewDockerAgent();
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

            this._docker.container.list().then(containers => {
                for (let i = 0; i < containers.length; i++) {
                    const container = containers[i];
                    if (container.data.Image === "mrhid6/ssmagent") {
                        const name = container.data.Names[0];
                        const id = parseInt(name.replace("/SSMAgent", ""))

                        if (id >= this._NextAgentId) {
                            this._NextAgentId = id + 1;
                        }

                        const Agent = new IAgent(container);
                        this._AGENTS.push(Agent);
                    }
                }

                console.log(this._AGENTS)
                console.log(this._NextAgentId)

                resolve();
            })
        });
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
                Image: 'mrhid6/ssmagent',
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
            let interval = setInterval(() => {
                Agent.getContainer().status().then(data => {
                    logger.debug("[AGENT_HANDLER] - Waiting for agent to start ...");
                    if (data.data.State.Running == true) {
                        AgentAPI.remoteRequestGET(Agent, "ping").then(res => {
                            if (res.data.result == "success") {
                                logger.debug("[AGENT_HANDLER] - Agent Started!");
                                resolve(Agent);
                                clearInterval(interval);
                            }
                        }).catch(err => {
                            //console.log(err);
                        })
                    }
                })
            }, 1000)
        });
    }
}

const agentHandler = new AgentHandler();
module.exports = agentHandler;