const API_Proxy = require("./api_proxy");

const Tools = require("../Mrhid6Utils/lib/tools");

class Page_Dashboard {
    constructor() {
        this.ServerState = {}
    }

    init() {

        this.setupJqueryListeners();
        this.getAgentsList()
        this.getModCount();


        this.startPageInfoRefresh();

    }

    setupJqueryListeners() {

    }

    getAgentsList() {
        API_Proxy.get("agent", "agents").then(res => {
            const el = $("#server-count");
            if (res.result == "success") {
                this.AgentsList = res.data;

                const runningCount = this.AgentsList.filter(agent => agent.running == true && agent.active == true).length;
                const maxCount = this.AgentsList.length;

                el.text(`${runningCount} / ${maxCount}`)

                $("#cpu-usage div").width((res.data.pcpu).toDecimal() + "%")
                $("#ram-usage div").width((res.data.pmem).toDecimal() + "%")

            } else {
                el.text("Server Error!")
            }
        })
    }

    getModCount() {
        API_Proxy.get("mods", "modsinstalled").then(res => {
            const el = $("#mod-count");
            if (res.result == "success") {
                el.text(res.data.length)
            } else {
                el.text(res.error)
            }
        })
    }


    startPageInfoRefresh() {
        setInterval(() => {
            this.getAgentsList();
            this.getModCount();
        }, 5 * 1000);
    }
}

const page = new Page_Dashboard();

module.exports = page;