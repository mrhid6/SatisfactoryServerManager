const Page_Dashboard = require("./page_dashboard");
const Page_Mods = require("./page_mods");

class PageHandler {
    constructor() {
        this.page = "";
    }

    init() {
        this.page = $(".page-container").attr("data-page");

        console.log(this.page)

        switch (this.page) {
            case "dashboard":
                Page_Dashboard.init();
                break;
            case "mods":
                Page_Mods.init();
                break;
        }
    }
}

const pagehandler = new PageHandler();

module.exports = pagehandler;