const API_Proxy = require("./api_proxy");

const logger = require("./logger");

class Page_Settings {
    constructor() {
        this._ROLES = [];
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();

        this.MainDisplayFunction();
    }

    SetupEventHandlers() {

    }

    setupJqueryListeners() {
        $("body").on("click", "#btn-addwebhook", e => {
                const $btn = $(e.currentTarget);
                this.OpenAddWebhookModal($btn);
            })
            .on("click", "#btn-generatedebug", e => {
                e.preventDefault();
                this.GenerateDebugInfo();
            })
            .on("click", ".download-debugreport-btn", e => {
                e.preventDefault();
                const $this = $(e.currentTarget);
                this.DownloadDebugReport($this.attr("data-debugreport-id"));
            })
            .on("click", ".remove-debugreport-btn", e => {
                e.preventDefault();
                const $this = $(e.currentTarget);
                this.RemoveDebugReport($this.attr("data-debugreport-id"));
            })
    }

    MainDisplayFunction() {
        this.DisplayUsersTable();
        this.DisplayDebugReportsTable();
    }

    DisplayUsersTable() {


        API_Proxy.get("info/webhooks").then(res => {

            const isDataTable = $.fn.dataTable.isDataTable("#webhooks-table")
            const tableData = [];

            const webhooks = res.data;
            console.log(webhooks)

            webhooks.forEach(webhook => {
                const $btn_info = $("<button/>")
                    .addClass("btn btn-light btn-block configure-webhook")
                    .attr("data-user-id", webhook.id)
                    .html("<i class='fas fa-cog'></i>");

                const OpenUserStr = $btn_info.prop('outerHTML')

                const $RunningIcon = $("<i/>").addClass("fas fa-2xl fa-circle-xmark text-danger")

                if (webhook.enabled == true) {
                    $RunningIcon.removeClass("fa-circle-xmark text-danger").addClass("fa-circle-check text-success")
                }

                const $typeIcon = $("<i/>").addClass("fa-brands fa-discord fa-2xl");

                if (webhook.type == 0) {
                    $typeIcon.removeClass("fa-brands fa-discord").addClass("fa-solid fa-bell")
                }

                tableData.push([
                    webhook.id,
                    webhook.name,
                    $RunningIcon.prop('outerHTML'),
                    $typeIcon.prop('outerHTML'),
                    OpenUserStr
                ])
            })

            console.log(tableData)

            if (isDataTable == false) {
                $("#webhooks-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [
                        [0, "asc"]
                    ],
                    columnDefs: [],
                    data: tableData
                })
            } else {
                const datatable = $("#webhooks-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        })
    }

    OpenAddWebhookModal(btn) {
        window.openModal("/public/modals", "add-webhook-modal", modal => {
            modal.find('#inp_webhook_enabled').bootstrapToggle()

            const events = [
                "ssm.startup",
                "ssm.shutdown",
                "agent.created",
                "agent.started",
                "agent.shutdown",
                "server.starting",
                "server.running",
                "server.stopping",
                "server.offline"
            ]

            const $webhookEventsDiv = modal.find("#webhook-events");

            events.forEach(webhook_event => {
                $webhookEventsDiv.append(`<div class="mb-2 event_wrapper">
                <div class="checkbox" style="display:inline-block;">
                    <input data-event-data="${webhook_event}" type="checkbox" data-on="Enabled" data-off="Disabled"
                        data-onstyle="success" data-offstyle="danger" data-toggle="toggle" data-width="100"
                        data-size="small">
                </div>
                <b class="ms-2 text-black">${webhook_event}</b>
                </div>`)
            })

            $webhookEventsDiv.find('input').bootstrapToggle()
        })
    }

    GenerateDebugInfo() {
        API_Proxy.postData("admin/generatedebugreport", {}).then(res => {
            if (res.result == "success") {
                toastr.success("Generated Debug Report!")
            } else {
                toastr.error("Failed To Generate Debug Report!")
                logger.error(res.error);
            }

            this.DisplayDebugReportsTable();
        })
    }

    DisplayDebugReportsTable() {
        API_Proxy.get("admin/debugreports").then(res => {

            const isDataTable = $.fn.dataTable.isDataTable("#debugreports-table")
            const tableData = [];

            const debugreports = res.data;

            debugreports.forEach(debugreport => {

                let deleteBackupEl = $("<button/>")
                    .addClass("btn btn-danger float-end remove-debugreport-btn")
                    .html("<i class='fas fa-trash'></i>")
                    .attr("data-debugreport-id", debugreport.dr_id)

                let downloadBackupEl = $("<button/>")
                    .addClass("btn btn-primary float-start download-debugreport-btn")
                    .html("<i class='fas fa-download'></i>")
                    .attr("data-debugreport-id", debugreport.dr_id)

                const downloadSaveStr = deleteBackupEl.prop('outerHTML')
                const deleteSaveStr = downloadBackupEl.prop('outerHTML')


                tableData.push([
                    debugreport.dr_id,
                    readableDate(parseInt(debugreport.dr_created)),
                    downloadSaveStr + deleteSaveStr
                ])
            })

            if (isDataTable == false) {
                $("#debugreports-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [
                        [1, "asc"]
                    ],
                    columnDefs: [],
                    data: tableData
                })
            } else {
                const datatable = $("#debugreports-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        })
    }

    DownloadDebugReport(id) {
        const postData = {
            debugreportid: id
        }

        API_Proxy.download("admin/debugreport/download", postData).then(res => {
            console.log(res);
        }).catch(err => {
            console.log(err)
        })
    }

    RemoveDebugReport(id) {
        const postData = {
            debugreportid: id
        }

        API_Proxy.postData("admin/debugreport/remove", postData).then(res => {
            if (res.result == "success") {
                toastr.success("Removed Debug Report!")
            } else {
                toastr.error("Failed To Remove Debug Report!")
                logger.error(res.error);
            }
            this.DisplayDebugReportsTable();
        })
    }
}

function readableDate(dateStr) {
    const date = new Date(dateStr)
    const day = date.getDate().pad(2);
    const month = (date.getMonth() + 1).pad(2);
    const year = date.getFullYear();

    const hour = date.getHours().pad(2);
    const min = date.getMinutes().pad(2);
    const sec = date.getSeconds().pad(2);

    return day + "/" + month + "/" + year + " " + hour + ":" + min + ":" + sec;
}

const page = new Page_Settings();

module.exports = page;