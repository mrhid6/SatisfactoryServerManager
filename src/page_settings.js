const API_Proxy = require("./api_proxy");


class Page_Settings {
    constructor() {
        this.Config = {};
    }

    init() {
        this.setupJqueryListeners();
        this.getConfig();

    }

    setupJqueryListeners() {

    }

    getConfig() {
        API_Proxy.get("config").then(res => {
            if (res.result == "success") {
                this.Config = res.data;
                console.log(this.Config);
                this.MainDisplayFunction();
            }
        });
    }

    MainDisplayFunction() {
        this.displaySaveTable();
        this.populateSFSettings();
    }

    populateSFSettings() {
        const sfConfig = this.Config.satisfactory;
        console.log(sfConfig.testmode);
        $('#inp_sf_testmode').bootstrapToggle('enable')
        if (sfConfig.testmode == true) {
            $('#inp_sf_testmode').bootstrapToggle('on')
        } else {
            $('#inp_sf_testmode').bootstrapToggle('off')
        }
        $('#inp_sf_testmode').bootstrapToggle('disable')

        $("#inp_sf_serverloc").val(sfConfig.server_location)
        $("#inp_sf_saveloc").val(sfConfig.save.location)
    }

    displaySaveTable() {

        const isDataTable = $.fn.dataTable.isDataTable("#saves-table")

        API_Proxy.get("saves").then(res => {
            const tableData = [];
            if (res.result == "success") {
                for (let i = 0; i < res.data.length; i++) {
                    const save = res.data[i];

                    tableData.push([
                        save.savename,
                        saveDate(save.last_modified),
                        ""
                    ])
                }
            }

            if (isDataTable == false) {
                $("#saves-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [
                        [1, "desc"]
                    ],
                    columnDefs: [{
                        type: 'date-euro',
                        targets: 1
                    }],
                    data: tableData
                })
            } else {
                const datatable = $("#saves-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        })
    }


}

function saveDate(dateStr) {
    const date = new Date(dateStr)
    const day = date.getDate().pad(2);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const hour = date.getHours().pad(2);
    const min = date.getMinutes().pad(2);
    const sec = date.getSeconds().pad(2);

    return day + "/" + month + "/" + year + " " + hour + ":" + min + ":" + sec;
}

const page = new Page_Settings();

module.exports = page;