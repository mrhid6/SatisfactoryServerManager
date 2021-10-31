const axios = require('axios').default;
const Config = require("./server_config");

class AgentAPI {

    constructor() {}


    remoteRequestGET(Agent, endpoint) {
        return new Promise((resolve, reject) => {

            const reqconfig = {
                headers: {
                    "x-ssm-key": Config.get("ssm.agent.publickey")
                }
            }

            axios.get(Agent.getURL() + endpoint, reqconfig).then(res => {
                const data = res.data;

                if (data.success == null || data.success == false) {
                    reject(new Error("Request returned an error: " + data.error));
                } else {
                    resolve(res);
                }
            })
        });
    }
    remoteRequestPOST(Agent, endpoint, requestdata) {
        return new Promise((resolve, reject) => {

            const reqconfig = {
                headers: {
                    "x-ssm-key": Config.get("ssm.agent.publickey")
                }
            }

            axios.post(Agent.getURL() + endpoint, requestdata, reqconfig).then(res => {
                const data = res.data;

                if (data.success == null || data.success == false) {
                    reject(new Error("Request returned an error: " + data.error));
                } else {
                    resolve(res);
                }
            })
        });
    }

    InitNewAgent(Agent) {
        return new Promise((resolve, reject) => {
            const postData = {
                publicKey: Config.get("ssm.agent.publickey"),
                agentId: Agent.getId()
            }
            this.remoteRequestPOST(Agent, "init", postData).then(res => {
                console.log(res.data);
                resolve();
            }).catch(err => {
                reject();
            })
        });
    }

}

const agentApi = new AgentAPI();
module.exports = agentApi;