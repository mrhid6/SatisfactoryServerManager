const Mrhid6Utils = require("../Mrhid6Utils");
const iMetrics = Mrhid6Utils.Metrics;

const Config = require("./server_config");
const Cleanup = require("./server_cleanup");
const Logger = require("./server_logger");

class Metrics extends iMetrics {
    constructor() {
        super({
            appid: "APP-189WI4M396JD72"
        });
    }

    init() {
        const clientid = Config.get("ssm.metrics.clientid")
        if (clientid == "") {
            this.createUUID();
            Config.set("ssm.metrics.clientid", this.getUUID());
        }

        this._options.client_uuid = Config.get("ssm.metrics.clientid")
    }

    isMetricsEnabled() {
        return (
            Config.get("ssm.metrics.enabled") == true &&
            Config.get("ssm.metrics.initalshow") == true
        );
    }

    sendServerStartEvent() {
        if (this.isMetricsEnabled()) {
            this.createEvent(1, "1").then(res => {
                if (res.result != "success") {
                    Logger.warn("Couldn't send metric event");
                    console.log(res.error)
                }
            }).catch(err => {
                Logger.warn("Couldn't send metric event");
                console.log(err)
            })
        }
    }

    sendServerStopEvent() {

        if (this.isMetricsEnabled()) {
            Cleanup.increaseCounter(1)

            this.createEvent(2, "1").then(res => {
                if (res.result != "success") {
                    Logger.warn("Couldn't send metric event");
                    console.log(res.error)
                }
            }).catch(err => {
                Logger.warn("Couldn't send metric event");
                console.log(err)
            }).finally(() => {
                Cleanup.decreaseCounter(1);
            })
        }
    }
}

const metrics = new Metrics;

module.exports = metrics;