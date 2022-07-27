const iDockerHelper = require("mrhid6utils").DockerHelper;
const platform = process.platform;

const {
    Docker
} = require('node-docker-api');


const DockerHelper = new iDockerHelper();

class DockerAPI {

    constructor() {}

    ConnectDocker = async() => {
        let dockerSettings = {
            host: "http://127.0.0.1",
            port: 2375
        }

        if (platform != "win32") {
            dockerSettings = {
                socketPath: "/var/run/docker.sock"
            }
        }

        return new Docker(dockerSettings);
    };

    PullDockerImage = async() => {
        const DockerConnection = await this.ConnectDocker();
        await DockerHelper.PullDockerImage(DockerConnection, "mrhid6/ssmagent", "latest", {});
    };

    CheckDockerContainerExists = async(ContainerID) => {
        const DockerConnection = await this.ConnectDocker();
        return await DockerHelper.CheckDockerContainerExists(DockerConnection, ContainerID);
    };

    CheckDockerContainerExistsWithName = async(ContainerName) => {
        const DockerConnection = await this.ConnectDocker();
        return await DockerHelper.CheckDockerContainerExistsWithName(DockerConnection, ContainerName);
    };

    GetDockerContainersWithName = async(ContainerName) => {
        const DockerConnection = await this.ConnectDocker();
        return await DockerHelper.GetDockerContainersWithName(DockerConnection, ContainerName);
    };

    GetDockerContainerByID = async(ContainerID) => {
        const DockerConnection = await this.ConnectDocker();
        return await DockerHelper.GetDockerContainerByID(DockerConnection, ContainerID);
    };


    CreateDockerContainer = async(ContainerSettings) => {
        const DockerConnection = await this.ConnectDocker();
        await this.PullDockerImage();
        return await DockerHelper.CreateDockerContainer(DockerConnection, ContainerSettings, true);
    };

    StartDockerContainer = async(ContainerID) => {
        const DockerConnection = await this.ConnectDocker();
        return await DockerHelper.StartDockerContainer(DockerConnection, ContainerID)
    };

    StopDockerContainer = async(ContainerID) => {
        const DockerConnection = await this.ConnectDocker();
        return await DockerHelper.StopDockerContainer(DockerConnection, ContainerID)
    };

    WaitForContainerToStart = async(ContainerID) => {
        const DockerConnection = await this.ConnectDocker();
        await DockerHelper.WaitForContainerToStart(DockerConnection, ContainerID);
    }

    WaitForContainerToStop = async(ContainerID) => {
        const DockerConnection = await this.ConnectDocker();
        await DockerHelper.WaitForContainerToStop(DockerConnection, ContainerID);
    }

    DeleteDockerContainerById = async(ContainerID) => {
        const DockerConnection = await this.ConnectDocker();
        await DockerHelper.DeleteDockerContainerById(DockerConnection, ContainerID);
    }



}

const dockerAPI = new DockerAPI();
module.exports = dockerAPI;