const API_Proxy = require("./api_proxy");
const Tools = require("../Mrhid6Utils/lib/tools");

const PageCache = require("./cache");

class Page_Settings {
    constructor() {
        this.Config = {};
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();

        this.MainDisplayFunction();
    }

    SetupEventHandlers() {

    }

    setupJqueryListeners() {

    }

    MainDisplayFunction() {

    }
}

const page = new Page_Settings();

module.exports = page;