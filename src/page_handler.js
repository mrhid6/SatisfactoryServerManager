const API_Proxy = require("./api_proxy");
const PageCache = require("./cache");

const Page_Dashboard = require("./page_dashboard");
const Page_Mods = require("./page_mods");
const Page_Logs = require("./page_logs");
const Page_Saves = require("./page_saves");
const Page_Settings = require("./page_settings");
const Page_Servers = require("./page_servers");
const Page_Server = require("./page_server");
const Page_Users = require("./page_users");
const Page_Backups = require("./page_backups");

const Logger = require("./logger");

class PageHandler {
    constructor() {
        this.page = "";
        this.SETUP_CACHE = {
            sfinstalls: [],
            selected_sfinstall: null,
        };
    }

    init() {
        toastr.options.closeButton = true;
        toastr.options.closeMethod = "fadeOut";
        toastr.options.closeDuration = 300;
        toastr.options.closeEasing = "swing";
        toastr.options.showEasing = "swing";
        toastr.options.timeOut = 30000;
        toastr.options.extendedTimeOut = 10000;
        toastr.options.progressBar = true;
        toastr.options.positionClass = "toast-bottom-right";

        this.setupJqueryHandler();
        this.getSSMVersion();

        this.page = $(".page-container").attr("data-page");

        switch (this.page) {
            case "dashboard":
                Page_Dashboard.init();
                break;
            case "mods":
                Page_Mods.init();
                break;
            case "logs":
                Page_Logs.init();
                break;
            case "saves":
                Page_Saves.init();
                break;
            case "servers":
                Page_Servers.init();
                break;
            case "server":
                Page_Server.init();
                break;
            case "admin":
                Page_Users.init();
                Page_Settings.init();
                break;
            case "backups":
                Page_Backups.init();
                break;
        }

        this.getAgentsList();
        this.startLoggedInCheck();
        this.startPageInfoRefresh();
    }

    setupJqueryHandler() {
        $('[data-toggle="tooltip"]').tooltip();

        $("#inp_server").on("change", (e) => {
            e.preventDefault();
            PageCache.setActiveAgent($(e.currentTarget).val());
        });

        $("#viewport.minimal #sidebar .navbar .nav-item a").tooltip(
            "_fixTitle"
        );
    }

    getAgentsList() {
        API_Proxy.get("agent", "agents")
            .then((res) => {
                if (res.result == "success") {
                    PageCache.setAgentsList(res.data);

                    this.populateServerSelection();
                } else {
                    Logger.error(res.error);
                }
            })
            .catch((err) => {
                console.log(err);
            });
    }

    populateServerSelection() {
        const $el = $("#inp_server");
        $el.find("option").not(":first").remove();
        for (let i = 0; i < PageCache.getAgentsList().length; i++) {
            const Agent = PageCache.getAgentsList()[i];
            $el.append(`<option value="${Agent.id}">${Agent.name}</option>`);
        }

        $el.val(getCookie("currentAgentId"));
    }

    getSSMVersion() {
        API_Proxy.get("info", "ssmversion").then((res) => {
            const el = $("#ssm-version");
            if (res.result == "success") {
                this.checkSSMVersion(res.data);
                el.text(res.data.current_version);
            } else {
                el.text("Server Error!");
            }
        });
    }

    checkSSMVersion(version_data) {
        const ToastId =
            "toast_" +
            version_data.current_version +
            "_" +
            version_data.github_version +
            "_" +
            version_data.version_diff;
        const ToastDisplayed = getCookie(ToastId);

        if (ToastDisplayed == null) {
            if (version_data.version_diff == "gt") {
                toastr.warning(
                    "You are currently using a Development version of SSM"
                );
            } else if (version_data.version_diff == "lt") {
                toastr.warning("SSM requires updating. Please update now");
            }

            setCookie(ToastId, true, 30);
        }
    }

    startLoggedInCheck() {
        const interval = setInterval(() => {
            Logger.debug("Checking Logged In!");
            this.checkLoggedIn().then((loggedin) => {
                if (loggedin != true) {
                    clearInterval(interval);
                    window.location.replace("/logout");
                }
            });
        }, 10000);
    }

    checkLoggedIn() {
        return new Promise((resolve, reject) => {
            API_Proxy.get("info", "loggedin").then((res) => {
                if (res.result == "success") {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }

    startPageInfoRefresh() {
        setInterval(() => {
            this.getAgentsList();
        }, 5 * 1000);
    }
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name + "=; Max-Age=-99999999;";
}

window.openModal = function (modal_dir, modal_name, var1, var2) {
    let options = {
        allowBackdropRemoval: true,
    };

    let callback = null;

    if (arguments.length == 3) {
        callback = var1;
    } else if (arguments.length == 4) {
        options = var1;
        callback = var2;
    }

    if ($("body").hasClass("modal-open")) {
        return;
    }

    $.ajax({
        url: modal_dir + "/" + modal_name + ".html",
        success: function (data) {
            $("body").append(data);

            var modalEl = $("#" + modal_name);

            modalEl.find("button.close").on("click", (e) => {
                e.preventDefault();
                const $this = $(e.currentTarget)
                    .parent()
                    .parent()
                    .parent()
                    .parent();
                $this.remove();
                $this.trigger("hidden.bs.modal");
                $this.modal("hide");
                $("body").removeClass("modal-open").attr("style", null);
                $(".modal-backdrop").remove();
            });

            modalEl.on("hidden.bs.modal", () => {
                $(this).remove();
                $('[name^="__privateStripe"]').remove();
                if (options.allowBackdropRemoval == true)
                    $(".modal-backdrop").remove();
            });
            modalEl.modal("show");
            if (callback) callback(modalEl);
        },
        dataType: "html",
    });
};

const pagehandler = new PageHandler();

module.exports = pagehandler;
