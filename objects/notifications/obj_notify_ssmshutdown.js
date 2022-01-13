const Notification = require("../obj_notification");

class ObjNotifySSMShutdown extends Notification {
    constructor() {
        super("ssm.shutdown");

        this.SetData({
            "Title": "SSM Shutdown Up Event",
            "Text": "SSM Core Has Just Been Shutdown!"
        })
    }
}


module.exports = ObjNotifySSMShutdown;