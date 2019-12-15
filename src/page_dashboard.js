const API_Proxy = require("./api_proxy");


class Page_Dashboard {
    constructor() {}

    init() {
        this.setupJqueryListeners();
        this.getModCount();
    }

    setupJqueryListeners() {
        
    }

    getModCount() {
        API_Proxy.get("modsinstalled").then(res => {
            if (res.result == "success") {
                $("#mod-count").text(res.data.length)
            } else {
                $("#mod-count").text("Server Error!")
            }
        })
    }
}

const page = new Page_Dashboard();

module.exports = page;