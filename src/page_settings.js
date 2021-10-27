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

        $("#edit-ssm-settings").click(e => {
            e.preventDefault();

            if (this.ServerState.status != "stopped") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("server-settings-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            this.unlockSSMSettings();
        })

        $("#save-ssm-settings").click(e => {
            e.preventDefault();
            this.submitSSMSettings();
        })

        $("#cancel-ssm-settings").click(e => {
            e.preventDefault();
            this.lockSSMSettings();
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

        $("body").on("click", ".select-save-btn", (e) => {
            const $self = $(e.currentTarget);
            const savename = $self.attr("data-save");

            if (this.ServerState.status != "stopped") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("server-settings-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            this.selectSave(savename);
        })

        $("#new-session-name").click(e => {
            e.preventDefault();
            Tools.openModal("server-session-new", (modal_el) => {
                modal_el.find("#confirm-action").attr("data-action", "new-session")
            });
        })

        $("body").on("click", "#cancel-action", (e) => {
            $("#server-session-new .close").trigger("click");
            Tools.modal_opened = false;
        })

        $("body").on("click", "#confirm-action", (e) => {
            const $btnel = $(e.currentTarget);
            const action = $btnel.attr("data-action");

            if (action == "stop" || action == "kill") {
                $("#server-action-confirm .close").trigger("click");
                Tools.modal_opened = false;
                this.serverAction_Stop(action);
            } else if (action == "new-session") {
                this.serverAction_NewSession($("#inp_new_session_name").val());

                $("#server-session-new .close").trigger("click");
                Tools.modal_opened = false;
            }
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
        API_Proxy.get("info", "serverstatus").then(res => {
            if (res.result == "success") {
                this.ServerState = res.data;
            }
        })
    }

    MainDisplayFunction() {
        this.populateSSMSettings();
        this.populateModsSettings();
    }

    populateSSMSettings() {
        const ssmConfig = this.Config.satisfactory;
        $("#inp_sf_serverloc").val(ssmConfig.server_location)
        $("#inp_sf_saveloc").val(ssmConfig.save.location)
        $("#inp_sf_logloc").val(ssmConfig.log.location)

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

        $('#inp_mods_autoupdate').bootstrapToggle('enable')
        if (modsConfig.autoupdate == true) {
            $('#inp_mods_autoupdate').bootstrapToggle('on')
        } else {
            $('#inp_mods_autoupdate').bootstrapToggle('off')
        }
        $('#inp_mods_autoupdate').bootstrapToggle('disable')

    }

    unlockSSMSettings() {

        $("#edit-ssm-settings").prop("disabled", true);

        $("#save-ssm-settings").prop("disabled", false);
        $("#cancel-ssm-settings").prop("disabled", false);
        $('#inp_sf_testmode').bootstrapToggle('enable');
        $("#inp_sf_serverloc").prop("disabled", false);
        $("#inp_sf_saveloc").prop("disabled", false);
    }

    lockSSMSettings() {
        $("#edit-ssm-settings").prop("disabled", false);

        $("#save-ssm-settings").prop("disabled", true);
        $("#cancel-ssm-settings").prop("disabled", true);
        $('#inp_sf_testmode').bootstrapToggle('disable');
        $("#inp_sf_serverloc").prop("disabled", true);
        $("#inp_sf_saveloc").prop("disabled", true);
    }

    unlockModsSettings() {

        $("#edit-mods-settings").prop("disabled", true);

        $("#save-mods-settings").prop("disabled", false);
        $("#cancel-mods-settings").prop("disabled", false);
        $('#inp_mods_enabled').bootstrapToggle('enable');
        $('#inp_mods_autoupdate').bootstrapToggle('enable')
    }

    lockModsSettings() {
        $("#edit-mods-settings").prop("disabled", false);

        $("#save-mods-settings").prop("disabled", true);
        $("#cancel-mods-settings").prop("disabled", true);
        $('#inp_mods_enabled').bootstrapToggle('disable');
        $('#inp_mods_autoupdate').bootstrapToggle('disable')
    }

    submitSSMSettings() {
        const testmode = $('#inp_sf_testmode').is(":checked")
        const server_location = $("#inp_sf_serverloc").val();
        const save_location = $("#inp_sf_saveloc").val();
        const postData = {
            testmode: false,
            server_location,
            save_location
        }

        API_Proxy.postData("/config/ssmsettings", postData).then(res => {

            if (res.result == "success") {
                this.lockSSMSettings();
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
        const autoupdate = $('#inp_mods_autoupdate').is(":checked")
        const postData = {
            enabled,
            autoupdate
        }

        API_Proxy.postData("/config/modssettings", postData).then(res => {
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
    const month = (date.getMonth() + 1).pad(2);
    const year = date.getFullYear();

    const hour = date.getHours().pad(2);
    const min = date.getMinutes().pad(2);
    const sec = date.getSeconds().pad(2);

    return day + "/" + month + "/" + year + " " + hour + ":" + min + ":" + sec;
}

const page = new Page_Settings();

module.exports = page;