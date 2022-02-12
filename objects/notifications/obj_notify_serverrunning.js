const Notification = require("../obj_notification");

class ObjNotifyServerRunning extends Notification {
    constructor(Agent) {
        super("server.running");

        this.set("title", "Satisfactory Server Is Running!");
        this.set("description", "The Satisfactory Dedicated Server Hosted On This Agent Is Running!");
        this.set("details", {
            agent_name: Agent.getDisplayName()
        });
    }
}


module.exports = ObjNotifyServerRunning;