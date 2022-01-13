class NotificationHandler {
    constructor() {
        this._notifyinterfaces = [];
    }


    RegisterInterface(NotifyInterface) {
        this._notifyinterfaces.push(NotifyInterface);
    }

    TriggerNotification(Notification) {
        return new Promise((resolve, reject) => {
            const promises = [];
            for (let i = 0; i < this._notifyinterfaces.length; i++) {
                const NotifyInterface = this._notifyinterfaces[i];
                promises.push(NotifyInterface.TriggerEvent(Notification));
            }

            Promise.all(promises).then(() => {
                resolve();
            })
        })

    }


}

const notificationHandler = new NotificationHandler();
module.exports = notificationHandler;