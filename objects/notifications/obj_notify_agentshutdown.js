const Notification = require("../obj_notification");

class ObjNotifyAgentShutdown extends Notification {
    constructor(Agent) {
        super("agent.shutdown");

        this.set("title", "A SSM Agent Was Shutdown!");
        this.set("description", "A SSM Agent Was Successfully Shutdown!");
        this.set("details", {
            agent_name: Agent.getDisplayName()
        });
    }
}


module.exports = ObjNotifyAgentShutdown;