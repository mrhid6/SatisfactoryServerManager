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

    }

    setupEventHandlers() {
        PageCache.on("setagentslist", () => {
            logger.info("Got Agents List!")
            this.OnGotAgentsList();
        })

        PageCache.on("setactiveagent", () => {
            logger.info("Set Active Agent!")
            this.ToggleActionsButtons();
            this.SetServerStatus();
            this.getInstalledMods();
        })

        PageCache.on("setinstalledmods", () => {
            $(".installed-mods").text(PageCache.getAgentInstalledMods().length)
            this.getSMLInfo();
        });
    }

    setupJqueryListeners() {
        $("#server-action-start").on("click", e => {
            e.preventDefault();
            this.ServerAction_Start();
        })

        $("#server-action-stop").on("click", e => {
            e.preventDefault();
            this.ServerAction_Stop();
        })

        $("#server-action-kill").on("click", e => {
            e.preventDefault();
            this.ServerAction_Kill();
        })
    }

    OnGotAgentsList() {
        const el = $("#server-count");

        const runningCount = PageCache.getAgentsList().filter(agent => agent.running == true && agent.active == true).length;
        const maxCount = PageCache.getAgentsList().length;

        el.text(`${runningCount} / ${maxCount}`)
    }

    getSMLInfo() {

        const Agent = PageCache.getActiveAgent()
        const postData = {
            agentid: Agent.id
        }

        API_Proxy.postData("agent/modinfo/smlinfo", postData).then(res => {
            const el = $("#mod-status");
            if (res.result == "success") {
                if (res.data.state == "not_installed") {
                    el.text("Not Installed")
                } else {
                    el.text("Installed")
                }
            } else {
                el.text("Unknown")
            }
        });
    }

    getInstalledMods() {
        const Agent = PageCache.getActiveAgent()
        if (Agent != null && Agent.running && Agent.active) {
            const postData = {
                agentid: Agent.id
            }
            API_Proxy.postData("agent/modinfo/installed", postData).then(res => {
                if (res.result == "success") {
                    PageCache.SetAgentInstalledMods(res.data);
                } else {
                    PageCache.SetAgentInstalledMods([]);
                }
            });
        } else {
            $("#mod-status").text("Select An Active Server")
        }
    }

    SetServerStatus() {
        const Agent = PageCache.getActiveAgent();
        const $el = $("#server-status");

        if (Agent != null && Agent.running && Agent.active) {
            const serverState = Agent.info.serverstate;
            const SFConfig = Agent.info.config.satisfactory;
            if (serverState != null) {
                if (serverState.status == "notinstalled" || SFConfig.installed == false) {
                    $el.text("Not Installed")
                } else if (serverState.status == "stopped") {
                    $el.text("Stopped")
                } else if (serverState.status == "running") {
                    $el.text("Running")
                }

                $("#cpu-usage div").width((serverState.pcpu).toDecimal() + "%")
                $("#ram-usage div").width((serverState.pmem).toDecimal() + "%")

                $(".user-count").text(Agent.info.usercount);
                return;
            }


        }
        $(".user-count").text(0);
        $el.text("Select An Active Server")
    }

    ToggleActionsButtons() {

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
            const serverState = Agent.info.serverstate;
            const SFConfig = Agent.info.config.satisfactory;
            if (serverState != null) {

                if (serverState.status == "notinstalled" || SFConfig.installed == false) {
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

    ExecuteServerAction(postData) {
        API_Proxy.postData("agent/serveraction", postData).then(res => {
            if (res.result == "success") {
                toastr.success("Server Action Completed!")
            } else {
                toastr.error("Failed to Execute Server Action!");
            }
        })
    }

    ServerAction_Start() {
        const Agent = PageCache.getActiveAgent();

        if (Agent != null) {
            const postData = {
                agentid: Agent.id,
                action: "start"
            }

            this.ExecuteServerAction(postData);
        }
    }

    ServerAction_Stop() {
        const Agent = PageCache.getActiveAgent();

        if (Agent != null) {
            const postData = {
                agentid: Agent.id,
                action: "stop"
            }

            this.ExecuteServerAction(postData);
        }
    }

    ServerAction_Kill() {
        const Agent = PageCache.getActiveAgent();

        if (Agent != null) {
            const postData = {
                agentid: Agent.id,
                action: "kill"
            }

            this.ExecuteServerAction(postData);
        }
    }


}

const page = new Page_Dashboard();

module.exports = page;