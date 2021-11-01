const {
    Docker
} = require('node-docker-api');

const docker = new Docker({
    socketPath: "/var/run/docker.sock"
});

docker.container.list({
        all: 1
    })
    .then(containers => {
        console.log(containers[0].data)
    })
    .catch(error => console.log(error));