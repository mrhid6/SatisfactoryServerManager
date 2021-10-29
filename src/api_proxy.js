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
}

const api_proxy = new API_Proxy();
module.exports = api_proxy;