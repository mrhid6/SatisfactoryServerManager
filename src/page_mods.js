const API_Proxy = require("./api_proxy");


class Page_Mods {
    constructor() {}

    init() {
        this.setupJqueryListeners();
        this.displayModsTable();
    }

    setupJqueryListeners() {

    }

    displayModsTable() {

        const isDataTable = $.fn.dataTable.isDataTable("#mods-table")

        API_Proxy.get("modsinstalled").then(res => {
            if (res.result == "success") {
                const data = [];
                for (let i = 0; i < res.data.length; i++) {
                    const mod = res.data[i];
                    data.push([
                        mod.name,
                        mod.id,
                        mod.version
                    ])
                }

                if (isDataTable == false) {
                    $("#mods-table").DataTable({
                        paging: true,
                        searching: false,
                        info: false,
                        order: [
                            [0, "asc"]
                        ],
                        data: data
                    })
                } else {
                    const datatable = $("#mods-table").DataTable();
                    datatable.clear();
                    datatable.rows.add(data);
                    datatable.draw();
                }
            }
        })
    }

}

const page = new Page_Mods();

module.exports = page;