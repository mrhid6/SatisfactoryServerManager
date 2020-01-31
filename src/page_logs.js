const API_Proxy = require("./api_proxy");

const Tools = require("../Mrhid6Utils/lib/tools");

class Page_Logs {
    constructor() {
        this.ServerState = {}
    }

    init() {

        this.setupJqueryListeners();
        this.getSSMLog()
        this.getSMLauncherLog();


        this.startPageInfoRefresh();

    }

    setupJqueryListeners() {

    }

    getSSMLog() {
        API_Proxy.get("logs", "ssmlog").then(res => {
            const el = $("#ssm-log-viewer samp");
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

    getSMLauncherLog() {
        API_Proxy.get("logs", "smlauncherlog").then(res => {
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

    startPageInfoRefresh() {
        setInterval(() => {
            this.getSSMLog();
        }, 30 * 1000);
    }
}

const page = new Page_Logs();

module.exports = page;