const API_Proxy = require("./api_proxy");
const Page_Dashboard = require("./page_dashboard");
const Page_Mods = require("./page_mods");
const Page_Logs = require("./page_logs");
const Page_Saves = require("./page_saves");
const Page_Settings = require("./page_settings");

class PageHandler {
    constructor() {
        this.page = "";
    }

    init() {

        toastr.options.closeButton = true;
        toastr.options.closeMethod = 'fadeOut';
        toastr.options.closeDuration = 300;
        toastr.options.closeEasing = 'swing';
        toastr.options.showEasing = 'swing';
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
            case "settings":
                Page_Settings.init();
                break;
        }
    }

    setupJqueryHandler() {
        $('[data-toggle="tooltip"]').tooltip()
    }

    getSSMVersion() {
        API_Proxy.get("info", "ssmversion").then(res => {
            const el = $("#ssm-version");
            if (res.result == "success") {
                this.checkSSMVersion(res.data)
                el.text(res.data.current_version)

            } else {
                el.text("Server Error!")
            }
        })
    }

    checkSSMVersion(version_data) {

        const ToastId = "toast_" + version_data.current_version + "_" + version_data.github_version + "_" + version_data.version_diff
        const ToastDisplayed = getCookie(ToastId)

        if (ToastDisplayed == null) {

            if (version_data.version_diff == "gt") {
                toastr.warning("You are currently using a Development version of SSM")
            } else if (version_data.version_diff == "lt") {
                toastr.warning("SSM requires updating. Please update now")
            }

            setCookie(ToastId, true, 30);
        }
    }
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999;';
}

const pagehandler = new PageHandler();

module.exports = pagehandler;