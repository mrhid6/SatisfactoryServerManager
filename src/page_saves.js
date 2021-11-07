const API_Proxy = require("./api_proxy");
const Tools = require("../Mrhid6Utils/lib/tools");

const PageCache = require("./cache");

class Page_Settings {
    constructor() {
        this.Config = {};
        this.ServerState = {};
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    SetupEventHandlers() {
        PageCache.on("setactiveagent", () => {
            this.MainDisplayFunction();
        })
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

        $("#btn-save-upload").on("click", e => {
            e.preventDefault();
            this.uploadSaveFile();
        })

        $("body").on("click", ".remove-save-btn", e => {
            e.preventDefault();
            this.RemoveSave($(e.currentTarget));
        })

        $("body").on("click", ".download-save-btn", e => {
            e.preventDefault();
            this.DownloadSave($(e.currentTarget));
        })

        $("body").on("click", "#confirm-action", e => {
            e.preventDefault();
            const $btn = $(e.currentTarget)
            const Action = $btn.attr("data-action")
            if (Action == "remove-save") {
                this.RemoveSaveConfirmed($btn);
            }
        })

        $("body").on("click", "#cancel-action", e => {
            e.preventDefault();
            const $btn = $(e.currentTarget)

            $("#server-settings-confirm").find(".close").trigger("click")
        })

        $("body").on("click", "#cancel-action", e => {
            e.preventDefault();
            const $btn = $(e.currentTarget)

            $("#server-settings-confirm").find(".close").trigger("click")
        })
    }

    getConfig() {
        this.MainDisplayFunction();
    }

    MainDisplayFunction() {
        this.displaySaveTable();
    }

    displaySaveTable() {

        const isDataTable = $.fn.dataTable.isDataTable("#saves-table")

        const Agent = PageCache.getActiveAgent()

        const postData = {
            agentid: Agent.id
        }


        API_Proxy.postData("agent/gamesaves", postData).then(res => {
            console.log(res)
            $("#refresh-saves").prop("disabled", false);
            $("#refresh-saves").find("i").removeClass("fa-spin");

            const tableData = [];
            if (res.result == "success") {

                res.data.forEach(save => {
                    if (save.result == "failed") return;

                    let deleteSaveEl = $("<button/>")
                        .addClass("btn btn-danger float-right remove-save-btn")
                        .html("<i class='fas fa-trash'></i>")
                        .attr("data-save", save.savename);

                    let downloadSaveEl = $("<button/>")
                        .addClass("btn btn-primary float-left download-save-btn")
                        .html("<i class='fas fa-download'></i>")
                        .attr("data-save", save.savename);

                    const downloadSaveStr = downloadSaveEl.prop('outerHTML')
                    const deleteSaveStr = deleteSaveEl.prop('outerHTML')

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
                        downloadSaveStr + deleteSaveStr
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
        //$("#inp-save-file").prop("disabled", true);

        const formData = new FormData($("#save-upload-form")[0]);

        const Agent = PageCache.getActiveAgent()

        if (Agent == null) {
            toastr.error("Select A Server!");
            return;
        }

        API_Proxy.upload("agent/gamesaves/upload/" + Agent.id, formData).then(res => {
            if (res.result == "success") {
                toastr.success("Save has been uploaded!");
            } else {
                console.log(res.error)
                toastr.error("Save couldn't be uploaded!");
            }

            $("#btn-save-upload i").addClass("fa-upload").removeClass("fa-sync fa-spin")
            $("#btn-save-upload").prop("disabled", false);
            $("#inp-save-file").prop("disabled", false);
        })


    }

    RemoveSave(btn) {
        const SaveFile = btn.attr("data-save");

        Tools.openModal("/public/modals", "server-settings-confirm", $modalEl => {
            $modalEl.find("#confirm-action")
                .attr("data-action", "remove-save")
                .attr("data-save", SaveFile);
        })
    }

    RemoveSaveConfirmed(btn) {
        const SaveFile = btn.attr("data-save");

        const Agent = PageCache.getActiveAgent()

        const postData = {
            agentid: Agent.id,
            savefile: SaveFile
        }

        API_Proxy.postData("agent/gamesaves/delete", postData).then(res => {
            console.log(res);
        }).catch(err => {
            console.log(err)
        })
    }

    DownloadSave(btn) {
        const SaveFile = btn.attr("data-save");

        const Agent = PageCache.getActiveAgent()

        const postData = {
            agentid: Agent.id,
            savefile: SaveFile
        }

        API_Proxy.download("agent/gamesaves/download", postData).then(res => {
            console.log(res);
        }).catch(err => {
            console.log(err)
        })
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