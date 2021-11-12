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

        $("#edit-ssm-settings").on("click", e => {
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

    LockAllEditButtons() {
        $("i.fa-edit").parent().prop("disabled", true)
        $("#settings-dangerarea-installsf").prop("disabled", true)
    }

    UnlockAllEditButtons() {
        $("i.fa-edit").parent().prop("disabled", false)
        $("#settings-dangerarea-installsf").prop("disabled", false)
    }

    MainDisplayFunction() {

        if (
            $("#edit-ssm-settings").prop("disabled") == false
        ) {
            return;
        }

        this.LockAllEditButtons();
        this.clearAllValues();

        const Agent = PageCache.getActiveAgent();
        if (Agent != null && Agent.info.config != null) {
            this.UnlockAllEditButtons();
            this.populateSSMSettings();
        }
    }

    clearAllValues() {

    }

    populateSSMSettings() {
        const Agent = PageCache.getActiveAgent();

        const ssmConfig = Agent.info.config.satisfactory;
    }

    unlockSSMSettings() {
        $("#edit-ssm-settings").prop("disabled", true);
        $("#save-ssm-settings").prop("disabled", false);
        $("#cancel-ssm-settings").prop("disabled", false);
    }

    lockSSMSettings() {
        $("#edit-ssm-settings").prop("disabled", false);
        $("#save-ssm-settings").prop("disabled", true);
        $("#cancel-ssm-settings").prop("disabled", true);
    }

    submitSSMSettings() {
        this.lockSSMSettings();
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