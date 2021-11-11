const API_Proxy = require("./api_proxy");
const Tools = require("../Mrhid6Utils/lib/tools");
const PageCache = require("./cache");

class Page_Logs {
    constructor() {
        this.ServerState = {}
    }

    init() {

        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    setupJqueryListeners() {

    }

    SetupEventHandlers() {
        PageCache.on("setactiveagent", () => {
            this.MainDisplayFunction();
        })
    }

    MainDisplayFunction() {
        const Agent = PageCache.getActiveAgent()

        if (Agent == null) {
            this.getSSMLog();
            return;
        }

        this.getSSMLog();
        this.getSMLauncherLog();
        this.getSFServerLog();
    }

    getSSMLog() {
        const Agent = PageCache.getActiveAgent()
        const postData = {}

        if (Agent == null) {
            postData.agentid = -1;
        } else {
            postData.agentid = Agent.id;
        }

        API_Proxy.postData("agent/logs/ssmlog", postData).then(res => {
            const el = $("#ssm-log-viewer samp");
            el.empty();
            if (res.result == "success") {
                res.data.forEach((logline) => {
                    el.append("<p>" + logline + "</p>")
                })
            } else {
                el.text(res.error.message)
            }
        })
    }

    getSMLauncherLog() {
        const Agent = PageCache.getActiveAgent()
        const postData = {}

        if (Agent == null) {
            postData.agentid = -1;
        } else {
            postData.agentid = Agent.id;
        }

        API_Proxy.postData("agent/logs/smlauncherlog", postData).then(res => {
            const el = $("#smlauncher-log-viewer samp");
            el.empty();
            if (res.result == "success") {
                res.data.forEach((logline) => {
                    el.append("<p>" + logline + "</p>")
                })
            } else {
                el.text(res.error)
            }
        })
    }

    getSFServerLog() {
        const Agent = PageCache.getActiveAgent()
        const postData = {}

        if (Agent == null) {
            postData.agentid = -1;
        } else {
            postData.agentid = Agent.id;
        }
        API_Proxy.postData("agent/logs/sfserverlog", postData).then(res => {
            const el = $("#sf-log-viewer samp");
            el.empty();
            if (res.result == "success") {
                res.data.forEach((logline) => {
                    el.append("<p>" + logline + "</p>")
                })
            } else {
                el.text(res.error)
            }
        })
    }
}

const page = new Page_Logs();

module.exports = page;