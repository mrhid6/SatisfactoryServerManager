const PageHandler = require("./page_handler");
const Logger = require("./logger");

Date.prototype.getMonthName = function () {
    const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    return monthNames[this.getMonth()];
};

Number.prototype.pad = function (width, z) {
    let n = this;
    z = z || "0";
    n = n + "";
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

Number.prototype.toDecimal = function () {
    return this.toFixed(2);
};

String.prototype.trunc =
    String.prototype.trunc ||
    function (n) {
        return this.length > n ? this.substr(0, n - 1) + "&hellip;" : this;
    };

function main() {
    Logger.displayBanner();
    PageHandler.init();
}

$(document).ready(() => {
    main();
});
