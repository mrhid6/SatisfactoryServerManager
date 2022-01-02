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

    ListeningForEvent(event) {
        const listeningevent = this.getEvents().find(e => e == event);
        return listeningevent != null;
    }

    CanTriggerEvent(event, payload) {
        if (this.isEnabled() == false) {
            return false;
        }

        if (!this.ListeningForEvent(event)) {
            return false;
        }

        return true;
    }

    TriggerEvent(event, payload) {

    }
}

module.exports = NotificationInterface;