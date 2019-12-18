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

        $("#show-sf-password").click(e => {
            const $this = $(e.currentTarget);
            if ($this.hasClass("fa-eye")) {
                $("#inp_sf_password").attr("type", "text")
                $this.attr("data-original-title", "Hide Password")
                $this.removeClass("fa-eye").addClass("fa-eye-slash")
            } else {
                $("#inp_sf_password").attr("type", "password")
                $this.attr("data-original-title", "Show Password")
                $this.removeClass("fa-eye-slash").addClass("fa-eye");
            }
        })

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
            this.submitSFSettings();
        })

        $("#cancel-sf-settings").click(e => {
            e.preventDefault();
            this.lockSFSettings();
            this.getConfig();
        })

        $("#edit-mods-settings").click(e => {
            e.preventDefault();

            if (this.ServerState.status != "stopped") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("server-settings-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            this.unlockModsSettings();
        })

        $("#cancel-mods-settings").click(e => {
            e.preventDefault();
            this.lockModsSettings();
            this.getConfig();
        })

        $("#save-mods-settings").click(e => {
            e.preventDefault();
            this.submitModsSettings();
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
        this.populateModsSettings();
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
        $("#inp_sf_password").val(sfConfig.password)
        $("#inp_sf_saveloc").val(sfConfig.save.location)
    }

    populateModsSettings() {
        const modsConfig = this.Config.mods;
        $('#inp_mods_enabled').bootstrapToggle('enable')
        if (modsConfig.enabled == true) {
            $('#inp_mods_enabled').bootstrapToggle('on')
        } else {
            $('#inp_mods_enabled').bootstrapToggle('off')
        }
        $('#inp_mods_enabled').bootstrapToggle('disable')

        $("#inp_mods_sml").val(modsConfig.SMLauncher_location)
        $("#inp_mods_loc").val(modsConfig.location)
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
        $("#inp_sf_password").prop("disabled", false);
        $("#inp_sf_saveloc").prop("disabled", false);
    }

    lockSFSettings() {
        $("#edit-sf-settings").prop("disabled", false);
        $("#refresh-saves").prop("disabled", false);

        $("#save-sf-settings").prop("disabled", true);
        $("#cancel-sf-settings").prop("disabled", true);
        $('#inp_sf_testmode').bootstrapToggle('disable');
        $("#inp_sf_serverloc").prop("disabled", true);
        $("#inp_sf_password").prop("disabled", true);
        $("#inp_sf_saveloc").prop("disabled", true);
    }

    unlockModsSettings() {

        $("#edit-mods-settings").prop("disabled", true);

        $("#save-mods-settings").prop("disabled", false);
        $("#cancel-mods-settings").prop("disabled", false);
        $('#inp_mods_enabled').bootstrapToggle('enable');
        $("#inp_mods_sml").prop("disabled", false);
        $("#inp_mods_loc").prop("disabled", false);
    }

    lockModsSettings() {
        $("#edit-mods-settings").prop("disabled", false);

        $("#save-mods-settings").prop("disabled", true);
        $("#cancel-mods-settings").prop("disabled", true);
        $('#inp_mods_enabled').bootstrapToggle('disable');
        $("#inp_mods_sml").prop("disabled", true);
        $("#inp_mods_loc").prop("disabled", true);
    }

    submitSFSettings() {
        const testmode = $('#inp_sf_testmode').is(":checked")
        const server_location = $("#inp_sf_serverloc").val();
        const server_password = $("#inp_sf_password").val();
        const save_location = $("#inp_sf_saveloc").val();
        const postData = {
            testmode,
            server_location,
            server_password,
            save_location
        }

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

    submitModsSettings() {
        const enabled = $('#inp_mods_enabled').is(":checked")
        const sml_location = $("#inp_mods_sml").val();
        const mods_location = $("#inp_mods_loc").val();
        const postData = {
            enabled,
            sml_location,
            mods_location
        }

        console.log(postData)

        API_Proxy.postData("/config/modssettings", postData).then(res => {
            console.log(res)
            if (res.result == "success") {
                this.lockModsSettings();
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