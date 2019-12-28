const {
    request
} = require('graphql-request');


class FicsitHandler {
    constructor() {
        this.FICSIT_URL = "https://api.ficsit.app/v2/query"
    }

    getLatestSMLVersion() {
        return new Promise((resolve, reject) => {
            const query = `{
            getSMLVersions(filter:{limit:1}){
                sml_versions {
                  id version
                }
              }
          }`

            request(this.FICSIT_URL, query).then(data => {

                const d = data.getSMLVersions.sml_versions[0];
                resolve(d)
            }).catch(err => {
                reject(err)
            })
        })
    }

    getSMLVersions() {
        return new Promise((resolve, reject) => {
            const query = `{
            getSMLVersions(filter:{limit:100}){
                sml_versions {
                  id version
                }
              }
          }`

            request(this.FICSIT_URL, query).then(data => {

                const d = data.getSMLVersions.sml_versions;
                resolve(d)
            }).catch(err => {
                reject(err)
            })
        })
    }

    getModsList() {
        return new Promise((resolve, reject) => {
            const query = `{
                getMods(filter:{limit:100}){
                    mods{
                      id name
                    }
                  }
              }`

            request(this.FICSIT_URL, query).then(data => {
                const d = data.getMods.mods
                resolve(d)
            }).catch(err => {
                reject(err)
            })
        })
    }

    getFullModsList() {
        return new Promise((resolve, reject) => {
            const query = `{
                getMods(filter:{limit:100}){
                    mods{
                      id name
                      versions(filter: { limit: 100 }) {
                        id
                        version
                        link
                      }
                    }
                  }
              }`

            request(this.FICSIT_URL, query).then(data => {
                const d = data.getMods.mods
                resolve(d)
            }).catch(err => {
                reject(err)
            })
        })
    }

    getModInfo(modid) {
        return new Promise((resolve, reject) => {
            const query = `{
                getMod(modId: "` + modid + `") {
                    id
                    name
                    logo
                    versions(filter: { limit: 100 }) {
                      id
                      version
                      link
                    }
                  }
              }`

            request(this.FICSIT_URL, query).then(data => {
                const d = data.getMod
                resolve(d)
            }).catch(err => {
                reject(err)
            })
        })
    }
}

const ficsit_Handler = new FicsitHandler();
module.exports = ficsit_Handler;