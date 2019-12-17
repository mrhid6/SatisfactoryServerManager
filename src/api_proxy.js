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

    post(...args) {
        const url = "/api/" + (args.join("/"));
        return new Promise((resolve, reject) => {
            $.post(url, result => {
                resolve(result)
            })
        })
    }

    postData(posturl, data) {
        const url = "/api/" + posturl
        return new Promise((resolve, reject) => {
            $.post(url, data, result => {
                resolve(result)
            })
        })
    }
}

const api_proxy = new API_Proxy();
module.exports = api_proxy;