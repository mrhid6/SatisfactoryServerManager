const Logger = require("./logger");

class API_Proxy {
    constructor() {}

    get(...args) {
        const url = "/api/" + (args.join("/"));
        Logger.debug("API Proxy [GET] " + url);
        return new Promise((resolve, reject) => {
            $.get(url, result => {
                resolve(result)
            })
        })
    }

    post(...args) {
        const url = "/api/" + (args.join("/"));
        Logger.debug("API Proxy [POST] " + url);
        return new Promise((resolve, reject) => {
            $.post(url, result => {
                resolve(result)
            })
        })
    }

    postData(posturl, data) {
        const url = "/api/" + posturl
        Logger.debug("API Proxy [POST] " + url);
        return new Promise((resolve, reject) => {
            $.post(url, data, result => {
                resolve(result)
            })
        })
    }

    upload(uploadurl, formdata) {
        const url = "/api/" + uploadurl
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'POST',
                data: formdata, // The form with the file inputs.
                processData: false,
                contentType: false // Using FormData, no need to process data.
            }).done(data => {
                resolve(data)
            }).fail(err => {
                reject(err);
            });
        });
    }

    download(posturl, data) {

        const url = "/api/" + posturl
        return new Promise((resolve, reject) => {
            $.ajax({
                type: "POST",
                url: url,
                data: data,
                xhrFields: {
                    responseType: 'blob' // to avoid binary data being mangled on charset conversion
                },
                success: function (blob, status, xhr) {
                    // check for a filename
                    var filename = "";
                    var disposition = xhr.getResponseHeader('Content-Disposition');
                    if (disposition && disposition.indexOf('attachment') !== -1) {
                        var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                        var matches = filenameRegex.exec(disposition);
                        if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
                    }

                    if (typeof window.navigator.msSaveBlob !== 'undefined') {
                        // IE workaround for "HTML7007: One or more blob URLs were revoked by closing the blob for which they were created. These URLs will no longer resolve as the data backing the URL has been freed."
                        window.navigator.msSaveBlob(blob, filename);
                        resolve();
                    } else {
                        var URL = window.URL || window.webkitURL;
                        var downloadUrl = URL.createObjectURL(blob);

                        if (filename) {
                            // use HTML5 a[download] attribute to specify filename
                            var a = document.createElement("a");
                            // safari doesn't support this yet
                            if (typeof a.download === 'undefined') {
                                window.location.href = downloadUrl;
                                resolve();
                            } else {
                                a.href = downloadUrl;
                                a.download = filename;
                                document.body.appendChild(a);
                                a.click();
                                resolve();
                            }
                        } else {
                            window.location.href = downloadUrl;
                            resolve();
                        }

                        setTimeout(function () {
                            URL.revokeObjectURL(downloadUrl);
                        }, 100); // cleanup
                    }
                }
            });
        });
    }
}

const api_proxy = new API_Proxy();
module.exports = api_proxy;