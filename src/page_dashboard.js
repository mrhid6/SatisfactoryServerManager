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

        $("body").on("click", ".server-action-btn", e => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const postData = {
                agentid: $btn.attr("data-agent-id"),
                action: $btn.attr("data-action")
            }
            console.log(postData)

            this.ExecuteServerAction(postData);
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

            if (PageCache.getAgentsList().length == 0) {
                $AgentWrapper.append(`
                <div class="alert alert-info">It looks there is no servers set up yet! Go to the <strong>Servers</strong> page to set up your first server.</div>
                `)
            }

            let $Row = $("<div/>").addClass("row");

            PageCache.getAgentsList().forEach((Agent, index) => {
                $Row.append(this.BuildAgentsUI(Agent));
            })

            $AgentWrapper.append($Row)

            PageCache.getAgentsList().forEach((Agent, index) => {
                const $Card = $(`#server-card-${Agent.id}`)
                this.ToggleActionsButtons(Agent, $Card)

            })

            this.DashboardBuilt = true;
        } else {
            PageCache.getAgentsList().forEach((Agent, index) => {
                const $Card = $(`#server-card-${Agent.id}`)
                this.UpdateAgentCardInfo(Agent);
                this.ToggleActionsButtons(Agent, $Card)

            })
        }
    }

    BuildAgentsUI(Agent) {
        console.log(Agent)

        const $Col = $("<div/>").addClass("col-12 col-md-6 col-lg-6 col-xl-3");

        const $Card = $("<div/>").addClass("card mb-3").attr("id", `server-card-${Agent.id}`);
        $Col.append($Card);

        const $CardHeader = $("<div/>").addClass("card-header");
        const $CardServerSettingsBtn = $(`<a class="float-end" href="/server/${Agent.id}"><button class="btn btn-primary"><i class='fas fa-cog'></i></button></a>`)
        $CardHeader.append($CardServerSettingsBtn)
        $CardHeader.append(`<h5>Server: ${Agent.displayname}</h5>`)
        $Card.append($CardHeader);

        const $CardBody = $("<div/>").addClass("card-body");
        $Card.append($CardBody);

        let StatusText = "Offline";
        let UsersText = 0;
        let ModCount = 0;

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

            ModCount = Agent.info.mods.length;
            UsersText = Agent.info.usercount;

        }

        const $StatusInfoCard = this.BuildAgentInfoCard("status", "blue", "Status", StatusText, "fa-server")
        $CardBody.append($StatusInfoCard)

        const $UsersInfoCard = this.BuildAgentInfoCard("users", "orange", "Users", UsersText, "fa-user")
        $CardBody.append($UsersInfoCard)

        const $ModsInfoCard = this.BuildAgentInfoCard("mods", "green", "Installed Mods", ModCount, "fa-pencil-ruler")
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

    BuildAgentInfoCard(ClassID, ClassColour, Title, Data, Icon) {
        const $infoCard = $(`<div class="status-info-card ${ClassColour} info-card-${ClassID}">
        <div class="status-info-card-main">${Title}:</div>
        <div class="status-info-card-secondary">${Data}</div>
        <div class="status-info-card-icon">
            <i class="fas ${Icon}"></i>
        </div>
    </div>`)

        return $infoCard;
    }

    BuildAgentProgressBar(AgentId, elID, Title) {
        return $(`<div class="circle ${elID}_${AgentId}">
        <strong></strong>
        <h6>${Title}</h6>
    </div>`)
    }

    BuildServerActionButton(AgentID, styleClass, action, icon, Text) {
        return $(`<div class='col-12 col-lg-4 mb-2'>
        <div class="d-grid  gap-2" data-bs-toggle="tooltip" data-bs-placement="bottom"
        title="Tooltip on bottom">
        <button class='btn btn-${styleClass} btn-block server-action-btn' data-agent-id='${AgentID}' data-action='${action}'><i class="fas ${icon}"></i> ${Text}</button>
        </div>
        </div>`)
    }

    UpdateAgentCardInfo(Agent) {
        const $Card = $(`#server-card-${Agent.id}`)

        let StatusText = "Offline";
        let UsersText = 0;
        let ModCount = 0;

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

            ModCount = Agent.info.mods.length;
            UsersText = Agent.info.usercount;

        }

        $Card.find(`.info-card-status .status-info-card-secondary`).text(StatusText);
        $Card.find(`.info-card-users .status-info-card-secondary`).text(UsersText);
        $Card.find(`.info-card-mods .status-info-card-secondary`).text(ModCount);

        const serverState = Agent.info.serverstate;
        let cpuPercent = 0;
        let memPercent = 0;
        if (serverState != null) {
            cpuPercent = (serverState.pcpu).toDecimal()
            memPercent = (serverState.pmem).toDecimal()
        }

        const $cpuProgress = $Card.find(`.cpu_progress_${Agent.id}`)
        $cpuProgress.circleProgress("value", cpuPercent / 100);

        const $memProgress = $Card.find(`.mem_progress_${Agent.id}`)
        $memProgress.circleProgress("value", memPercent / 100);

    }

    ToggleActionsButtons(Agent, $Card) {

        const $StartButton = $Card.find(".server-action-btn[data-action='start']");
        const $StopButton = $Card.find(".server-action-btn[data-action='stop']");
        const $KillButton = $Card.find(".server-action-btn[data-action='kill']");

        $StartButton.prop("disabled", true);
        $StopButton.prop("disabled", true);
        $KillButton.prop("disabled", true);

        $StartButton.parent().attr("title", "");
        $StopButton.parent().attr("title", "");
        $KillButton.parent().attr("title", "");



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
            $StartButton.parent().attr("title", "Server Not Online");
            $StopButton.parent().attr("title", "Server Not Online");
            $KillButton.parent().attr("title", "Server Not Online");
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


}

const page = new Page_Dashboard();

module.exports = page;