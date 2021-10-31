class ObjectAgent {
    constructor(container) {
        this._container = container;
    }

    getContainer() {
        return this._container;
    }

    getContainerInfo() {
        return this._container.data;
    }

    isRunning() {

    }

    getId() {
        const name = getContainerInfo().Names[0];
        const id = parseInt(name.replace("/SSMAgent", ""))
        return id;
    }

    getPort() {
        const ports = this.getContainerInfo().Ports;
        if (ports == null) {
            return 0;
        }
        return (ports.find(p => p.PrivatePort == 3000)).PublicPort;
    }

    getURL() {
        const port = this.getPort();
        this._url = "http://localhost:" + port + "/"

        return this._url;
    }
}

module.exports = ObjectAgent;