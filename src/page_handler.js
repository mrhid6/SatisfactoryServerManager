const API_Proxy = require("./api_proxy");
const Page_Dashboard = require("./page_dashboard");
const Page_Mods = require("./page_mods");
const Page_Logs = require("./page_logs");
const Page_Settings = require("./page_settings");

class PageHandler {
    constructor() {
        this.page = "";
    }

    init() {
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
                el.text(res.data)

            } else {
                el.text("Server Error!")
            }
        })
    }
}

const pagehandler = new PageHandler();

module.exports = pagehandler;