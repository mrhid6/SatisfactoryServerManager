const Logger = require("../server/server_logger");

class NotificationInterface {
    constructor() {}

    init(opts) {
        this._options = opts;
    }

    getOptions() {
        return this._options;
    }

    getId() {
        return this.getOptions().id;
    }

    getURL() {
        return this.getOptions().url;
    }

    getName() {
        return this.getOptions().name;
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

    TriggerEvent = async (Notification) => {
        if (this.CanTriggerEvent(Notification)) {
            Logger.debug("[NOTIFCATION] - Triggered Event " + Notification.GetEventName());

            try {
                switch (Notification.GetEventName()) {
                    case "ssm.startup":
                    case "ssm.shutdown":
                        await this.TriggerSSMEvent(Notification);
                        break;
                    case "agent.created":
                    case "agent.started":
                    case "agent.shutdown":
                        await this.TriggerAgentEvent(Notification);
                        break;
                    case "server.starting":
                    case "server.running":
                    case "server.stopping":
                    case "server.offline":
                        await this.TriggerServerEvent(Notification);
                        break;
                }
            } catch (err) {
                throw err;
            }
        }
    }


    TriggerSSMEvent = async (Notification) => {
        return;
    }

    TriggerAgentEvent = async (Notification) => {
        return;
    }

    TriggerServerEvent = async (Notification) => {
        return;
    }
}

module.exports = NotificationInterface;