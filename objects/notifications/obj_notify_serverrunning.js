const Notification = require("../obj_notification");

class ObjNotifyServerRunning extends Notification {
    constructor(Agent) {
        super("server.running");

        this.SetData({
            "Title": "Satisfactory Server Is Running!",
            "AgentName": Agent.getDisplayName(),
            "Text": "The Satisfactory Dedicated Server Hosted On This Agent Is Running!"
        })
    }
}


module.exports = ObjNotifyServerRunning;