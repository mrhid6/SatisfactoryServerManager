const NotificationHandler = require("../server_notifcation_handler");

const NotificationInterface = require("../../objects/obj_notification_interface");
const Config = require("../server_config");
const Logger = require("../server_logger");

const {
    Webhook,
    MessageBuilder
} = require('discord-webhook-node');

class DiscordNotification extends NotificationInterface {
    constructor() {
        super();

        this._SSMLogo = "https://raw.githubusercontent.com/mrhid6/SatisfactoryServerManager/master/public/images/ssm_logo128.png";
    }

    init() {
        super.init(Config.get("ssm.notifications.discord"));
        NotificationHandler.RegisterInterface(this);

        this._hook = new Webhook(this.getOptions().webhookurl);
        this._hook.setUsername('SSM Notifier');
        this._hook.setAvatar(this._SSMLogo);

    }

    TriggerEvent(Notification) {
        return new Promise((resolve, reject) => {
            if (super.CanTriggerEvent(Notification)) {
                Logger.info("[NOTIFCATION] - Discord Triggered Event " + Notification.GetEventName());

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
            const embed = new MessageBuilder()
                .setTitle(Notification.get("Title"))
                .setColor('#00b0f4')
                .setDescription(Notification.get("Text"))
                .setTimestamp();
            this._hook.send(embed).then(() => {
                resolve();
            })

        });
    }

    TriggerAgentEvent(Notification) {
        return new Promise((resolve, reject) => {
            const embed = new MessageBuilder()
                .setTitle(Notification.get("Title"))
                .setColor('#00b0f4')
                .setDescription(Notification.get("Text"))
                .addField("**Agent:**", Notification.get("AgentName"), true)
                .setTimestamp();

            this._hook.send(embed).then(() => {
                resolve();
            })
        });
    }

    TriggerServerEvent(Notification) {
        return new Promise((resolve, reject) => {
            const embed = new MessageBuilder()
                .setTitle(Notification.get("Title"))
                .setColor('#00b0f4')
                .setDescription(Notification.get("Text"))
                .addField("**Agent:**", Notification.get("AgentName"), true)
                .setTimestamp();

            this._hook.send(embed).then(() => {
                resolve();
            })
        });
    }
}

const discordNotification = new DiscordNotification();

module.exports = discordNotification;