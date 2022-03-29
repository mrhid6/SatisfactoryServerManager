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
        this.DashboardBuilt = false;
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

        const $AgentWrapper = $("#agents-wrapper");
        if (this.DashboardBuilt == false) {
            $AgentWrapper.empty();
            let $Row = $("<div/>").addClass("row");

            PageCache.getAgentsList().forEach((Agent, index) => {
                $Row.append(this.BuildAgentsUI(Agent));

                if ((index % 4) == 0 && index > 0) {
                    $AgentWrapper.append($Row);
                    $Row = $("<div/>").addClass("row");
                }
            })

            $AgentWrapper.append($Row)
            this.DashboardBuilt = true;
        } else {

        }
    }

    BuildAgentsUI(Agent) {
        console.log(Agent)

        const $Col = $("<div/>").addClass("col-12 col-md-4 col-lg-4 col-xl-3");

        const $Card = $("<div/>").addClass("card mb-3").attr("id", `server-card-${Agent.id}`);
        $Col.append($Card);

        const $CardHeader = $("<div/>").addClass("card-header");
        $CardHeader.html(`<h5>Server: ${Agent.displayname}</h5>`)
        $Card.append($CardHeader);

        const $CardBody = $("<div/>").addClass("card-body");
        $Card.append($CardBody);

        let StatusText = "Offline";
        let UsersText = 0;

        if (Agent != null && Agent.running && Agent.active) {
            const serverState = Agent.info.serverstate;
            const SFConfig = Agent.info.config.satisfactory;
            if (serverState != null) {
                if (serverState.status == "notinstalled" || SFConfig.installed == false) {
                    StatusText = "Not Installed"
                } else if (serverState.status == "stopped") {
                    StatusText = "Stopped"
                } else if (serverState.status == "running") {
                    StatusText = "Running"
                }
            }

            UsersText = Agent.info.usercount;

        }

        const $StatusInfoCard = this.BuildAgentInfoCard("blue", "Status", StatusText, "fa-server")
        $CardBody.append($StatusInfoCard)

        const $UsersInfoCard = this.BuildAgentInfoCard("orange", "Users", UsersText, "fa-user")
        $CardBody.append($UsersInfoCard)

        const $ModsInfoCard = this.BuildAgentInfoCard("green", "Installed Mods", 0, "fa-pencil-ruler")
        $CardBody.append($ModsInfoCard)

        $CardBody.append("<hr/>")

        const $ProgressBarwrapper = $("<div/>").addClass("progress-bar-wrapper");
        $CardBody.append($ProgressBarwrapper)

        const $cpuProgress = this.BuildAgentProgressBar(Agent.id, "cpu_progress", "CPU");
        $ProgressBarwrapper.append($cpuProgress)

        const $memProgress = this.BuildAgentProgressBar(Agent.id, "mem_progress", "RAM");
        $ProgressBarwrapper.append($memProgress)

        const serverState = Agent.info.serverstate;
        let cpuPercent = 0;
        let memPercent = 0;
        if (serverState != null) {
            cpuPercent = (serverState.pcpu).toDecimal()
            memPercent = (serverState.pmem).toDecimal()
        }

        $cpuProgress.circleProgress({
            startAngle: -Math.PI / 4 * 2,
            value: cpuPercent / 100,
            size: 150,
            lineCap: 'round',
            emptyFill: "rgba(255, 255, 255, .1)",
            fill: {
                color: '#ffa500'
            }
        }).on('circle-animation-progress', function (event, progress, stepValue) {
            $(this).find('strong').text(`${(stepValue.toFixed(2) * 100).toFixed(0)}%`);
        });

        $memProgress.circleProgress({
            startAngle: -Math.PI / 4 * 2,
            value: memPercent / 100,
            size: 150,
            lineCap: 'round',
            emptyFill: "rgba(255, 255, 255, .1)",
            fill: {
                color: '#ffa500'
            }
        }).on('circle-animation-progress', function (event, progress, stepValue) {
            $(this).find('strong').text(`${(stepValue.toFixed(2) * 100).toFixed(0)}%`);
        });

        $CardBody.append("<hr/>")


        const $ActionButtonWrapper = $(`<div class="row"></div>`)
        $CardBody.append($ActionButtonWrapper)

        $ActionButtonWrapper.append(this.BuildServerActionButton(Agent.id, "success", "start", "fa-play", "Start Server"))
        $ActionButtonWrapper.append(this.BuildServerActionButton(Agent.id, "warning", "stop", "fa-stop", "Stop Server"))
        $ActionButtonWrapper.append(this.BuildServerActionButton(Agent.id, "danger", "kill", "fa-skull-crossbones", "Kill Server"))

        return $Col;
    }

    BuildAgentInfoCard(ClassColour, Title, Data, Icon) {
        const $infoCard = $(`<div class="status-info-card ${ClassColour}">
        <div class="status-info-card-main">${Title}:</div>
        <div class="status-info-card-secondary">${Data}</div>
        <div class="status-info-card-icon">
            <i class="fas ${Icon}"></i>
        </div>
    </div>`)

        return $infoCard;
    }

    BuildAgentProgressBar(AgentId, elID, Title) {
        return $(`<div id="${elID}_${AgentId}" class="circle">
        <strong></strong>
        <h6>${Title}</h6>
    </div>`)
    }

    BuildServerActionButton(AgentID, styleClass, action, icon, Text) {
        return $(`<div class='col-4'>
        <div class="d-grid gap-2">
        <button class='btn btn-${styleClass} btn-block server-action-btn' data-agent-id='${AgentID}' data-action='${action}'><i class="fas ${icon}"></i> ${Text}</button>
        </div>
        </div>`)
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

    getInstalledMods(Agent) {
        return new Promise((resolve, reject) => {
            if (Agent != null && Agent.running && Agent.active) {
                const postData = {
                    agentid: Agent.id
                }
                API_Proxy.postData("agent/modinfo/installed", postData).then(res => {
                    let resData = []
                    if (res.result == "success") {
                        resData = res.data;
                    }

                    return resData
                });
            }
        })
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
                logger.error(res.error);
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