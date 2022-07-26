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

    PostData = async (data) => {

        const url = this.getURL();

        try {
            const res = await axios.post(url, data)
            return res;
        } catch (err) {
            throw new Error(err.message);
        }
    }

    TriggerSSMEvent = async (Notification) => {
        try {
            const res = await this.PostData(Notification.GetData())
            return res;
        } catch (err) {
            throw err;
        }
    }

    TriggerAgentEvent = async (Notification) => {
        try {
            const res = await this.PostData(Notification.GetData())
            return res;
        } catch (err) {
            throw err;
        }
    }

    TriggerServerEvent = async (Notification) => {
        try {
            const res = await this.PostData(Notification.GetData())
            return res;
        } catch (err) {
            throw err;
        }
    }
}

module.exports = WebhookNotificationInterface;