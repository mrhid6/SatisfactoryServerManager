const API_Proxy = require("./api_proxy");

const Tools = require("../Mrhid6Utils/lib/tools");

class Page_Dashboard {
    constructor() {
        this.ServerState = {}
    }

    init() {

        this.setupJqueryListeners();
        this.getServerStatus()
        this.getModCount();


        this.startPageInfoRefresh();

    }

    setupJqueryListeners() {
        $("#server-action-start").click((e) => {
            this.serverAction_Start();
        })

        $("#server-action-stop").click((e) => {
            this.serverAction_Confirm("stop");
        })

        $("#server-action-kill").click((e) => {
            this.serverAction_Confirm("kill");
        })

        $("body").on("click", "#confirm-action", (e) => {
            const $btnel = $(e.currentTarget);
            const action = $btnel.attr("data-action");

            if (action == "stop" || action == "kill") {
                $("#server-action-confirm .close").trigger("click");
                Tools.modal_opened = false;
                this.serverAction_Stop(action);
            }
        })
    }

    getServerStatus() {
        API_Proxy.get("serverstatus").then(res => {
            console.log(res);
            const el = $("#server-status");
            if (res.result == "success") {
                this.ServerState = res.data;
                this.ToggleServerActionButtons();

                if (res.data.status == "stopped") {
                    el.text("Not Running")
                } else {
                    el.text("Running")
                }

                $("#cpu-usage div").width((res.data.pcpu).toDecimal() + "%")
                $("#ram-usage div").width((res.data.pmem).toDecimal() + "%")

            } else {
                el.text("Server Error!")
            }
        })
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

    ToggleServerActionButtons() {
        if (this.ServerState.status == "stopped") {
            $("#server-action-start").prop("disabled", false);
            $("#server-action-stop").prop("disabled", true);
            $("#server-action-kill").prop("disabled", true);
        } else {
            $("#server-action-start").prop("disabled", true);
            $("#server-action-stop").prop("disabled", false);
            $("#server-action-kill").prop("disabled", false);
        }
    }

    serverAction_Confirm(action) {
        if (Tools.modal_opened == true) return;
        Tools.openModal("server-action-confirm", (modal_el) => {
            modal_el.find("#confirm-action").attr("data-action", action)
        });
    }

    serverAction_Start() {
        if (this.ServerState.status == "stopped") {
            API_Proxy.post("serveraction", "start").then(res => {
                if (Tools.modal_opened == true) return;
                if (res.result == "success") {
                    this.getServerStatus();
                    Tools.openModal("server-action-success", (modal_el) => {
                        modal_el.find("#success-msg").text("Server has been started!")
                    });
                } else {
                    Tools.openModal("server-action-error", (modal_el) => {
                        modal_el.find("#error-msg").text(res.error)
                    });
                }
            })
        } else {

            if (Tools.modal_opened == true) return;
            Tools.openModal("server-action-error", (modal_el) => {
                modal_el.find("#error-msg").text("Error: The server is already started!")
            });
        }
    }

    serverAction_Stop(stopAction) {
        if (this.ServerState.status != "stopped") {
            API_Proxy.post("serveraction", stopAction).then(res => {

                if (Tools.modal_opened == true) return;
                if (res.result == "success") {
                    this.getServerStatus();
                    Tools.openModal("server-action-success", (modal_el) => {
                        modal_el.find("#success-msg").text("Server has been stopped!")
                    });

                } else {
                    Tools.openModal("server-action-error", (modal_el) => {
                        modal_el.find("#error-msg").text(res.error)
                    });
                }
            })
        } else {

            if (Tools.modal_opened == true) return;
            Tools.openModal("server-action-error", (modal_el) => {
                modal_el.find("#error-msg").text("Error: The server is already stopped!")
            });
        }
    }

    startPageInfoRefresh() {
        setInterval(() => {
            this.getServerStatus();
            this.getModCount();
        }, 20 * 1000);
    }
}

const page = new Page_Dashboard();

module.exports = page;