const Notification = require("../obj_notification");

class ObjNotifySSMShutdown extends Notification {
    constructor() {
        super("ssm.shutdown");

        this.set("title", "SSM Shutdown Event");
        this.set("description", "SSM Core Has Just Been Shutdown!");
    }
}


module.exports = ObjNotifySSMShutdown;