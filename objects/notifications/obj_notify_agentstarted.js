const Notification = require("../obj_notification");

class ObjNotifyAgentStarted extends Notification {
    constructor(Agent) {
        super("agent.started");

        this.set("title", "A SSM Agent Was Started!");
        this.set("description", "A SSM Agent Was Successfully Started!");
        this.set("details", {
            agent_name: Agent.getDisplayName(),
        });
    }
}

module.exports = ObjNotifyAgentStarted;
