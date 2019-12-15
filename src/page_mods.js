const API_Proxy = require("./api_proxy");


class Page_Mods {
    constructor() {
        this.Mods_State = {};
    }

    init() {
        this.setupJqueryListeners();
        this.getSMLVersion();
        this.getModCount();
        this.displayModsTable();
    }

    setupJqueryListeners() {

    }

    displayModsTable() {

        const isDataTable = $.fn.dataTable.isDataTable("#mods-table")

        API_Proxy.get("modsinstalled").then(res => {
            const tableData = [];
            if (res.result == "success") {
                for (let i = 0; i < res.data.length; i++) {
                    const mod = res.data[i];
                    tableData.push([
                        mod.name,
                        mod.id,
                        mod.version
                    ])
                }
            }

            if (isDataTable == false) {
                $("#mods-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [
                        [0, "asc"]
                    ],
                    data: tableData
                })
            } else {
                const datatable = $("#mods-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        })
    }

    getSMLVersion() {
        API_Proxy.get("smlversion").then(res => {
            const el = $("#sml-status");
            const el2 = $("#sml-version");
            if (res.result == "success") {
                this.Mods_State = res.data;
                if (res.data.state == "not_installed") {
                    el.text("Not Installed")
                    el2.text("Not Installed")
                } else {
                    el.text("Installed")
                    el2.text(res.data.version)
                }
            } else {
                el.text(res.error)
                el2.text("N/A")
            }
        });
    }

    getModCount() {
        API_Proxy.get("modsinstalled").then(res => {
            const el = $("#mod-count");
            if (res.result == "success") {
                el.text(res.data.length)
            } else {
                el.text(res.error)
            }
        })
    }


}

const page = new Page_Mods();

module.exports = page;