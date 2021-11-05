const Tools = require("../Mrhid6Utils/lib/tools");
const PageCache = require("./cache");
const logger = require("./logger");

class Page_Server {

    init() {
        this.SetupEventHandlers();
    }

    SetupEventHandlers() {
        PageCache.on("setagentslist", () => {
            this.DisplayServerInfo();
        })
    }

    DisplayServerInfo() {
        console.log(PageCache.getAgentsList())
        const agentid = parseInt($(".page-container").attr("data-agentid"));

        const Agent = PageCache.getAgentsList().find(agent => agent.id == agentid);

        console.log(Agent)

        $("#agent-publicip").text(window.location.hostname)
        $("#agent-connectionport").text(Agent.ports.ServerQueryPort)
    }

}

const page = new Page_Server();

module.exports = page;