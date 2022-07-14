const API_Proxy = require("./api_proxy");
const PageCache = require("./cache");

class Page_Logs {
    constructor() {
        this.ServerState = {}

        this._TotalSFLogLines = 0;
        this._SFLogOffset = 0;
    }

    init() {

        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    setupJqueryListeners() {
        $("body").on("click", ".sf-log-page-link", e => {
            e.preventDefault();
            const $pageBtn = $(e.currentTarget);
            console.log(parseInt($pageBtn.text()) - 1)
            this._SFLogOffset = (parseInt($pageBtn.text()) - 1) * 500;

            this.getSFServerLog(true);
        })
    }

    SetupEventHandlers() {
        PageCache.on("setactiveagent", () => {
            this.MainDisplayFunction();
        })
    }

    MainDisplayFunction() {
        const Agent = PageCache.getActiveAgent()

        if (Agent == null) {
            this.getSSMLog();
            return;
        }

        this.getSSMLog();
        this.getSFServerLog();
    }

    getSSMLog() {
        const Agent = PageCache.getActiveAgent()
        const postData = {}

        if (Agent == null) {
            postData.agentid = -1;
        } else {
            postData.agentid = Agent.id;
        }

        API_Proxy.postData("agent/logs/ssmlog", postData).then(res => {
            const el = $("#ssm-log-viewer samp");
            el.empty();
            if (res.result == "success") {
                res.data.forEach((logline) => {
                    el.append("<p>" + logline + "</p>")
                })
            } else {
                el.text(res.error.message)
            }
        })
    }

    getSFServerLog(force = false) {
        const Agent = PageCache.getActiveAgent()
        const postData = {
            offset: this._SFLogOffset
        }

        if (Agent == null) {
            postData.agentid = -1;
        } else {
            postData.agentid = Agent.id;
        }

        API_Proxy.postData("agent/logs/sfserverlog", postData).then(res => {
            const el = $("#sf-log-viewer samp");
            const el2 = $("#sf-logins-viewer samp");
            el.empty();
            el2.empty();
            if (res.result == "success") {
                if (res.data.lineCount != this._TotalSFLogLines || force == true) {
                    this._TotalSFLogLines = res.data.lineCount;
                    this.buildSFLogPagination();
                    res.data.logArray.forEach((logline) => {
                        el.append("<p>" + logline + "</p>")
                    })

                    res.data.playerJoins.forEach((logline) => {
                        el2.append("<p>" + logline + "</p>")
                    })
                }
            } else {
                el.text(res.error)
                el2.text(res.error)
            }
        })
    }

    buildSFLogPagination() {
        const $el = $("#SFLogPagination .pagination")
        $el.empty();

        const pageCount = Math.ceil(this._TotalSFLogLines / 500) + 1
        for (let i = 1; i < pageCount; i++) {
            const pageOffset = (i - 1) * 500;

            $el.append(`<li class="page-item ${this._SFLogOffset==pageOffset?"active":""}"><a class="page-link sf-log-page-link ">${i}</a></li>`)
        }
    }
}

const page = new Page_Logs();

module.exports = page;