const API_Proxy = require("./api_proxy");
const Tools = require("../Mrhid6Utils/lib/tools");

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
        $("body").on("click", "#btn-adduser", e => {
            const $btn = $(e.currentTarget);
            this.OpenAddUserModal($btn);
        })
    }

    MainDisplayFunction() {
        this.DisplayUsersTable();
        this.DisplayRolesTable();
    }

    DisplayUsersTable() {


        API_Proxy.get("info/users").then(res => {

            const isDataTable = $.fn.dataTable.isDataTable("#users-table")
            const tableData = [];

            const users = res.data;

            users.forEach(user => {
                const $btn_info = $("<button/>")
                    .addClass("btn btn-light btn-block configure-user")
                    .attr("data-user-id", user.id)
                    .html("<i class='fas fa-cog'></i>");

                const OpenUserStr = $btn_info.prop('outerHTML')

                tableData.push([
                    user.id,
                    user.username,
                    user.role.name,
                    OpenUserStr
                ])
            })

            console.log(tableData)

            if (isDataTable == false) {
                $("#users-table").DataTable({
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
                const datatable = $("#users-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        })
    }

    DisplayRolesTable() {


        API_Proxy.get("info/roles").then(res => {

            const isDataTable = $.fn.dataTable.isDataTable("#roles-table")
            const tableData = [];

            const roles = res.data;
            this._ROLES = roles;

            roles.forEach(role => {
                const $btn_info = $("<button/>")
                    .addClass("btn btn-light btn-block configure-role")
                    .attr("data-role-id", role.id)
                    .html("<i class='fas fa-cog'></i>");

                const OpenUserStr = $btn_info.prop('outerHTML')

                tableData.push([
                    role.id,
                    role.name,
                    role.permissions.length,
                    OpenUserStr
                ])
            })

            console.log(tableData)

            if (isDataTable == false) {
                $("#roles-table").DataTable({
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
                const datatable = $("#roles-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        })
    }

    OpenAddUserModal(btn) {
        Tools.openModal("/public/modals", "add-user-modal", modal => {
            const $roleSelect = modal.find("#sel_role")

            this._ROLES.forEach(role => {
                $roleSelect.append(`<option value='${role.id}'>${role.name}</option>`)
            })
        })
    }
}

const page = new Page_Settings();

module.exports = page;