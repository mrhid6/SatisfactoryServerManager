const DB = require("./server_db");

const DiscordNotificationInterface = require("../objects/obj_discord_notification_interface");
const WebhookNotificationInterface = require("../objects/obj_webhook_notification_interface");

const iNotification = require("../objects/obj_notification");

class NotificationHandler {
    constructor() {
        this._notifyinterfaces = [];
        this._WEBHOOKS = [];
    }

    init = async () => {
        await this.LoadWebHooksFromDB();
        await this.ProcessPendingEvents();

        setInterval(async () => {
            await this.ProcessPendingEvents();
        }, 10000);
    };

    RegisterInterface(NotifyInterface) {
        this._notifyinterfaces.push(NotifyInterface);
    }

    TriggerNotification = async (Notification) => {
        const NotifyInterface = this._notifyinterfaces.find(
            (int) => int.getId() == Notification.get("webhook_id")
        );

        if (NotifyInterface == null) {
            Notification.set("lastError", "webhook_id is null!");
            Notification.set("attempts", Notification.get("attempts") + 1);
        } else {
            try {
                await NotifyInterface.TriggerEvent(Notification);
                Notification.set("handled", true);
            } catch (err) {
                Notification.set("lastError", err.message);
                Notification.set("attempts", Notification.get("attempts") + 1);
            }
        }

        try {
            await this.SaveEvent(Notification);
        } catch (err) {
            console.log(err);
        }
    };

    StoreNotification = async (Notification) => {
        for (let i = 0; i < this._notifyinterfaces.length; i++) {
            const NotifyInterface = this._notifyinterfaces[i];

            if (NotifyInterface.CanTriggerEvent(Notification) == false)
                continue;

            Notification.set("webhook_id", NotifyInterface.getId());

            const sqlData = [JSON.stringify(Notification.GetData())];

            const sql = "INSERT INTO webhook_events(we_data) VALUES (?)";
            await DB.queryRun(sql, sqlData);
        }
    };

    GetPendingEvents = async () => {
        const rows = await DB.query("SELECT * FROM webhook_events");

        const resArray = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const Notification = new iNotification();
            Notification.ParseSQLData(row);

            if (
                Notification.get("handled") == false &&
                Notification.get("attempts") < 10
            ) {
                resArray.push(Notification);
            } else if (Notification.get("attempts") >= 10) {
                Notification.set("handled", true);
                await this.SaveEvent(Notification);
            }
        }

        return resArray;
    };

    ProcessPendingEvents = async () => {
        const Events = await this.GetPendingEvents();

        for (let i = 0; i < Events.length; i++) {
            const WebhookEvent = Events[i];
            try {
                await this.TriggerNotification(WebhookEvent);
            } catch (err) {
                console.log(err);
            }
        }

        await this.PurgeEvents();
    };

    SaveEvent = async (Notification) => {
        const sql = "UPDATE webhook_events SET we_data=? WHERE we_id=?";
        const sqlData = [
            JSON.stringify(Notification.GetData()),
            Notification._id,
        ];

        await DB.queryRun(sql, sqlData);
    };

    PurgeEvents = async () => {
        const rows = await DB.query("SELECT * FROM webhook_events");

        const resArray = [];

        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 10);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const Notification = new iNotification();
            Notification.ParseSQLData(row);

            if (
                Notification.get("handled") == true &&
                Notification.get("timestamp") < limitDate.getTime()
            ) {
                await DB.queryRun("DELETE FROM webhook_events WHERE we_id=?", [
                    Notification._id,
                ]);
            }
        }
    };

    LoadWebHooksFromDB() {
        return new Promise((resolve, reject) => {
            DB.query("SELECT * FROM webhooks").then((rows) => {
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
                        enabled: row.webhook_enabled == 1,
                        events: JSON.parse(row.webhook_events || []),
                        type: row.webhook_discord,
                    });

                    this._WEBHOOKS.push(iInterface);
                    this.RegisterInterface(iInterface);
                }

                resolve();
            });
        });
    }

    API_GetAllWebhooks() {
        return new Promise((resolve, reject) => {
            const resArr = [];

            for (let i = 0; i < this._WEBHOOKS.length; i++) {
                const webhook = this._WEBHOOKS[i];
                resArr.push(webhook.getOptions());
            }

            resolve(resArr);
        });
    }
}

const notificationHandler = new NotificationHandler();
module.exports = notificationHandler;
