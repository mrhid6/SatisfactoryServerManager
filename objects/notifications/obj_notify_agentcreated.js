const Notification = require("../obj_notification");

class ObjNotifyAgentCreated extends Notification {
    constructor(AgentName) {
        super("agent.created");

        this.SetData({
            "Title": "A New SSM Agent Was Created!",
            "AgentName": AgentName,
            "Text": "A New SSM Agent Was Created Successfully!"
        })
    }
}


module.exports = ObjNotifyAgentCreated;