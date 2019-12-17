const API_Proxy = require("./api_proxy");
const Tools = require("../Mrhid6Utils/lib/tools");

class Page_Settings {
    constructor() {
        this.Config = {};
        this.ServerState = {};
    }

    init() {
        this.setupJqueryListeners();
        this.getConfig();
        this.getServerStatus();

        this.startPageInfoRefresh();
    }

    setupJqueryListeners() {
        $("#refresh-saves").click(e => {
            e.preventDefault();

            const $self = $(e.currentTarget);

            $self.prop("disabled", true);
            $self.find("i").addClass("fa-spin");

            this.displaySaveTable();
        });

        $("#edit-sf-settings").click(e => {
            e.preventDefault();

            if (this.ServerState.status != "stopped") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("server-settings-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            this.unlockSFSettings();
        })

        $("#save-sf-settings").click(e => {
            e.preventDefault();
            this.submitSettings();
        })

        $("#cancel-sf-settings").click(e => {
            e.preventDefault();
            this.lockSFSettings();
            this.getConfig();
        })
    }

    getConfig() {
        API_Proxy.get("config").then(res => {
            if (res.result == "success") {
                this.Config = res.data;
                this.MainDisplayFunction();
            }
        });
    }

    getServerStatus() {
        API_Proxy.get("serverstatus").then(res => {
            if (res.result == "success") {
                this.ServerState = res.data;
            }
        })
    }

    MainDisplayFunction() {
        this.displaySaveTable();
        this.populateSFSettings();
    }

    populateSFSettings() {
        const sfConfig = this.Config.satisfactory;
        $('#inp_sf_testmode').bootstrapToggle('enable')
        if (sfConfig.testmode == true) {
            $('#inp_sf_testmode').bootstrapToggle('on')
        } else {
            $('#inp_sf_testmode').bootstrapToggle('off')
        }
        $('#inp_sf_testmode').bootstrapToggle('disable')

        $("#inp_sf_serverloc").val(sfConfig.server_location)
        $("#inp_sf_saveloc").val(sfConfig.save.location)
    }

    displaySaveTable() {

        const isDataTable = $.fn.dataTable.isDataTable("#saves-table")

        API_Proxy.get("saves").then(res => {
            $("#refresh-saves").prop("disabled", false);
            $("#refresh-saves").find("i").removeClass("fa-spin");

            const tableData = [];
            if (res.result == "success") {

                for (let i = 0; i < res.data.length; i++) {
                    const save = res.data[i];

                    tableData.push([
                        save.savename,
                        saveDate(save.last_modified),
                        ""
                    ])
                }
            }

            if (isDataTable == false) {
                $("#saves-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [
                        [1, "desc"]
                    ],
                    columnDefs: [{
                        type: 'date-euro',
                        targets: 1
                    }],
                    data: tableData
                })
            } else {
                const datatable = $("#saves-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        })
    }

    unlockSFSettings() {

        $("#edit-sf-settings").prop("disabled", true);
        $("#refresh-saves").prop("disabled", true);

        $("#save-sf-settings").prop("disabled", false);
        $("#cancel-sf-settings").prop("disabled", false);
        $('#inp_sf_testmode').bootstrapToggle('enable');
        $("#inp_sf_serverloc").prop("disabled", false);
        $("#inp_sf_saveloc").prop("disabled", false);
    }

    lockSFSettings() {
        $("#edit-sf-settings").prop("disabled", false);
        $("#refresh-saves").prop("disabled", false);

        $("#save-sf-settings").prop("disabled", true);
        $("#cancel-sf-settings").prop("disabled", true);
        $('#inp_sf_testmode').bootstrapToggle('disable');
        $("#inp_sf_serverloc").prop("disabled", true);
        $("#inp_sf_saveloc").prop("disabled", true);
    }

    submitSettings() {
        const testmode = $('#inp_sf_testmode').is(":checked")
        const server_location = $("#inp_sf_serverloc").val();
        const save_location = $("#inp_sf_saveloc").val();
        const postData = {
            testmode,
            server_location,
            save_location
        }

        console.log(postData)

        API_Proxy.postData("/config/sfsettings", postData).then(res => {

            if (res.result == "success") {
                this.lockSFSettings();
                if (Tools.modal_opened == true) return;
                Tools.openModal("server-settings-success", (modal_el) => {
                    modal_el.find("#success-msg").text("Settings have been saved!")
                });
            } else {
                if (Tools.modal_opened == true) return;
                Tools.openModal("server-settings-error", (modal_el) => {
                    modal_el.find("#error-msg").text(res.error)
                });
            }
        });
    }

    startPageInfoRefresh() {
        setInterval(() => {
            this.getServerStatus();
        }, 5 * 1000);
    }
}

function saveDate(dateStr) {
    const date = new Date(dateStr)
    const day = date.getDate().pad(2);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const hour = date.getHours().pad(2);
    const min = date.getMinutes().pad(2);
    const sec = date.getSeconds().pad(2);

    return day + "/" + month + "/" + year + " " + hour + ":" + min + ":" + sec;
}

const page = new Page_Settings();

module.exports = page;