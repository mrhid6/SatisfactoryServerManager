const Notification = require("../obj_notification");

class ObjNotifySSMStartup extends Notification {
    constructor() {
        super("ssm.startup");

        this.set("title", "SSM Start Up Event");
        this.set("description", "SSM Core Has Just Been Started!");
    }
}

module.exports = ObjNotifySSMStartup;
