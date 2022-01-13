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

    }
}

module.exports = NotificationInterface;