const Notification = require("../obj_notification");

class ObjNotifyServerStopping extends Notification {
    constructor(Agent) {
        super("server.stopping");

        this.SetData({
            "Title": "Satisfactory Server Is Stopping!",
            "AgentName": Agent.getDisplayName(),
            "Text": "The Satisfactory Dedicated Server Hosted On This Agent Is Stopping!"
        })
    }
}


module.exports = ObjNotifyServerStopping;