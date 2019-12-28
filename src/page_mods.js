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
        this.getFicsitSMLVersion();
        this.getFicsitModList();
    }

    setupJqueryListeners() {
        $("body").on("change", "#sel-add-mod-name", (e) => {
            this.getFicsitModInfo();
        })
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
            const el = $(".sml-status");
            const el2 = $(".sml-version");
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

    getFicsitSMLVersion() {
        API_Proxy.get("ficsit", "smlversions").then(res => {
            const el1 = $("#sel-install-sml-ver");
            const el2 = $(".sml-latest-version");
            if (res.result == "success") {
                el2.text(res.data[0].version);
                res.data.forEach(sml => {
                    el1.append("<option value='" + sml.id + "'>" + sml.version + "</option");
                })
            }
        });
    }

    getFicsitModList() {
        API_Proxy.get("ficsit", "modslist").then(res => {
            const el = $("#sel-add-mod-name");
            if (res.result == "success") {
                res.data.forEach(mod => {
                    el.append("<option value='" + mod.id + "'>" + mod.name + "</option");
                })
            }
        });
    }

    getFicsitModInfo() {
        const modid = $("#sel-add-mod-name").val();

        if (modid == "-1") {
            this.hideNewModInfo();
        } else {
            API_Proxy.get("ficsit", "modinfo", modid).then(res => {
                this.showNewModInfo(res.data);
            });
        }
    }

    hideNewModInfo() {
        $("#add-mod-logo").attr("src", "/public/images/ssm_logo128_outline.png");
        $("#sel-add-mod-version").prop("disabled", true);
        $("#sel-add-mod-version").find('option').not(':first').remove();
        console.log("Hide Mod Info!")
    }

    showNewModInfo(data) {
        $("#add-mod-logo").attr("src", data.logo);
        const sel_el = $("#sel-add-mod-version");
        sel_el.prop("disabled", false);
        sel_el.find('option').not(':first').remove();
        console.log(data);
        data.versions.forEach(mod_version => {
            sel_el.append("<option value='" + mod_version.id + "'>" + mod_version.version + "</option");
        })
        console.log("Show Mod Info!")
    }
}

const page = new Page_Mods();

module.exports = page;