const DB = require("./server_db");

const DiscordNotificationInterface = require("../objects/obj_discord_notification_interface");
const WebhookNotificationInterface = require("../objects/obj_webhook_notification_interface")

class NotificationHandler {
    constructor() {
        this._notifyinterfaces = [];
        this._WEBHOOKS = [];
    }

    init() {
        return new Promise((resolve, reject) => {
            this.LoadWebHooksFromDB().then(resolve);
        });
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

    LoadWebHooksFromDB() {
        return new Promise((resolve, reject) => {
            DB.query("SELECT * FROM webhooks").then(rows => {
                this._WEBHOOKS = [];
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];

                    let iInterface = null;

                    if (row.webhook_discord == 1) {
                        iInterface = new DiscordNotificationInterface();
                    } else {
                        iInterface = new WebhookNotificationInterface();
                    }

                    iInterface.init({
                        id: row.webhook_id,
                        name: row.webhook_name,
                        url: row.webhook_url,
                        enabled: (row.webhook_enabled == 1),
                        events: JSON.parse(row.webhook_events || []),
                        type: row.webhook_discord
                    });

                    this._WEBHOOKS.push(iInterface);
                    this.RegisterInterface(iInterface);
                }

                resolve();
            })
        });
    }

    API_GetAllWebhooks() {
        return new Promise((resolve, reject) => {
            const resArr = [];

            for (let i = 0; i < this._WEBHOOKS.length; i++) {
                const webhook = this._WEBHOOKS[i];
                resArr.push(webhook.getOptions())
            }

            resolve(resArr);
        });
    }


}

const notificationHandler = new NotificationHandler();
module.exports = notificationHandler;