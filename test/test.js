

repo.listReleases((err, releases) => {
    console.log(releases[0].tag_name)
})