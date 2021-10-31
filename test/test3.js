const {
    Docker
} = require('node-docker-api');

const docker = new Docker({
    host: "http://127.0.0.1",
    port: 2375
});

docker.container.list({
        all: 1
    })
    .then(containers => {
        console.log(containers[0].data)
    })
    .catch(error => console.log(error));