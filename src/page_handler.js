const Page_Dashboard = require("./page_dashboard");
const Page_Mods = require("./page_mods");
const Page_Settings = require("./page_settings");

class PageHandler {
    constructor() {
        this.page = "";
    }

    init() {
        this.page = $(".page-container").attr("data-page");

        switch (this.page) {
            case "dashboard":
                Page_Dashboard.init();
                break;
            case "mods":
                Page_Mods.init();
                break;
            case "settings":
                Page_Settings.init();
                break;
        }
    }
}

const pagehandler = new PageHandler();

module.exports = pagehandler;