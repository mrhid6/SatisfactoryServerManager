const Notification = require("../obj_notification");

class ObjNotifyAgentCreated extends Notification {
    constructor(AgentName) {
        super("agent.created");

        this.set("title", "A New SSM Agent Was Created!");
        this.set("description", "A New SSM Agent Was Successfully Created!");
        this.set("details", {
            agent_name: AgentName
        });
    }
}


module.exports = ObjNotifyAgentCreated;