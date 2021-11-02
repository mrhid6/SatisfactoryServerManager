const API_Proxy = require("./api_proxy");
const Tools = require("../Mrhid6Utils/lib/tools");
const PageCache = require("./cache");

class Page_Mods {
    constructor() {
        this.Mods_State = {};
        this.ServerState = {};

        this.FicsitModList = [];

        this.loaded = {
            ficsit_modlist: false
        }
    }

    init() {
        this.setupJqueryListeners();
        this.getSMLInfo();
        this.getModCount();
        this.getFicsitSMLVersion();
        this.getFicsitModList();

        this.waitTilLoaded().then(() => {
            this.displayModsTable();
        })
    }

    isLoaded() {
        if (this.loaded.ficsit_modlist == true) {
            return true;
        }
        return false;
    }

    waitTilLoaded() {
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (this.isLoaded() == true) {
                    clearInterval(interval);
                    resolve()
                }
            }, 20)
        })
    }

    setupJqueryListeners() {
        $("body").on("change", "#sel-add-mod-name", (e) => {
            this.getFicsitModInfo();
        }).on("change", "#sel-add-mod-version", (e) => {
            const $self = $(e.currentTarget);

            if ($self.val() == -1) {
                this.lockInstallModBtn();
            } else {
                this.unlockInstallModBtn();
            }
        }).on("click", ".btn-uninstall-mod", e => {
            if (this.ServerState.status != "stopped") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            const $self = $(e.currentTarget);
            this.uninstallMod($self)
        }).on("click", ".btn-update-mod", e => {
            if (this.ServerState.status != "stopped") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            const $self = $(e.currentTarget);
            this.updateModToLatest($self)
        });

        $("#btn-install-sml").click(e => {

            if (this.ServerState.status != "stopped") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            const $self = $(e.currentTarget);
            this.installSMLVersion($self);
        })

        $("#btn-install-mod").click(e => {

            if (this.ServerState.status != "stopped") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-error", (modal_el) => {
                    modal_el.find("#error-msg").text("Server needs to be stopped before making changes!")
                });
                return;
            }

            const $self = $(e.currentTarget);
            this.installModVersion($self);
        })
    }

    displayModsTable() {

        const isDataTable = $.fn.dataTable.isDataTable("#mods-table")

        API_Proxy.get("mods", "modsinstalled").then(res => {
            const tableData = [];
            if (res.result == "success") {
                for (let i = 0; i < res.data.length; i++) {
                    const mod = res.data[i];

                    const ficsitMod = this.FicsitModList.find(el => el.id == mod.id);

                    if (ficsitMod == null) continue;

                    const latestVersion = (mod.version == ficsitMod.latest_version)

                    const $btn_update = $("<button/>").addClass("btn btn-secondary btn-update-mod float-right")
                        .attr("data-modid", mod.id)
                        .attr("data-toggle", "tooltip")
                        .attr("data-placement", "bottom")
                        .attr("title", "Update Mod")
                        .html("<i class='fas fa-arrow-alt-circle-up'></i>")

                    // Create uninstall btn
                    const $btn_uninstall = $("<button/>")
                        .addClass("btn btn-danger btn-block btn-uninstall-mod")
                        .attr("data-modid", mod.id)
                        .html("<i class='fas fa-trash'></i> Uninstall");

                    const versionStr = mod.version + " " + ((latestVersion == false) ? $btn_update.prop("outerHTML") : "")
                    tableData.push([
                        mod.name,
                        versionStr,
                        $btn_uninstall.prop('outerHTML')
                    ])
                }
            }

            if (isDataTable == false) {
                $("#mods-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [
                        [0, "asc"]
                    ],
                    columnDefs: [{
                        "targets": 2,
                        "orderable": false
                    }],
                    data: tableData
                })
            } else {
                const datatable = $("#mods-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }

            $('[data-toggle="tooltip"]').tooltip()
        })
    }

    getSMLInfo() {
        API_Proxy.get("mods", "smlinfo").then(res => {
            const el = $(".sml-status");
            const el2 = $(".sml-version");
            if (res.result == "success") {
                this.Mods_State = res.data;
                if (res.data.state == "not_installed") {
                    el.text("Not Installed")
                    el2.text("Not Installed")
                } else {
                    el.text("Installed")
                    el2.text(res.data.version)
                }
            } else {
                el.text(res.error)
                el2.text("N/A")
            }
        });
    }

    getModCount() {
        API_Proxy.get("mods", "modsinstalled").then(res => {
            const el = $("#mod-count");
            if (res.result == "success") {
                el.text(res.data.length)
            } else {
                el.text(res.error)
            }
        })
    }

    getFicsitSMLVersion() {
        API_Proxy.get("ficsitinfo", "smlversions").then(res => {
            const el1 = $("#sel-install-sml-ver");
            const el2 = $(".sml-latest-version");
            if (res.result == "success") {
                el2.text(res.data[0].version);
                res.data.forEach(sml => {
                    el1.append("<option value='" + sml.version + "'>" + sml.version + "</option");
                })
            }
        });
    }

    getFicsitModList() {
        API_Proxy.get("ficsitinfo", "modslist").then(res => {
            const el = $("#sel-add-mod-name");
            if (res.result == "success") {
                this.FicsitModList = res.data;
                this.loaded.ficsit_modlist = true;
                res.data.forEach(mod => {
                    el.append("<option value='" + mod.id + "'>" + mod.name + "</option");
                })
            } else {
                console.log(res)
            }
        });
    }

    getFicsitModInfo() {
        const modid = $("#sel-add-mod-name").val();

        if (modid == "-1") {
            this.hideNewModInfo();
        } else {
            API_Proxy.get("ficsitinfo", "modinfo", modid).then(res => {
                this.showNewModInfo(res.data);
            });
        }
    }

    hideNewModInfo() {
        $("#add-mod-logo").attr("src", "/public/images/ssm_logo128_outline.png");
        $("#sel-add-mod-version").prop("disabled", true);
        $("#sel-add-mod-version").find('option').not(':first').remove();
        this.lockInstallModBtn()
    }

    showNewModInfo(data) {

        if (data.logo == "") {
            $("#add-mod-logo").attr("src", "https://ficsit.app/static/assets/images/no_image.png");
        } else {
            $("#add-mod-logo").attr("src", data.logo);
        }

        const sel_el = $("#sel-add-mod-version");
        sel_el.prop("disabled", false);
        sel_el.find('option').not(':first').remove();
        console.log(data);
        data.versions.forEach(mod_version => {
            sel_el.append("<option value='" + mod_version.version + "'>" + mod_version.version + "</option");
        })
    }

    installSMLVersion($btn) {
        $btn.prop("disabled", true);
        $btn.find("i").removeClass("fa-download").addClass("fa-sync fa-spin");
        $("input[name='radio-install-sml']").prop("disabled", true);

        const radioVal = $("input[name='radio-install-sml']:checked").val();
        const $selEl = $("#sel-install-sml-ver");
        $selEl.prop("disabled", true);

        let version = "latest";

        if (radioVal == 1) {
            if ($selEl.val() == -1) {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-error", (modal_el) => {
                    $btn.prop("disabled", false);
                    $btn.find("i").addClass("fa-download").removeClass("fa-sync fa-spin");
                    $selEl.prop("disabled", false);
                    $("input[name='radio-install-sml']").prop("disabled", false);

                    modal_el.find("#error-msg").text("Please select SML Version!")
                });
                return;
            } else {
                version = $selEl.val()
            }
        }

        const postData = {
            version
        }

        API_Proxy.postData("/mods/installsml", postData).then(res => {
            console.log(res);

            $btn.prop("disabled", false);
            $btn.find("i").addClass("fa-download").removeClass("fa-sync fa-spin");
            $selEl.prop("disabled", false);
            $("input[name='radio-install-sml']").prop("disabled", false);

            if (res.result == "success") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-success", (modal_el) => {
                    modal_el.find("#success-msg").text("SML has been installed!")
                    this.getSMLInfo();
                });
            } else {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-error", (modal_el) => {
                    modal_el.find("#error-msg").text(res.error)
                });
            }

        })
    }

    unlockInstallModBtn() {
        $("#btn-install-mod").prop("disabled", false);
    }

    lockInstallModBtn() {
        $("#btn-install-mod").prop("disabled", true);
    }

    installModVersion($btn) {
        $btn.prop("disabled", true);
        $btn.find("i").removeClass("fa-download").addClass("fa-sync fa-spin");

        const $selModEl = $("#sel-add-mod-name");
        const $selVersionEl = $("#sel-add-mod-version");

        $selModEl.prop("disabled", true);
        $selVersionEl.prop("disabled", true);

        const postData = {
            modid: $selModEl.val(),
            versionid: $selVersionEl.val()
        }

        API_Proxy.postData("/mods/installmod", postData).then(res => {
            console.log(res);

            $btn.prop("disabled", false);
            $btn.find("i").addClass("fa-download").removeClass("fa-sync fa-spin");
            $selModEl.prop("disabled", false);
            $selVersionEl.prop("disabled", false);

            if (res.result == "success") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-success", (modal_el) => {
                    modal_el.find("#success-msg").text("Mod has been installed!")
                    this.displayModsTable();
                    this.getModCount();
                });
            } else {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-error", (modal_el) => {
                    modal_el.find("#error-msg").text(res.error)
                });
            }

        });
    }

    uninstallMod($btn) {
        const modid = $btn.attr("data-modid");

        const postData = {
            modid: modid
        }

        API_Proxy.postData("/mods/uninstallmod", postData).then(res => {
            if (res.result == "success") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-success", (modal_el) => {
                    modal_el.find("#success-msg").text("Mod has been uninstalled!")
                    this.displayModsTable();
                    this.getModCount();
                });
            } else {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-error", (modal_el) => {
                    modal_el.find("#error-msg").text(res.error.message != "" ? res.error.message : res.error)
                });
                console.log(res)
            }
        })
    }

    updateModToLatest($btn) {
        const modid = $btn.attr("data-modid");

        const postData = {
            modid: modid
        }

        API_Proxy.postData("/mods/updatemod", postData).then(res => {
            if (res.result == "success") {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-success", (modal_el) => {
                    modal_el.find("#success-msg").text("Mod has been updated to the latest version!")
                    this.displayModsTable();
                    this.getModCount();
                });
            } else {
                if (Tools.modal_opened == true) return;
                Tools.openModal("/public/modals", "server-mods-error", (modal_el) => {
                    modal_el.find("#error-msg").text(res.error)
                });
            }
        })
    }
}

const page = new Page_Mods();

module.exports = page;