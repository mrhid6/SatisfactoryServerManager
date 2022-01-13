const Notification = require("../obj_notification");

class ObjNotifyServerOffline extends Notification {
    constructor(Agent) {
        super("server.offline");

        this.SetData({
            "Title": "Satisfactory Server Is Offline!",
            "AgentName": Agent.getDisplayName(),
            "Text": "The Satisfactory Dedicated Server Hosted On This Agent Is Offline!"
        })
    }
}


module.exports = ObjNotifyServerOffline;