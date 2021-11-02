const {
    Docker
} = require('node-docker-api');

const platform = process.platform;

let dockerSettings = {
    host: "http://127.0.0.1",
    port: 2375
}

if (platform != "win32") {
    dockerSettings = {
        socketPath: "/var/run/docker.sock"
    }
}



const docker = new Docker(dockerSettings);

docker.container.list({
        all: 1
    })
    .then(containers => {
        console.log(containers[0].data)
    })
    .catch(error => console.log(error));