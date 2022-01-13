const Notification = require("../obj_notification");

class ObjNotifyAgentStarted extends Notification {
    constructor(Agent) {
        super("agent.started");

        this.SetData({
            "Title": "A SSM Agent Was Started!",
            "AgentName": Agent.getDisplayName(),
            "Text": "A SSM Agent Was Successfully Started!"
        })
    }
}


module.exports = ObjNotifyAgentStarted;