const API_Proxy = require("./api_proxy");

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
    }

    MainDisplayFunction() {
        this.DisplayUsersTable();
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
        window.openModal("/public/modals", "add-user-modal", modal => {
            const $roleSelect = modal.find("#sel_role")

            this._ROLES.forEach(role => {
                $roleSelect.append(`<option value='${role.id}'>${role.name}</option>`)
            })
        })
    }
}

const page = new Page_Settings();

module.exports = page;