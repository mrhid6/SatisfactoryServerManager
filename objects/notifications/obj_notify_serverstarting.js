const Notification = require("../obj_notification");

class ObjNotifyServerStarting extends Notification {
    constructor(Agent) {
        super("server.starting");

        this.SetData({
            "Title": "Satisfactory Server Is Starting!",
            "AgentName": Agent.getDisplayName(),
            "Text": "The Satisfactory Dedicated Server Hosted On This Agent Is Starting!"
        })
    }
}


module.exports = ObjNotifyServerStarting;