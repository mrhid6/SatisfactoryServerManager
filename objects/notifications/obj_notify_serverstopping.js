const Notification = require("../obj_notification");

class ObjNotifyServerStopping extends Notification {
    constructor(Agent) {
        super("server.stopping");

        this.set("title", "Satisfactory Server Is Stopping!");
        this.set(
            "description",
            "The Satisfactory Dedicated Server Hosted On This Agent Is Stopping!"
        );
        this.set("details", {
            agent_name: Agent.getDisplayName(),
        });
    }
}

module.exports = ObjNotifyServerStopping;
