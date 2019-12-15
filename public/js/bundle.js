(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
class API_Proxy {
    constructor() {}

    get(...args) {
        const url = "/api/" + (args.join("/"));
        return new Promise((resolve, reject) => {
            $.get(url, result => {
                resolve(result)
            })
        })

    }
}

const api_proxy = new API_Proxy();
module.exports = api_proxy;
},{}],2:[function(require,module,exports){
const PageHandler = require("./page_handler");


function main() {
    PageHandler.init();
}

$(document).ready(() => {
    main();
});
},{"./page_handler":4}],3:[function(require,module,exports){
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
},{"./api_proxy":1}],4:[function(require,module,exports){
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
},{"./page_dashboard":3,"./page_mods":5}],5:[function(require,module,exports){
const API_Proxy = require("./api_proxy");


class Page_Mods {
    constructor() {}

    init() {
        this.setupJqueryListeners();
        this.displayModsTable();
    }

    setupJqueryListeners() {

    }

    displayModsTable() {

        const isDataTable = $.fn.dataTable.isDataTable("#mods-table")

        API_Proxy.get("modsinstalled").then(res => {
            if (res.result == "success") {
                const data = [];
                for (let i = 0; i < res.data.length; i++) {
                    const mod = res.data[i];
                    data.push([
                        mod.name,
                        mod.id,
                        mod.version
                    ])
                }

                if (isDataTable == false) {
                    $("#mods-table").DataTable({
                        paging: true,
                        searching: false,
                        info: false,
                        order: [
                            [0, "asc"]
                        ],
                        data: data
                    })
                } else {
                    const datatable = $("#mods-table").DataTable();
                    datatable.clear();
                    datatable.rows.add(data);
                    datatable.draw();
                }
            }
        })
    }

}

const page = new Page_Mods();

module.exports = page;
},{"./api_proxy":1}]},{},[2]);
