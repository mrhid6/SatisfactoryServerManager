const Notification = require("../obj_notification");

class ObjNotifyAgentShutdown extends Notification {
    constructor(Agent) {
        super("agent.shutdown");

        this.SetData({
            "Title": "A SSM Agent Was Shutdown!",
            "AgentName": Agent.getDisplayName(),
            "Text": "A SSM Agent Was Successfully Shutdown!"
        })
    }
}


module.exports = ObjNotifyAgentShutdown;