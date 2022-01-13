const Notification = require("../obj_notification");

class ObjNotifySSMStartup extends Notification {
    constructor() {
        super("ssm.startup");

        this.SetData({
            "Title": "SSM Start Up Event",
            "Text": "SSM Core Has Just Been Started!"
        })
    }
}


module.exports = ObjNotifySSMStartup;