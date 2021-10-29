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

        $("#btn-save-upload").on("click", e => {
            e.preventDefault();
            this.uploadSaveFile();
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

        API_Proxy.get("gamesaves").then(res => {
            console.log(res)
            $("#refresh-saves").prop("disabled", false);
            $("#refresh-saves").find("i").removeClass("fa-spin");

            const tableData = [];
            if (res.result == "success") {

                res.data.forEach(save => {
                    if (save.result == "failed") return;

                    const $btn_info = $("<button/>")
                        .addClass("btn btn-light btn-block ")
                        .html("<i class='fas fa-search'></i>");

                    let useSaveEl = $("<button/>")
                        .addClass("btn btn-danger btn-block remove-save-btn")
                        .html("<i class='fas fa-trash'></i> Remove Save")
                        .attr("data-save", save.savename);

                    if (save.savename == sfConfig.save.file) {
                        useSaveEl.prop("disabled", true).text("Active Save");
                    }
                    const useSaveStr = useSaveEl.prop('outerHTML')

                    const saveOptions = save.savebody.split("?");
                    let saveSessionName = "Unknown";

                    for (let i = 0; i < saveOptions.length; i++) {
                        const option = saveOptions[i];
                        const optionData = option.split("=");

                        if (optionData[0] == "sessionName") {
                            saveSessionName = optionData[1];
                        }
                    }

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

    uploadSaveFile() {
        $("#btn-save-upload i").removeClass("fa-upload").addClass("fa-sync fa-spin")
        $("#btn-save-upload").prop("disabled", true);
        $("#inp-save-file").prop("disabled", true);

        const formData = new FormData($("#save-upload-form")[0]);

        API_Proxy.upload("gamesaves/upload", formData).then(res => {
            if (res.result == "success") {
                toastr.success("Save has been uploaded!");
            } else {
                toastr.error("Save couldn't be uploaded!");
            }

            $("#btn-save-upload i").addClass("fa-upload").removeClass("fa-sync fa-spin")
            $("#btn-save-upload").prop("disabled", false);
            $("#inp-save-file").prop("disabled", false);
        })


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