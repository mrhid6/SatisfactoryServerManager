const API_Proxy = require("./api_proxy");
const Tools = require("../Mrhid6Utils/lib/tools");

const PageCache = require("./cache");

class Page_Backups {
    constructor() {
        this._ROLES = [];
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    SetupEventHandlers() {
        PageCache.on("setactiveagent", () => {
            this.MainDisplayFunction();
        })
    }

    setupJqueryListeners() {}

    MainDisplayFunction() {
        this.DisplayBackupsTable();
    }

    DisplayBackupsTable() {

        const Agent = PageCache.getActiveAgent()

        const postData = {
            agentid: Agent.id
        }

        API_Proxy.postData("agent/backups", postData).then(res => {

            const isDataTable = $.fn.dataTable.isDataTable("#backups-table")
            const tableData = [];

            const backups = res.data;

            if (backups != null && backups.length > 0) {
                let index = 0;
                backups.forEach(backup => {
                    const $btn_info = $("<button/>")
                        .addClass("btn btn-light btn-block delete-backup")
                        .attr("data-backup-index", index)
                        .html("<i class='fas fa-trash'></i>");

                    const OpenUserStr = $btn_info.prop('outerHTML')

                    tableData.push([
                        backup.filename,
                        backup.created,
                        backup.size,
                        OpenUserStr
                    ])
                    index++;
                })
            }

            if (isDataTable == false) {
                $("#backups-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [
                        [0, "desc"]
                    ],
                    columnDefs: [],
                    data: tableData
                })
            } else {
                const datatable = $("#backups-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        })
    }
}

const page = new Page_Backups();

module.exports = page;