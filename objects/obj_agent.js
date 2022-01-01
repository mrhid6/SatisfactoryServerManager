class ObjectAgent {
    constructor(container) {
        this._id = -1;
        this._name = "";
        this._displayname = "";
        this._docker_id = -1;
        this._ssmport = -1;
        this._serverport = -1;
        this._beaconport = -1;
        this._port = -1;


        this._container = container;

        this._active = false;
        this._info = {};
    }

    parseDBData(data) {
        this._id = data.agent_id;
        this._name = data.agent_name;
        this._displayname = data.agent_displayname;
        this._docker_id = data.agent_docker_id;

        this._ssmport = data.agent_ssm_port;
        this._serverport = data.agent_serverport;
        this._beaconport = data.agent_beaconport;
        this._port = data.agent_port;
    }

    isActive() {
        return this._active
    }

    setActive(active) {
        this._active = active;
    }

    setContainer(container) {
        this._container = container;
    }

    getContainer() {
        return this._container;
    }

    getContainerInfo() {
        return this._container.data;
    }

    isValid() {
        if (this.getContainer() == null) {
            return false;
        }

        return true;
    }

    isRunning() {

        if (!this.isValid()) {
            return false;
        }

        return this.getContainerInfo().State == "running" && this.getContainerInfo().Ports != null
    }

    getName() {
        return this._name;
    }

    getDisplayName() {
        return this._displayname;
    }

    getId() {
        return this._id;
    }

    getDockerId() {
        return this._docker_id;
    }


    /** Start Ports */

    getSSMPort() {
        return this._ssmport;
    }

    getServerPort() {
        return this._serverport;
    }

    getBeaconPort() {
        return this._beaconport;
    }

    getPort() {
        return this._port;
    }


    /** End Ports */

    getURL() {
        const port = this.getSSMPort();
        this._url = "http://localhost:" + port + "/agent/"

        return this._url;
    }

    setInfo(info) {
        this._info = info;
    }

    getInfo() {
        return this._info;
    }

    getWebJson() {
        return {
            running: this.isRunning(),
            active: this.isActive(),
            id: this.getId(),
            name: this.getName(),
            displayname: this.getDisplayName(),
            ports: {
                AgentPort: this.getSSMPort(),
                ServerQueryPort: this.getServerPort(),
                BeaconPort: this.getBeaconPort(),
                ServerPort: this.getPort()
            },
            info: this.getInfo()
        }
    }
}

module.exports = ObjectAgent;