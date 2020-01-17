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
            if (action == "new-session") {
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
        this.displaySaveTable();
    }

    displaySaveTable() {

        const isDataTable = $.fn.dataTable.isDataTable("#saves-table")
        const sfConfig = this.Config.satisfactory;

        if (sfConfig.save.file == "") {
            $("#current-save").text("No Save File Selected, Server will create a new world on start up.")
        } else {
            $("#current-save").text(sfConfig.save.file)
        }

        API_Proxy.get("info", "saves").then(res => {
            $("#refresh-saves").prop("disabled", false);
            $("#refresh-saves").find("i").removeClass("fa-spin");

            const tableData = [];
            if (res.result == "success") {

                res.data.forEach(save => {
                    if (save.result == "failed") return;

                    let useSaveEl = $("<button/>")
                        .addClass("btn btn-primary btn-block select-save-btn")
                        .text("Select Save")
                        .attr("data-save", save.savename);

                    if (save.savename == sfConfig.save.file) {
                        useSaveEl.prop("disabled", true).text("Active Save");
                    }
                    const useSaveStr = useSaveEl.prop('outerHTML')

                    const saveOptions = save.savebody.split("?");
                    const saveSessionName = saveOptions[2].split("=")[1];

                    tableData.push([
                        saveSessionName.trunc(25),
                        save.savename.trunc(40),
                        saveDate(save.last_modified),
                        useSaveStr
                    ])
                })

            }

            if (isDataTable == false) {
                $("#saves-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [
                        [2, "desc"]
                    ],
                    columnDefs: [{
                        type: 'date-euro',
                        targets: 2
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

    selectSave(savename) {
        const postData = {
            savename
        }

        API_Proxy.postData("/config/selectsave", postData).then(res => {

            if (res.result == "success") {
                this.getConfig();
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

    serverAction_NewSession(sessionName) {
        const postData = {
            sessionName
        }

        API_Proxy.postData("/config/newsession", postData).then(res => {
            if (res.result == "success") {
                this.getConfig();
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