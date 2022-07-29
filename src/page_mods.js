const API_Proxy = require("./api_proxy");
const PageCache = require("./cache");

class Page_Mods {
    constructor() {
        this.Agent = null;
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    SetupEventHandlers() {
        PageCache.on("setsmlversions", () => {
            this.displayFicsitSMLVersions();
        });

        PageCache.on("setficsitmods", () => {
            this.displayFicsitModList();
            this.displayInstalledMods();
        });

        PageCache.on("setinstalledmods", () => {
            this.displayInstalledMods();
        });

        PageCache.on("setactiveagent", () => {
            this.MainDisplayFunction();
        });
    }

    setupJqueryListeners() {
        $("body")
            .on("change", "#sel-add-mod-name", (e) => {
                this.getFicsitModInfo();
            })
            .on("change", "#sel-add-mod-version", (e) => {
                const $self = $(e.currentTarget);

                if ($self.val() == -1) {
                    this.lockInstallModBtn();
                } else {
                    this.unlockInstallModBtn();
                }
            })
            .on("click", ".btn-uninstall-mod", (e) => {
                if (this.CheckServerIsRunning() == false) {
                    const $self = $(e.currentTarget);
                    this.uninstallMod($self);
                }
            })
            .on("click", ".btn-update-mod", (e) => {
                if (this.CheckServerIsRunning() == false) {
                    const $self = $(e.currentTarget);
                    this.updateModToLatest($self);
                }
            });

        $("#btn-install-sml").on("click", (e) => {
            if (this.CheckServerIsRunning() == false) {
                const $self = $(e.currentTarget);
                this.installSMLVersion($self);
            }
        });

        $("#btn-install-mod").on("click", (e) => {
            if (this.CheckServerIsRunning() == false) {
                const $self = $(e.currentTarget);
                this.installModVersion($self);
            }
        });
    }

    MainDisplayFunction() {
        const ActiveAgent = PageCache.getActiveAgent();

        if (this.Agent != null && this.Agent.id == ActiveAgent.id) {
            return;
        }

        console.log("Is Different!");

        this.Agent = ActiveAgent;

        this.LockAllInputs();

        if (this.Agent == null) {
            return;
        }

        this.getFicsitSMLVersions();
        this.getFicsitModList();

        if (this.Agent.running == true && this.Agent.active == true) {
            this.UnlockAllInputs();
            this.getInstalledMods();
            this.getSMLInfo();
        } else {
            PageCache.SetAgentInstalledMods([]);

            $("#mod-count").text("Server Not Running!");
            $(".sml-status").text("Server Not Running!");
        }
    }

    CheckServerIsRunning() {
        const Agent = PageCache.getActiveAgent();
        if (Agent.info.serverstate.status == "running") {
            window.openModal(
                "/public/modals",
                "server-mods-error",
                (modal_el) => {
                    modal_el
                        .find("#error-msg")
                        .text(
                            "Server needs to be stopped before making changes!"
                        );
                }
            );
            return true;
        }

        return false;
    }

    LockAllInputs() {
        $("#radio-install-sml1").prop("disabled", true);
        $("#radio-install-sml2").prop("disabled", true);
        $("#sel-install-sml-ver").prop("disabled", true);
        $("#btn-install-sml").prop("disabled", true);
        $("#sel-add-mod-name").prop("disabled", true);
        $("#sel-add-mod-version").prop("disabled", true);
    }

    UnlockAllInputs() {
        $("#radio-install-sml1").prop("disabled", false);
        $("#radio-install-sml2").prop("disabled", false);
        $("#sel-install-sml-ver").prop("disabled", false);
        $("#btn-install-sml").prop("disabled", false);
        $("#sel-add-mod-name").prop("disabled", false);
    }

    getInstalledMods() {
        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
        };
        API_Proxy.postData("agent/modinfo/installed", postData).then((res) => {
            if (res.result == "success") {
                console.log(res);
                PageCache.SetAgentInstalledMods(res.data);
            } else {
                PageCache.SetAgentInstalledMods([]);
            }
        });
    }

    displayInstalledMods() {
        if (PageCache.getFicsitMods().length == 0) {
            return;
        }

        const isDataTable = $.fn.dataTable.isDataTable("#mods-table");
        const installedMods = PageCache.getAgentInstalledMods();
        const Agent = PageCache.getActiveAgent();

        if (Agent.running == true && Agent.active == true) {
            const $ModCountEl = $("#mod-count");
            $ModCountEl.text(installedMods.length);
        }

        const tableData = [];
        for (let i = 0; i < installedMods.length; i++) {
            const mod = installedMods[i];

            const ficsitMod = PageCache.getFicsitMods().find(
                (el) => el.mod_reference == mod.mod_reference
            );
            console.log(ficsitMod);
            const latestVersion = mod.version == ficsitMod.latestVersion;

            const $btn_update = $("<button/>")
                .addClass("btn btn-secondary btn-update-mod float-right")
                .attr("data-modid", mod.mod_reference)
                .attr("data-toggle", "tooltip")
                .attr("data-placement", "bottom")
                .attr("title", "Update Mod")
                .html("<i class='fas fa-arrow-alt-circle-up'></i>");

            // Create uninstall btn
            const $btn_uninstall = $("<button/>")
                .addClass("btn btn-danger btn-block btn-uninstall-mod")
                .attr("data-modid", mod.mod_reference)
                .html("<i class='fas fa-trash'></i> Uninstall");

            const versionStr =
                mod.version +
                " " +
                (latestVersion == false ? $btn_update.prop("outerHTML") : "");
            tableData.push([
                mod.name,
                versionStr,
                $btn_uninstall.prop("outerHTML"),
            ]);
        }

        if (isDataTable == false) {
            $("#mods-table").DataTable({
                paging: true,
                searching: false,
                info: false,
                order: [[0, "asc"]],
                columnDefs: [
                    {
                        targets: 2,
                        orderable: false,
                    },
                ],
                data: tableData,
            });
        } else {
            const datatable = $("#mods-table").DataTable();
            datatable.clear();
            datatable.rows.add(tableData);
            datatable.draw();
        }

        $('[data-toggle="tooltip"]').tooltip();
    }

    getSMLInfo() {
        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
        };

        API_Proxy.postData("agent/modinfo/smlinfo", postData).then((res) => {
            const el = $(".sml-status");
            const el2 = $(".sml-version");
            console.log(res);
            if (res.result == "success") {
                if (res.data.state == "not_installed") {
                    el.text("Not Installed");
                    el2.text("Not Installed");
                } else {
                    el.text("Installed");
                    el2.text(res.data.version);
                }
            } else {
                el.text("Unknown");
                el2.text("N/A");
            }
        });
    }

    getFicsitSMLVersions() {
        API_Proxy.get("ficsitinfo", "smlversions").then((res) => {
            if (res.result == "success") {
                //console.log(res.data.versions)
                PageCache.setSMLVersions(res.data.versions);
            }
        });
    }

    displayFicsitSMLVersions() {
        const el1 = $("#sel-install-sml-ver");
        const el2 = $(".sml-latest-version");
        el2.text(PageCache.getSMLVersions()[0].version);
        PageCache.getSMLVersions().forEach((sml) => {
            el1.append(
                "<option value='" +
                    sml.version +
                    "'>" +
                    sml.version +
                    "</option"
            );
        });
    }

    getFicsitModList() {
        if (PageCache.getFicsitMods().length > 0) {
            PageCache.emit("setficsitmods");
            return;
        }

        API_Proxy.get("ficsitinfo", "modslist").then((res) => {
            console.log(res.data);
            if (res.result == "success") {
                PageCache.setFicsitMods(res.data);
            } else {
                console.log(res);
            }
        });
    }

    displayFicsitModList() {
        const el = $("#sel-add-mod-name");
        PageCache.getFicsitMods().forEach((mod) => {
            el.append(
                "<option value='" +
                    mod.mod_reference +
                    "'>" +
                    mod.name +
                    "</option"
            );
        });
    }

    getFicsitModInfo() {
        const modid = $("#sel-add-mod-name").val();

        if (modid == "-1") {
            this.hideNewModInfo();
        } else {
            API_Proxy.get("ficsitinfo", "modinfo", modid).then((res) => {
                this.showNewModInfo(res.data);
            });
        }
    }

    hideNewModInfo() {
        $("#add-mod-logo").attr(
            "src",
            "/public/images/ssm_logo128_outline.png"
        );
        $("#sel-add-mod-version").prop("disabled", true);
        $("#sel-add-mod-version").find("option").not(":first").remove();
        this.lockInstallModBtn();
    }

    showNewModInfo(data) {
        console.log(data);
        if (data.logo == "") {
            $("#add-mod-logo").attr(
                "src",
                "https://ficsit.app/static/assets/images/no_image.png"
            );
        } else {
            $("#add-mod-logo").attr("src", data.logo);
        }

        const sel_el = $("#sel-add-mod-version");
        sel_el.prop("disabled", false);
        sel_el.find("option").not(":first").remove();
        data.versions.forEach((mod_version) => {
            sel_el.append(
                "<option value='" +
                    mod_version.version +
                    "'>" +
                    mod_version.version +
                    "</option"
            );
        });
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
                toastr.error("Please Select A SML Version!");
                return;
            } else {
                version = $selEl.val();
            }
        }

        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
            action: "installsml",
            version,
        };

        API_Proxy.postData("agent/modaction", postData).then((res) => {
            console.log(res);

            $btn.prop("disabled", false);
            $btn.find("i")
                .addClass("fa-download")
                .removeClass("fa-sync fa-spin");
            $selEl.prop("disabled", false);
            $("input[name='radio-install-sml']").prop("disabled", false);

            if (res.result == "success") {
                toastr.success("Successfully installed SML");
            } else {
                toastr.error("Failed to install SML");
            }

            this.getInstalledMods();
            this.getSMLInfo();
        });
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

        const modVersion = $selVersionEl.val();

        if (modVersion == -1) {
            $selModEl.prop("disabled", false);
            $selVersionEl.prop("disabled", false);

            toastr.error("Please Select A Mod Version!");
            return;
        }

        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
            action: "installmod",
            modReference: $selModEl.val(),
            versionid: modVersion,
        };

        API_Proxy.postData("agent/modaction", postData).then((res) => {
            $btn.prop("disabled", false);
            $btn.find("i")
                .addClass("fa-download")
                .removeClass("fa-sync fa-spin");
            $selModEl.prop("disabled", false);
            $selVersionEl.prop("disabled", false);

            if (res.result == "success") {
                toastr.success("Successfully installed Mod");
            } else {
                toastr.error("Failed to install Mod");
            }
            this.getInstalledMods();
        });
    }

    uninstallMod($btn) {
        const modid = $btn.attr("data-modid");

        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
            action: "uninstallmod",
            modReference: modid,
        };

        API_Proxy.postData("agent/modaction", postData).then((res) => {
            if (res.result == "success") {
                toastr.success("Successfully uninstalled Mod");
            } else {
                toastr.error("Failed to uninstall Mod");
            }
            this.getInstalledMods();
        });
    }

    updateModToLatest($btn) {
        const modid = $btn.attr("data-modid");

        const Agent = PageCache.getActiveAgent();
        const postData = {
            agentid: Agent.id,
            action: "updatemod",
            modReference: modid,
        };

        API_Proxy.postData("agent/modaction", postData).then((res) => {
            if (res.result == "success") {
                toastr.success("Successfully updated Mod");
            } else {
                toastr.error("Failed to update Mod");
            }
            this.getInstalledMods();
        });
    }
}

const page = new Page_Mods();

module.exports = page;
