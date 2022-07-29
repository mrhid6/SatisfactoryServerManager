const Notification = require("../obj_notification");

class ObjNotifyServerStarting extends Notification {
    constructor(Agent) {
        super("server.starting");

        this.set("title", "Satisfactory Server Is Starting!");
        this.set(
            "description",
            "The Satisfactory Dedicated Server Hosted On This Agent Is Starting!"
        );
        this.set("details", {
            agent_name: Agent.getDisplayName(),
        });
    }
}

module.exports = ObjNotifyServerStarting;
