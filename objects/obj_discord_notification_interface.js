const NotificationInterface = require("./obj_notification_interface");
const Logger = require("../server/server_logger");

const {
    Webhook,
    MessageBuilder
} = require('discord-webhook-node');

class DiscordNotificationInterface extends NotificationInterface {
    constructor() {
        super();

        this._SSMLogo = "https://raw.githubusercontent.com/mrhid6/SatisfactoryServerManager/master/public/images/ssm_logo128.png";
    }

    init(data) {
        super.init(data);

        this._hook = new Webhook(this.getOptions().url);
        this._hook.setUsername('SSM Notifier');
        this._hook.setAvatar(this._SSMLogo);

    }

    TriggerSSMEvent(Notification) {
        return new Promise((resolve, reject) => {
            const embed = new MessageBuilder()
                .setTitle(Notification.get("title"))
                .setColor('#00b0f4')
                .setDescription(Notification.get("description"))
                .setTimestamp();
            this._hook.send(embed).then(() => {
                resolve();
            })

        });
    }

    TriggerAgentEvent(Notification) {
        return new Promise((resolve, reject) => {
            const embed = new MessageBuilder()
                .setTitle(Notification.get("title"))
                .setColor('#00b0f4')
                .setDescription(Notification.get("description"))
                .addField("**Agent:**", Notification.get("details.agent_name"), true)
                .setTimestamp();

            this._hook.send(embed).then(() => {
                resolve();
            })
        });
    }

    TriggerServerEvent(Notification) {
        return new Promise((resolve, reject) => {
            const embed = new MessageBuilder()
                .setTitle(Notification.get("title"))
                .setColor('#00b0f4')
                .setDescription(Notification.get("description"))
                .addField("**Agent:**", Notification.get("details.agent_name"), true)
                .setTimestamp();

            this._hook.send(embed).then(() => {
                resolve();
            })
        });
    }
}

module.exports = DiscordNotificationInterface;