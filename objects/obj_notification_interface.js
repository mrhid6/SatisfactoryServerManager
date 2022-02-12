const Logger = require("../server/server_logger");

class NotificationInterface {
    constructor() {}

    init(opts) {
        this._options = opts;
    }

    getOptions() {
        return this._options;
    }

    isEnabled() {
        return this.getOptions().enabled;
    }

    getEvents() {
        return this.getOptions().events;
    }

    ListeningForEvent(Notification) {
        const listeningevent = this.getEvents().find(e => e == Notification.GetEventName());
        return listeningevent != null;
    }

    CanTriggerEvent(Notification) {
        if (this.isEnabled() == false) {
            return false;
        }

        if (!this.ListeningForEvent(Notification)) {
            return false;
        }

        return true;
    }

    TriggerEvent(Notification) {
        return new Promise((resolve, reject) => {
            if (this.CanTriggerEvent(Notification)) {
                Logger.info("[NOTIFCATION] - Triggered Event " + Notification.GetEventName());

                let promise;
                switch (Notification.GetEventName()) {
                    case "ssm.startup":
                    case "ssm.shutdown":
                        promise = this.TriggerSSMEvent(Notification);
                        break;
                    case "agent.created":
                    case "agent.started":
                    case "agent.shutdown":
                        promise = this.TriggerAgentEvent(Notification);
                        break;
                    case "server.starting":
                    case "server.running":
                    case "server.stopping":
                    case "server.offline":
                        promise = this.TriggerServerEvent(Notification);
                        break;
                }

                promise.then(() => {
                    resolve();
                })
            } else {
                resolve();
            }
        });
    }


    TriggerSSMEvent(Notification) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    TriggerAgentEvent(Notification) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    TriggerServerEvent(Notification) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }
}

module.exports = NotificationInterface;