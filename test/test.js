const axios = require("axios").default;
var ua = require("universal-analytics");

class SSMCloud {
    constructor(opts) {
        const default_options = {
            github: {
                user: "",
                repo: "",
            },
        };

        this._options = Object.assign({}, default_options, opts);
        this.GitHub_URL = "https://api.github.com";

        this._GA_Property_ID = "UA-156450198-1";
        this._visitor = ua(this._GA_Property_ID);
    }

    getGithubLatestRelease() {
        return new Promise((resolve, reject) => {
            let url = this.GitHub_URL + "/repos/";
            url += this._options.github.user + "/";
            url += this._options.github.repo + "/";
            url += "releases/latest";

            axios
                .get(url)
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

    sendGAEvent(category, action, label, value) {
        this._visitor.event(category, action, label, value, function (err) {
            console.log(err);
        });
    }
}

const cloudOptions = {
    github: {
        user: "mrhid6",
        repo: "satisfactoryservermanager",
    },
};
const test = new SSMCloud(cloudOptions);

test.sendGAEvent("SSM Online", "Test", "Test", "1.0.12");
