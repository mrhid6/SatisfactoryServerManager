const GitHub = require("github-api");

const gh = new GitHub();

const repo = gh.getRepo("mrhid6", "satisfactoryservermanager");

repo.listReleases((err, releases) => {
    console.log(releases[0].tag_name)
})