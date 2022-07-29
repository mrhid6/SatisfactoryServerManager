const { Docker } = require("node-docker-api");

const platform = process.platform;

let dockerSettings = {
    host: "http://127.0.0.1",
    port: 2375,
};

if (platform != "win32") {
    dockerSettings = {
        socketPath: "/var/run/docker.sock",
    };
}

/*
const docker = new Docker(dockerSettings);

docker.container.list({
        all: 1
    })
    .then(containers => {
        const container = containers[0];
        const VolumeID = container.data.Mounts[0].Name;
        return docker.volume.get(VolumeID);
    }).then(volume => {
        console.log(volume)
        /*container.delete({
            force: true
        })
    })
    .catch(error => console.log(error));



docker.volume.list({
    all: 1
}).then(volumes => {
    console.log(volumes)
}).catch(console.log)
*/
