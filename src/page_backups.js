const API_Proxy = require("./api_proxy");
const Tools = require("../Mrhid6Utils/lib/tools");

const PageCache = require("./cache");

class Page_Backups {
    constructor() {
        this._ROLES = [];
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();
    }

    SetupEventHandlers() {
        PageCache.on("setactiveagent", () => {
            this.MainDisplayFunction();
        })
    }

    setupJqueryListeners() {
        $("body").on("click", ".download-backup-btn", e => {
            this.DownloadBackup($(e.currentTarget));
        })
    }

    MainDisplayFunction() {
        this.DisplayBackupsTable();
    }

    DisplayBackupsTable() {

        const Agent = PageCache.getActiveAgent()

        const postData = {
            agentid: Agent.id
        }

        API_Proxy.postData("agent/backups", postData).then(res => {

            const isDataTable = $.fn.dataTable.isDataTable("#backups-table")
            const tableData = [];

            const backups = res.data;

            if (backups != null && backups.length > 0) {
                let index = 0;
                backups.forEach(backup => {

                    let deleteBackupEl = $("<button/>")
                        .addClass("btn btn-danger float-end remove-backup-btn")
                        .html("<i class='fas fa-trash'></i>")
                        .attr("data-backup-name", backup.filename);

                    let downloadBackupEl = $("<button/>")
                        .addClass("btn btn-primary float-start download-backup-btn")
                        .html("<i class='fas fa-download'></i>")
                        .attr("data-backup-name", backup.filename);

                    const downloadSaveStr = deleteBackupEl.prop('outerHTML')
                    const deleteSaveStr = downloadBackupEl.prop('outerHTML')



                    tableData.push([
                        backup.filename,
                        BackupDate(backup.created),
                        humanFileSize(backup.size),
                        downloadSaveStr + deleteSaveStr
                    ])
                    index++;
                })
            }

            if (isDataTable == false) {
                $("#backups-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [
                        [0, "desc"]
                    ],
                    columnDefs: [],
                    data: tableData
                })
            } else {
                const datatable = $("#backups-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        })
    }

    DownloadBackup($btn) {
        const BackupFile = $btn.attr("data-backup-name");

        const Agent = PageCache.getActiveAgent()

        const postData = {
            agentid: Agent.id,
            backupfile: BackupFile
        }

        console.log(postData)

        API_Proxy.download("agent/backups/download", postData).then(res => {
            console.log(res);
        }).catch(err => {
            console.log(err)
        })
    }
}

function BackupDate(dateStr) {
    const date = new Date(dateStr)
    const day = date.getDate().pad(2);
    const month = (date.getMonth() + 1).pad(2);
    const year = date.getFullYear();

    const hour = date.getHours().pad(2);
    const min = date.getMinutes().pad(2);
    const sec = date.getSeconds().pad(2);

    return day + "/" + month + "/" + year + " " + hour + ":" + min + ":" + sec;
}

/**
 * Format bytes as human-readable text.
 * 
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use 
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * 
 * @return Formatted string.
 */
function humanFileSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }

    const units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10 ** dp;

    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


    return bytes.toFixed(dp) + ' ' + units[u];
}


const page = new Page_Backups();

module.exports = page;