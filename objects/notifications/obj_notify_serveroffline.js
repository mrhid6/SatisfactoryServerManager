const Notification = require("../obj_notification");

class ObjNotifyServerOffline extends Notification {
    constructor(Agent) {
        super("server.offline");

        this.set("title", "Satisfactory Server Is Offline!");
        this.set("description", "The Satisfactory Dedicated Server Hosted On This Agent Is Offline!");
        this.set("details", {
            agent_name: Agent.getDisplayName()
        });
    }
}


module.exports = ObjNotifyServerOffline;