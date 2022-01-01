const API_Proxy = require("./api_proxy");

const Tools = require("../Mrhid6Utils/lib/tools");
const PageCache = require("./cache");
const Logger = require("./logger");

class Page_Servers {
    constructor() {}

    init() {

        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    setupJqueryListeners() {
        $("body").on("click", ".btn-startstop-docker", e => {
            e.preventDefault();

            const $button = $(e.currentTarget);

            if ($button.attr("data-action") == "start") {
                this.StartDockerAgent($button.attr("data-agentid"));
            } else {
                this.StopDockerAgent($button.attr("data-agentid"));
            }
        }).on("click", "#submit-create-server-btn", e => {
            this.CreateNewServer();
        })

        $("#btn-createserver").on("click", e => {
            e.preventDefault()
            this.OpenCreateServerModal();
            //this.CreateNewServer();
        })
    }

    SetupEventHandlers() {
        PageCache.on("setagentslist", () => {
            this.DisplayAgentsTable();
        })
    }

    DisplayAgentsTable() {
        const isDataTable = $.fn.dataTable.isDataTable("#agents-table")
        const tableData = [];
        PageCache.getAgentsList().forEach(agent => {
            const $AgentLink = $("<a/>").attr("href", `/server/${agent.id}`)
            const $btn_info = $("<button/>")
                .addClass("btn btn-light")
                .html("<i class='fas fa-cog'></i>");

            $AgentLink.append($btn_info)
            const OpenAgentStr = $AgentLink.prop('outerHTML')

            const $btn_stopstart = $("<button/>")
                .addClass("btn btn-success ml-3")
                .html("<i class='fas fa-play'></i>")
                .attr("data-action", "start")
                .attr("data-agentid", `${agent.id}`)
                .addClass("btn-startstop-docker")

            if (agent.running == true) {
                $btn_stopstart.attr("data-action", "stop")
                    .removeClass("btn-success").addClass("btn-danger");
                $btn_stopstart.find("i").removeClass("fa-play").addClass("fa-stop");
            }

            const OptionStr = OpenAgentStr + $btn_stopstart.prop('outerHTML')

            const $RunningIcon = $("<i/>").addClass("fas fa-times text-danger")
            const $ActiveIcon = $("<i/>").addClass("fas fa-times text-danger")

            if (agent.running == true) {
                $RunningIcon.removeClass("fa-times text-danger").addClass("fa-check text-success")
            }

            if (agent.active == true) {
                $ActiveIcon.removeClass("fa-times text-danger").addClass("fa-check text-success")
            }

            tableData.push([
                agent.displayname,
                $RunningIcon.prop('outerHTML'),
                $ActiveIcon.prop('outerHTML'),
                (agent.info.version || "Unknown"),
                OptionStr
            ])
        })

        if (isDataTable == false) {
            $("#agents-table").DataTable({
                paging: true,
                searching: false,
                info: false,
                order: [
                    [2, "desc"]
                ],
                columnDefs: [{
                    type: 'date-euro',
                    targets: 2
                }],
                data: tableData
            })
        } else {
            const datatable = $("#agents-table").DataTable();
            datatable.clear();
            datatable.rows.add(tableData);
            datatable.draw();
        }
    }

    StartDockerAgent(id) {
        API_Proxy.postData("agent/start", {
            id: id
        }).then(res => {
            if (res.result == "success") {
                toastr.success("Server Started!")
            } else {
                toastr.error("Failed to start server")
                Logger.error(res.error);
            }
        })
    }

    StopDockerAgent(id) {
        API_Proxy.postData("agent/stop", {
            id: id
        }).then(res => {
            if (res.result == "success") {
                toastr.success("Server Stopped!")
            } else {
                toastr.error("Failed to stop server")
                Logger.error(res.error);
            }
        })
    }

    OpenCreateServerModal() {
        Tools.openModal("/public/modals", "create-server-modal", modal => {})
    }

    CreateNewServer() {
        const postData = {
            name: $("#inp_servername").val(),
            port: parseInt($("#inp_serverport").val())
        }

        if (postData.name == "" || postData.port < 15777) {
            $("#create-server-error").removeClass("hidden").text("Error: Server Name Is Required And Server Port must be more than 15776")
            return;
        }

        $("#create-server-modal .close").trigger("click");

        API_Proxy.postData("agent/create", postData).then(res => {
            if (res.result == "success") {
                toastr.success("Server created!")
            } else {
                toastr.error("Failed to create server")
                Logger.error(res.error);
            }
        })
    }

}

const page = new Page_Servers();

module.exports = page;