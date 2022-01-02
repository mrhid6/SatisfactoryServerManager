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

    TriggerEvent(event, payload) {
        return new Promise((resolve, reject) => {
            if (super.CanTriggerEvent(event, payload)) {
                Logger.info("[NOTIFCATION] - Discord Triggered Event " + event);

                let promise;
                switch (event) {
                    case "ssm.startup":
                        promise = this.TriggerSSMStartupEvent();
                        break;
                    case "ssm.shutdown":
                        promise = this.TriggerSSMShutdownEvent();
                        break;
                }

                promise.then(() => {
                    resolve();
                })
            }
        });
    }

    TriggerSSMStartupEvent() {
        return new Promise((resolve, reject) => {
            const embed = new MessageBuilder()
                .setTitle('SSM Start Up Event')
                .setColor('#00b0f4')
                .setDescription('SSM Core Has Just Been Started!')
                .setTimestamp();

            this._hook.send(embed).then(() => {
                resolve();
            })

        });
    }

    TriggerSSMShutdownEvent() {
        return new Promise((resolve, reject) => {
            const embed = new MessageBuilder()
                .setTitle('SSM Shutdown Up Event')
                .setColor('#00b0f4')
                .setDescription('SSM Core Has Just Been Shutdown!')
                .setTimestamp();

            this._hook.send(embed).then(() => {
                resolve();
            })

        });
    }
}

const discordNotification = new DiscordNotification();

module.exports = discordNotification;