const API_Proxy = require("./api_proxy");

const Tools = require("../Mrhid6Utils/lib/tools");

class Page_Servers {
    constructor() {
        this.ServerState = {}
    }

    init() {

        this.setupJqueryListeners();
        this.getAgentList();
        this.startPageInfoRefresh();

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
        })
    }

    getAgentList() {
        API_Proxy.get("agent", "agents").then(res => {
            this._Agents = res.data;
            this.DisplayAgentsTable();
        })
    }

    DisplayAgentsTable() {
        const isDataTable = $.fn.dataTable.isDataTable("#agents-table")
        const tableData = [];
        this._Agents.forEach(agent => {
            const $AgentLink = $("<a/>").attr("href", `/agent/${agent.id}`)
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
                agent.name,
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
        }).then(() => {
            this.getAgentList();
        })
    }

    StopDockerAgent(id) {
        API_Proxy.postData("agent/stop", {
            id: id
        }).then(() => {
            this.getAgentList();
        })
    }

    startPageInfoRefresh() {
        setInterval(() => {
            this.getAgentList()
        }, 5 * 1000);
    }

}

const page = new Page_Servers();

module.exports = page;