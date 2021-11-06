class ObjectAgent {
    constructor(container) {
        this._container = container;
        this._active = false;
        this._info = {};
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

    isRunning() {
        return this.getContainerInfo().State == "running" && this.getContainerInfo().Ports != null
    }

    getName() {
        const name = this.getContainerInfo().Names[0];
        return name.replace("/", "")
    }

    getId() {
        const name = this.getContainerInfo().Names[0];
        const id = parseInt(name.replace("/SSMAgent", ""))
        return id;
    }

    getPort() {
        return this.getPortByPrivatePort(3000);
    }

    getPortByPrivatePort(port) {
        const ports = this.getContainerInfo().Ports;
        if (ports == null || ports.length == 0) {
            return 0;
        }
        return (ports.find(p => p.PrivatePort == port)).PublicPort;
    }

    getPortByPrivatePortAgentId(port) {
        const ports = this.getContainerInfo().Ports;
        if (ports == null || ports.length == 0) {
            return 0;
        }

        const PortID = port + this.getId()


        const resPort = ports.find(p => p.PrivatePort == PortID)

        if (resPort == null) {
            console.log(PortID)
            return 0;
        } else {
            return resPort.PublicPort;
        }



    }

    getURL() {
        const port = this.getPort();
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
            ports: {
                AgentPort: this.getPortByPrivatePort(3000),
                ServerQueryPort: this.getPortByPrivatePortAgentId(15776),
                BeaconPort: this.getPortByPrivatePortAgentId(14999),
                ServerPort: this.getPortByPrivatePortAgentId(7776)
            },
            info: this.getInfo()
        }
    }
}

module.exports = ObjectAgent;