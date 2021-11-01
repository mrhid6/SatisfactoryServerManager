const API_Proxy = require("./api_proxy");

const Tools = require("../Mrhid6Utils/lib/tools");
const PageCache = require("./cache");
const logger = require("./logger");

class Page_Dashboard {
    constructor() {
        this.ServerState = {}
    }

    init() {
        this.setupEventHandlers();
        this.setupJqueryListeners();
        this.getModCount();

    }

    setupEventHandlers() {
        PageCache.on("setagentslist", () => {
            logger.info("Got Agents List!")
            this.OnGotAgentsList();
        })

        PageCache.on("setactiveagent", () => {
            logger.info("Set Active Agent!")
            this.ToggleActionsButtons();
        })
    }

    setupJqueryListeners() {

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

    OnGotAgentsList() {
        const el = $("#server-count");

        const runningCount = PageCache.getAgentsList().filter(agent => agent.running == true && agent.active == true).length;
        const maxCount = PageCache.getAgentsList().length;

        el.text(`${runningCount} / ${maxCount}`)
    }

    ToggleActionsButtons() {
        console.log(PageCache.getActiveAgent())

        const $StartButton = $("#server-action-start");
        const $StopButton = $("#server-action-stop");
        const $KillButton = $("#server-action-kill");

        $StartButton.prop("disabled", true);
        $StopButton.prop("disabled", true);
        $KillButton.prop("disabled", true);

        $StartButton.parent().attr("title", "");
        $StopButton.parent().attr("title", "");
        $KillButton.parent().attr("title", "");

        const Agent = PageCache.getActiveAgent();

        if (Agent != null && Agent.running === true && Agent.active === true) {
            const serverState = Agent.info.sfStatus;
            if (serverState != null) {

                console.log()

                if (serverState.status == "notinstalled") {
                    $StartButton.parent().attr("title", "SF Server Not Installed");
                    $StopButton.parent().attr("title", "SF Server Not Installed");
                    $KillButton.parent().attr("title", "SF Server Not Installed");

                    $StartButton.parent().tooltip("_fixTitle");
                    $StopButton.parent().tooltip("_fixTitle");
                    $KillButton.parent().tooltip("_fixTitle");
                    return;
                } else if (serverState.status == "stopped") {
                    $StartButton.prop("disabled", false);
                    $StopButton.prop("disabled", true);
                    $KillButton.prop("disabled", true);
                } else {
                    $StartButton.prop("disabled", true);
                    $StopButton.prop("disabled", false);
                    $KillButton.prop("disabled", false);
                }

            }
        } else {
            $StartButton.parent().attr("title", "Select An Active Server");
            $StopButton.parent().attr("title", "Select An Active Server");
            $KillButton.parent().attr("title", "Select An Active Server");
            $StartButton.parent().tooltip("_fixTitle");
            $StopButton.parent().tooltip("_fixTitle");
            $KillButton.parent().tooltip("_fixTitle");
        }
    }


}

const page = new Page_Dashboard();

module.exports = page;