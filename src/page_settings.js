const API_Proxy = require("./api_proxy");
const Tools = require("../Mrhid6Utils/lib/tools");

const PageCache = require("./cache");

class Page_Settings {
    constructor() {
        this.Config = {};
    }

    init() {
        this.LockAllEditButtons();
        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    SetupEventHandlers() {
        PageCache.on("setactiveagent", () => {
            this.MainDisplayFunction();
        })
    }

    setupJqueryListeners() {

        $("#edit-ssm-settings").click(e => {
            e.preventDefault();

            const Agent = PageCache.getActiveAgent();
            if (Agent.info.serverstate != null && Agent.info.serverstate.status == "running") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-settings-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            this.unlockSSMSettings();
        })

        $("#save-ssm-settings").on("click", e => {
            e.preventDefault();
            this.submitSSMSettings();
        })

        $("#cancel-ssm-settings").on("click", e => {
            e.preventDefault();
            this.lockSSMSettings();
            this.getConfig();
        })

        $("#edit-mods-settings").on("click", e => {
            e.preventDefault();

            const Agent = PageCache.getActiveAgent();
            if (Agent.info.serverstate != null && Agent.info.serverstate.status == "running") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-settings-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            this.unlockModsSettings();
        })

        $("#cancel-mods-settings").on("click", e => {
            e.preventDefault();
            this.lockModsSettings();
            this.getConfig();
        })

        $("#save-mods-settings").on("click", e => {
            e.preventDefault();
            this.submitModsSettings();
        })

        $("#edit-sf-settings").on("click", e => {
            e.preventDefault();

            const Agent = PageCache.getActiveAgent();
            if (Agent.info.serverstate != null && Agent.info.serverstate.status == "running") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-settings-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            this.unlockSFSettings();
        })

        $("#cancel-sf-settings").on("click", e => {
            e.preventDefault();
            this.lockSFSettings();
            this.getConfig();
        })

        $("#save-sf-settings").on("click", e => {
            e.preventDefault();
            this.submitSFSettings();
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

        $("#settings-dangerarea-installsf").on("click", e => {
            e.preventDefault();
            this.installSFServer();
        })

        $("#inp_maxplayers").on("input change", () => {
            const val = $("#inp_maxplayers").val();
            $("#max-players-value").text(`${val} / 500`)
        })
    }

    LockAllEditButtons() {
        $("i.fa-edit").parent().prop("disabled", true)
        $("#settings-dangerarea-installsf").prop("disabled", true)
    }

    UnlockAllEditButtons() {
        $("i.fa-edit").parent().prop("disabled", false)
        $("#settings-dangerarea-installsf").prop("disabled", false)
    }

    MainDisplayFunction() {
        this.LockAllEditButtons();
        this.clearAllValues();

        const Agent = PageCache.getActiveAgent();
        if (Agent != null && Agent.info.config != null) {
            this.UnlockAllEditButtons();
            this.populateSSMSettings();
            this.populateSFSettings();
            this.populateModsSettings();
        }
    }

    clearAllValues() {
        $("#inp_sf_serverloc").val("")
        $("#inp_sf_saveloc").val("")
        $("#inp_sf_logloc").val("")
        $("#inp_sf_logloc").val("")
        $('#inp_updatesfonstart').bootstrapToggle('enable')
        $('#inp_updatesfonstart').bootstrapToggle('off')
        $('#inp_updatesfonstart').bootstrapToggle('disable')

        $("#inp_maxplayers").val(0);
        $("#max-players-value").text(`0 / 500`)

        $('#inp_mods_enabled').bootstrapToggle('enable')
        $('#inp_mods_enabled').bootstrapToggle('off')
        $('#inp_mods_enabled').bootstrapToggle('disable')

        $('#inp_mods_autoupdate').bootstrapToggle('enable')
        $('#inp_mods_autoupdate').bootstrapToggle('off')
        $('#inp_mods_autoupdate').bootstrapToggle('disable')
    }

    populateSSMSettings() {
        const Agent = PageCache.getActiveAgent();

        const ssmConfig = Agent.info.config.satisfactory;
        $("#setting-info-serverloc").text(ssmConfig.server_location)
        $("#setting-info-saveloc").text(ssmConfig.save.location)
        $("#setting-info-logloc").text(ssmConfig.log.location)

        $('#inp_updatesfonstart').bootstrapToggle('enable')
        if (ssmConfig.updateonstart == true) {
            $('#inp_updatesfonstart').bootstrapToggle('on')
        } else {
            $('#inp_updatesfonstart').bootstrapToggle('off')
        }
        $('#inp_updatesfonstart').bootstrapToggle('disable')

    }

    populateSFSettings() {
        const Agent = PageCache.getActiveAgent();
        if (Agent.info.serverstate.status != "notinstalled") {
            const gameConfig = Agent.info.config.game;
            $("#inp_maxplayers").val(gameConfig.Game["/Script/Engine"].GameSession.MaxPlayers)
            const val = $("#inp_maxplayers").val();
            $("#max-players-value").text(`${val} / 500`)
        } else {
            $("#edit-sf-settings").prop("disabled", true)
        }
    }

    populateModsSettings() {
        const Agent = PageCache.getActiveAgent();
        const modsConfig = Agent.info.config.mods;
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
        $('#inp_updatesfonstart').bootstrapToggle('enable');
    }

    lockSSMSettings() {
        $("#edit-ssm-settings").prop("disabled", false);

        $("#save-ssm-settings").prop("disabled", true);
        $("#cancel-ssm-settings").prop("disabled", true);
        $('#inp_updatesfonstart').bootstrapToggle('disable');
        $("#inp_sf_serverloc").prop("disabled", true);
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

    unlockSFSettings() {

        $("#edit-sf-settings").prop("disabled", true);

        $("#save-sf-settings").prop("disabled", false);
        $("#cancel-sf-settings").prop("disabled", false);
        $("#inp_maxplayers").prop("disabled", false);
    }

    lockSFSettings() {
        $("#edit-sf-settings").prop("disabled", false);

        $("#save-sf-settings").prop("disabled", true);
        $("#cancel-sf-settings").prop("disabled", true);
        $("#inp_maxplayers").prop("disabled", true);
    }

    submitSSMSettings() {
        const Agent = PageCache.getActiveAgent();

        const updatesfonstart = $('#inp_updatesfonstart').is(":checked")
        const postData = {
            agentid: Agent.id,
            updatesfonstart
        }

        API_Proxy.postData("agent/config/ssmsettings", postData).then(res => {

            if (res.result == "success") {
                this.lockSSMSettings();
                toastr.success("Settings have been saved!")
            } else {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-settings-error", (modal_el) => {
                    console.log(JSON.stringify(res.error));
                    modal_el.find("#error-msg").text(res.error.message != null ? res.error.message : res.error);
                });
            }
        });
    }

    submitSFSettings() {
        const Agent = PageCache.getActiveAgent();
        const maxplayers = $('#inp_maxplayers').val();
        const postData = {
            agentid: Agent.id,
            maxplayers
        }

        API_Proxy.postData("agent/config/sfsettings", postData).then(res => {

            if (res.result == "success") {
                this.lockSFSettings();
                toastr.success("Settings have been saved!")
            } else {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-settings-error", (modal_el) => {
                    console.log(JSON.stringify(res.error));
                    modal_el.find("#error-msg").text(res.error.message != null ? res.error.message : res.error);
                });
            }
        });
    }

    submitModsSettings() {
        const Agent = PageCache.getActiveAgent();
        const enabled = $('#inp_mods_enabled').is(":checked")
        const autoupdate = $('#inp_mods_autoupdate').is(":checked")
        const postData = {
            agentid: Agent.id,
            enabled,
            autoupdate
        }

        API_Proxy.postData("agent/config/modsettings", postData).then(res => {
            if (res.result == "success") {
                this.lockModsSettings();
                toastr.success("Settings have been saved!")
            } else {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-settings-error", (modal_el) => {
                    modal_el.find("#error-msg").text(res.error)
                });
            }
        });
    }

    installSFServer() {
        const Agent = PageCache.getActiveAgent();

        if (Tools.modal_opened == true) return;
        Tools.openModal("/public/modals", "server-action-installsf", () => {

            const postData = {
                agentid: Agent.id,
            }

            API_Proxy.postData("agent/serveractions/installsf", postData).then(res => {
                console.log(res)
                if (res.result == "success") {
                    toastr.success("Server has been installed!")
                    $("#server-action-installsf .close").trigger("click");
                } else {
                    $("#server-action-installsf").remove();

                    Tools.openModal("/public/modals", "server-settings-error", (modal_el) => {
                        modal_el.find("#error-msg").text(res.error.message)
                    });
                }
            })
        });
    }
}

const page = new Page_Settings();

module.exports = page;