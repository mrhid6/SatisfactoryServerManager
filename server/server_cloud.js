const axios = require("axios").default;

class SSMCloud {
    constructor(opts) {
        const default_options = {
            github: {
                user: "mrhid6",
                repo: "satisfactoryservermanager",
            },
        };

        this._options = Object.assign({}, default_options, opts);
        this._GitHub_URL = "https://api.github.com";
    }

    getGithubLatestRelease() {
        return new Promise((resolve, reject) => {
            let url = this._GitHub_URL + "/repos/";
            url += this._options.github.user + "/";
            url += this._options.github.repo + "/";
            url += "releases/latest";

            axios
                .get(url, {
                    timeout: 5000,
                })
                .then((res) => {
                    if (res.data == null || typeof res.data == "undefined") {
                        reject("Cant find latest release data!");
                        return;
                    }
                    resolve(res.data);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}

const ssmCloud = new SSMCloud();
module.exports = ssmCloud;
