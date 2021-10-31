const {
    Docker
} = require('node-docker-api');

const docker = new Docker({
    host: "http://127.0.0.1",
    port: 2375
});

docker.container.create({
        Image: 'ubuntu',
        name: 'test'
    })
    .then(container => container.start())
    .then(container => container.stop())
    .then(container => container.restart())
    .then(container => container.delete({
        force: true
    }))
    .catch(error => console.log(error));