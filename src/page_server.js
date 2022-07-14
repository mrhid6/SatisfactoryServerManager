const PageCache = require("./cache");
const Logger = require("./logger");
const API_Proxy = require("./api_proxy");

class Page_Server {

    init() {
        this.SetupEventHandlers();
        this.setupJqueryListeners();

        this.agentid = parseInt($(".page-container").attr("data-agentid"));
        this.Agent = PageCache.getAgentsList().find(agent => agent.id == this.agentid);
    }

    SetupEventHandlers() {
        PageCache.on("setagentslist", () => {
            this.Agent = PageCache.getAgentsList().find(agent => agent.id == this.agentid);
            this.DisplayServerInfo();
        })
    }

    setupJqueryListeners() {
        $("#edit-backup-settings").click(e => {
            e.preventDefault();
            this.unlockBackupSettings();
        })

        $("#save-backup-settings").on("click", e => {
            e.preventDefault();
            this.submitBackupSettings();
        })

        $("#cancel-backup-settings").on("click", e => {
            e.preventDefault();
            this.lockBackupSettings();
        })


        $("#edit-sf-settings").on("click", e => {
            e.preventDefault();

            const Agent = this.Agent;
            if (Agent.info.serverstate != null && Agent.info.serverstate.status == "running") {

                window.openModal("/public/modals", "server-settings-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            this.unlockSFSettings();
        })

        $("#cancel-sf-settings").on("click", e => {
            e.preventDefault();
            this.lockSFSettings();
        })

        $("#save-sf-settings").on("click", e => {
            e.preventDefault();
            this.submitSFSettings();
        })

        $("#edit-mods-settings").on("click", e => {
            e.preventDefault();

            const Agent = PageCache.getActiveAgent();
            if (Agent.info.serverstate != null && Agent.info.serverstate.status == "running") {

                window.openModal("/public/modals", "server-settings-error", (modal_el) => {
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


        $("#inp_maxplayers").on("input change", () => {
            const val = $("#inp_maxplayers").val();
            $("#max-players-value").text(`${val} / 500`)
        })

        $("#settings-dangerarea-installsf").on("click", e => {
            e.preventDefault();
            this.installSFServer();
        })

        $("#server-dangerarea-delete").on("click", e => {
            e.preventDefault();
            this.OpenConfirmDeleteModal();
        })

        $("#server-dangerarea-update").on("click", e => {
            e.preventDefault();
            this.OpenConfirmUpdateModal();
        })

        $("body").on("click", "#confirm-action", e => {
            const $btn = $(e.currentTarget);

            const action = $btn.attr("data-action");

            if (action == "delete-server") {
                $("#server-action-confirm .close").trigger("click")
                this.DeleteAgent();
            }
            if (action == "update-server") {
                $("#server-action-confirm .close").trigger("click")
                this.UpdateAgent();
            }
        })
    }

    DisplayServerInfo() {


        this.LockAllEditButtons();
        this.UnlockAllEditButtons();

        $("#agent-publicip").text(window.location.hostname)


        if (this.Agent.running == false || this.Agent.active == false) {
            $("#agent-connectionport").text("Server Not Active!")
            $("#setting-info-serverloc").text("Server Not Active!")
            $("#setting-info-saveloc").text("Server Not Active!")
            $("#setting-info-logloc").text("Server Not Active!")
            $("#backup-location").text("Server Not Active!")
            $("#sfserver-version").text("Server Not Active!")
            return;
        }
        const sfConfig = this.Agent.info.config.satisfactory;
        const ssmConfig = this.Agent.info.config.ssm;

        $("#agent-connectionport").text(this.Agent.ports.ServerQueryPort)
        $("#setting-info-serverloc").text(sfConfig.server_location)
        $("#setting-info-saveloc").text(sfConfig.save.location)
        $("#setting-info-logloc").text(sfConfig.log.location)
        $("#backup-location").text(ssmConfig.backup.location)
        $("#sfserver-version").text(sfConfig.server_version)

        if ($("#edit-backup-settings").prop("disabled") == false) {
            $("#inp_backup-interval").val(ssmConfig.backup.interval);
            $("#inp_backup-keep").val(ssmConfig.backup.keep);
        }

        if ($("#edit-sf-settings").prop("disabled") == false) {
            this.populateSFSettings()
        }

        if ($("#edit-mods-settings").prop("disabled") == false) {
            this.populateModsSettings()
        }

        const date = new Date(ssmConfig.backup.nextbackup);
        const day = date.getDate().pad(2);
        const month = date.getMonthName();
        const year = date.getFullYear();

        const hour = date.getHours().pad(2);
        const min = date.getMinutes().pad(2);
        const sec = date.getSeconds().pad(2);

        const dateStr = `${day} ${month} ${year} ${hour}:${min}:${sec}`;
        $("#backup-nextbackup").text(dateStr);
    }

    LockAllEditButtons() {
        const Agent = this.Agent;

        if (Agent.running == false || Agent.active == false) {
            $("i.fa-edit").parent().prop("disabled", true)
            $("#settings-dangerarea-installsf").prop("disabled", true)
        }
    }

    UnlockAllEditButtons() {
        const Agent = this.Agent;
        if (Agent.running == true && Agent.active == true) {
            $("i.fa-edit").parent().each((index, el) => {
                if ($(el).attr("data-editing") == false) {
                    $(el).prop("disabled", false)
                }
            })

            $("#settings-dangerarea-installsf").prop("disabled", false)
        }
    }

    unlockBackupSettings() {

        $("#edit-backup-settings").prop("disabled", true).attr("data-editing", true);
        $("#save-backup-settings").prop("disabled", false);
        $("#cancel-backup-settings").prop("disabled", false);
        $("#inp_backup-interval").prop("disabled", false);
        $("#inp_backup-keep").prop("disabled", false);
    }

    lockBackupSettings() {
        $("#edit-backup-settings").prop("disabled", false).attr("data-editing", false);
        $("#save-backup-settings").prop("disabled", true);
        $("#cancel-backup-settings").prop("disabled", true);
        $("#inp_backup-interval").prop("disabled", true);
        $("#inp_backup-keep").prop("disabled", true);
    }

    submitBackupSettings() {

        const interval = $('#inp_backup-interval').val();
        const keep = $('#inp_backup-keep').val();

        const postData = {
            agentid: this.Agent.id,
            interval,
            keep
        }

        API_Proxy.postData("agent/config/backupsettings", postData).then(res => {

            if (res.result == "success") {
                this.lockBackupSettings();
                toastr.success("Settings Saved!")
            } else {
                toastr.error("Failed To Save Settings!")
                Logger.error(res.error);
            }
        });
    }

    populateSFSettings() {
        const Agent = this.Agent;
        const ssmConfig = Agent.info.config.satisfactory;

        $('#inp_updatesfonstart').bootstrapToggle('enable')
        if (ssmConfig.updateonstart == true) {
            $('#inp_updatesfonstart').bootstrapToggle('on')
        } else {
            $('#inp_updatesfonstart').bootstrapToggle('off')
        }
        $('#inp_updatesfonstart').bootstrapToggle('disable')

        if (Agent.info.serverstate.status != "notinstalled") {
            const gameConfig = Agent.info.config.game;
            $("#inp_maxplayers").val(gameConfig.Game["/Script/Engine"].GameSession.MaxPlayers)
            const val = $("#inp_maxplayers").val();
            $("#max-players-value").text(`${val} / 500`)

            $("#inp_workerthreads").val(ssmConfig.worker_threads)
        } else {
            $("#edit-sf-settings").prop("disabled", true)
        }
    }

    unlockSFSettings() {

        $("#edit-sf-settings").prop("disabled", true).attr("data-editing", true);

        $("#save-sf-settings").prop("disabled", false);
        $("#cancel-sf-settings").prop("disabled", false);
        $("#inp_maxplayers").prop("disabled", false);
        $("#inp_workerthreads").prop("disabled", false);
        $('#inp_updatesfonstart').bootstrapToggle('enable');
    }

    lockSFSettings() {
        $("#edit-sf-settings").prop("disabled", false).attr("data-editing", false);

        $("#save-sf-settings").prop("disabled", true);
        $("#cancel-sf-settings").prop("disabled", true);
        $("#inp_maxplayers").prop("disabled", true);
        $("#inp_workerthreads").prop("disabled", true);
        $('#inp_updatesfonstart').bootstrapToggle('disable');
    }

    submitSFSettings() {
        const Agent = this.Agent;
        const maxplayers = $('#inp_maxplayers').val();
        const workerthreads = $('#inp_workerthreads').val();
        const updatesfonstart = $('#inp_updatesfonstart').is(":checked")

        const postData = {
            agentid: Agent.id,
            maxplayers,
            updatesfonstart,
            workerthreads
        }

        API_Proxy.postData("agent/config/sfsettings", postData).then(res => {

            if (res.result == "success") {
                this.lockSFSettings()
                toastr.success("Settings Saved!")
            } else {
                toastr.error("Failed To Save Settings!")
                Logger.error(res.error);
            }
        });
    }

    populateModsSettings() {
        const Agent = this.Agent;
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

    unlockModsSettings() {

        $("#edit-mods-settings").prop("disabled", true).attr("data-editing", true);

        $("#save-mods-settings").prop("disabled", false);
        $("#cancel-mods-settings").prop("disabled", false);
        $('#inp_mods_enabled').bootstrapToggle('enable');
        $('#inp_mods_autoupdate').bootstrapToggle('enable')
    }

    lockModsSettings() {
        $("#edit-mods-settings").prop("disabled", false).attr("data-editing", false);

        $("#save-mods-settings").prop("disabled", true);
        $("#cancel-mods-settings").prop("disabled", true);
        $('#inp_mods_enabled').bootstrapToggle('disable');
        $('#inp_mods_autoupdate').bootstrapToggle('disable')
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
                toastr.success("Settings Saved!")
            } else {
                toastr.error("Failed To Save Settings!")
                Logger.error(res.error);
            }
        });
    }

    installSFServer() {
        const Agent = this.Agent;
        window.openModal("/public/modals", "server-action-installsf", () => {

            const postData = {
                agentid: Agent.id,
            }

            API_Proxy.postData("agent/serveractions/installsf", postData).then(res => {
                if (res.result == "success") {
                    toastr.success("Server has been installed!")
                    $("#server-action-installsf .close").trigger("click");
                } else {
                    $("#server-action-installsf .close").trigger("click");

                    toastr.error("Failed To Install Server!")
                    Logger.error(res.error);
                }
            })
        });

    }

    OpenConfirmDeleteModal() {
        window.openModal("/public/modals", "server-action-confirm", modal => {
            modal.find("#confirm-action").attr("data-action", "delete-server");
        })
    }

    OpenConfirmUpdateModal() {
        window.openModal("/public/modals", "server-action-confirm", modal => {
            modal.find("#confirm-action").attr("data-action", "update-server");
        })
    }

    DeleteAgent() {
        const postData = {
            agentid: this.agentid
        }

        API_Proxy.postData("agent/delete", postData).then(res => {
            if (res.result == "success") {
                toastr.success("Server Has Been Deleted!")

                setTimeout(() => {
                    window.redirect("/servers")
                }, 10000);
            } else {
                toastr.error("Failed To Delete Server!")
                Logger.error(res.error);
            }
        })
    }

    UpdateAgent() {
        const postData = {
            agentid: this.agentid
        }

        API_Proxy.postData("agent/update", postData).then(res => {
            if (res.result == "success") {
                toastr.success("Server Has Been Updated!")

                setTimeout(() => {
                    window.redirect("/servers")
                }, 10000);
            } else {
                toastr.error("Failed To Update Server!")
                Logger.error(res.error);
            }
        })
    }
}



const page = new Page_Server();

module.exports = page;