const Tools = require("../Mrhid6Utils/lib/tools");
const PageCache = require("./cache");
const logger = require("./logger");

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
    }

    DisplayServerInfo() {
        console.log(this.Agent)

        $("#agent-publicip").text(window.location.hostname)
        $("#agent-connectionport").text(this.Agent.ports.ServerQueryPort)
    }


    unlockBackupSettings() {

        $("#edit-backup-settings").prop("disabled", true);
        $("#save-backup-settings").prop("disabled", false);
        $("#cancel-backup-settings").prop("disabled", false);
        $("#inp_backup-interval").prop("disabled", false);
        $("#inp_backup-keep").prop("disabled", false);
    }

    lockBackupSettings() {
        $("#edit-backup-settings").prop("disabled", false);
        $("#save-backup-settings").prop("disabled", true);
        $("#cancel-backup-settings").prop("disabled", true);
        $("#inp_backup-interval").prop("disabled", true);
        $("#inp_backup-keep").prop("disabled", true);
    }

    submitBackupSettings() {
        this.lockBackupSettings();
    }

}

const page = new Page_Server();

module.exports = page;