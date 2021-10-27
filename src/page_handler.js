const API_Proxy = require("./api_proxy");
const Page_Dashboard = require("./page_dashboard");
const Page_Mods = require("./page_mods");
const Page_Logs = require("./page_logs");
const Page_Saves = require("./page_saves");
const Page_Settings = require("./page_settings");

const Tools = require("../Mrhid6Utils/lib/tools");

const Logger = require("./logger");

class PageHandler {
    constructor() {
        this.page = "";
        this.SETUP_CACHE = {
            sfinstalls: [],
            selected_sfinstall: null
        }
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
        this.checkInitalSetup();
        this.startLoggedInCheck()

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

        $("body").on("click", "#metrics-opt-in #cancel-action", (e) => {
            $("#metrics-opt-in .close").trigger("click");
            Tools.modal_opened = false;
            this.sendRejectMetrics()
        })

        $("body").on("click", "#metrics-opt-in #confirm-action", (e) => {
            const $btnel = $(e.currentTarget);
            $("#metrics-opt-in .close").trigger("click");
            Tools.modal_opened = false;
            this.sendAcceptMetrics();
        }).on("click", "#btn_setup_findinstall", e => {
            this.getSetupSFInstalls(e)
        }).on("change", "#sel_setup_sf_install", e => {
            const $selel = $(e.currentTarget);

            if ($selel.val() == -1) {
                this.SETUP_CACHE.selected_sfinstall = null;
                $("#setup_sf_installname").text("")
                $("#setup_sf_installloc").text("")
                $("#setup_sf_installver").text("")
                return;
            }

            const info = this.SETUP_CACHE.sfinstalls[$selel.val()]
            this.SETUP_CACHE.selected_sfinstall = info;
            $("#setup_sf_installname").text(info.name)
            $("#setup_sf_installloc").text(info.installLocation)
            $("#setup_sf_installver").text(info.version)
        })
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

    startLoggedInCheck() {
        const interval = setInterval(() => {
            Logger.info("Checking Logged In!");
            this.checkLoggedIn().then(loggedin => {
                if (loggedin != true) {
                    clearInterval(interval)
                    window.location.replace("/logout");
                }
            })
        }, 10000)
    }

    checkLoggedIn() {
        return new Promise((resolve, reject) => {
            API_Proxy.get("info", "loggedin").then(res => {
                if (res.result == "success") {
                    resolve(true)
                } else {
                    resolve(false)
                }
            })
        })
    }

    checkInitalSetup() {
        API_Proxy.get("config", "ssm", "setup").then(res => {
            if (res.result == "success") {
                const resdata = res.data;

                if (resdata == false) {
                    Tools.openModal("/public/modals", "inital-setup", (modal) => {

                        const form = $("#initial-setup-wizard")
                        form.steps({
                            headerTag: "h3",
                            bodyTag: "fieldset",
                            transitionEffect: "slideLeft",
                            onStepChanging: (event, currentIndex, newIndex) => {
                                if (currentIndex > newIndex) {
                                    return true;
                                }

                                if (newIndex == 2 && $("#inp_sf_install_location").val() == "") {
                                    return false;
                                }

                                return true;
                            },
                            onFinishing: (event, currentIndex) => {
                                const terms = ($("#acceptTerms-2:checked").length > 0)
                                return terms;
                            },
                            onFinished: (event, currentIndex) => {
                                const postData = {
                                    serverlocation: $("#inp_sf_install_location").val(),
                                    testmode: ($("#inp_setup_testmode:checked").length > 0),
                                    metrics: ($("#inp_setup_metrics:checked").length > 0)
                                }

                                API_Proxy.postData("config/ssm/setup", postData).then(res => {
                                    modal.modal("hide");
                                })
                            }
                        });
                        $("#inp_setup_testmode").bootstrapToggle();
                        $("#inp_setup_metrics").bootstrapToggle();
                    })
                }
            }
        });
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