const NotificationInterface = require("./obj_notification_interface");
const Logger = require("../server/server_logger");

const axios = require('axios').default;

class WebhookNotificationInterface extends NotificationInterface {
    constructor() {
        super();
    }

    init(data) {
        super.init(data);
    }

    PostData(data) {
        return new Promise((resolve, reject) => {

            const url = this.getOptions().url;
            //console.log(url)

            axios.post(url, data).then(res => {
                resolve(res);

            }).catch(err => {})
        });
    }

    TriggerSSMEvent(Notification) {
        return new Promise((resolve, reject) => {
            this.PostData(Notification.GetData()).then(res => {
                resolve();
            })
        });
    }

    TriggerAgentEvent(Notification) {
        return new Promise((resolve, reject) => {
            this.PostData(Notification.GetData()).then(res => {
                resolve();
            })
        });
    }

    TriggerServerEvent(Notification) {
        return new Promise((resolve, reject) => {
            this.PostData(Notification.GetData()).then(res => {
                resolve();
            })
        });
    }
}

module.exports = WebhookNotificationInterface;