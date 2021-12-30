const Config = require("../server/server_config");
const DB = require("../server/server_db");
const logger = require("../server/server_logger");
const ObjUser = require("../objects/obj_user");
const ObjUserRole = require("../objects/obj_user_role");


class UserManager {

    constructor() {
        /** @type {Array.<ObjUser>} */
        this._USERS = [];
    }

    init() {
        this.GetAllUsersFromDB().then(users => {
            this._USERS = users;
        })
    }

    reinit() {
        return new Promise((resolve, reject) => {
            this.GetAllUsersFromDB().then(users => {
                this._USERS = users;
                resolve();
            })
        })
    }

    GetAllUsersFromDB() {
        return new Promise((resolve, reject) => {
            DB.query("SELECT * FROM users").then(rows => {
                const USERS = [];
                const UserRolePromises = [];

                rows.forEach(row => {
                    const User = new ObjUser();
                    User.parseDBData(row);
                    UserRolePromises.push(this.GetRoleForUser(User))
                    USERS.push(User);
                })

                Promise.all(UserRolePromises).then(values => {
                    for (let i = 0; i < values.length; i++) {
                        const role = values[i];
                        USERS[i].SetRole(role);
                    }
                    resolve(USERS);
                })

            }).catch(err => {
                console.log(err);
            })
        });
    }


    /**
     * @param {ObjUser} User 
     */
    GetRoleForUser(User) {
        return new Promise((resolve, reject) => {
            DB.querySingle("SELECT * FROM roles WHERE role_id=?", [User.getRoleId()]).then(roleRow => {
                const Role = new ObjUserRole();
                Role.parseDBData(roleRow);

                const perms = JSON.parse(roleRow.role_permissions);
                const permPromises = [];

                perms.forEach(perm => {
                    perm = perm.replace("*", "%");
                    permPromises.push(this.GetPermissions(perm))
                })

                Promise.all(permPromises).then(values => {
                    const Permissions = [];
                    for (let i = 0; i < values.length; i++) {
                        const perms = values[i];

                        for (let j = 0; j < perms.length; j++) {
                            const perm = perms[j];
                            if (Permissions.includes(perm) == false) {
                                Permissions.push(perm);
                            }
                        }
                    }

                    Role.SetPermissions(Permissions);
                    resolve(Role);
                })
            });
        });
    }

    GetPermissions(PermissionShort) {
        return new Promise((resolve, reject) => {
            const Permissions = [];
            DB.query("SELECT * FROM permissions WHERE perm_name LIKE ?", [PermissionShort]).then(permRows => {
                permRows.forEach(permRow => {
                    if (Permissions.includes(permRow.perm_name) == false) {
                        Permissions.push(permRow.perm_name)
                    }
                })

                resolve(Permissions);
            })
        })
    }

    /**
     * 
     * @returns {Array.<ObjUser>} - User Array
     */
    getAllUsers() {
        return this._USERS;
    }

    /**
     * 
     * @returns {ObjUser} - User
     */
    getUserByUername(username) {
        return this.getAllUsers().find(user => user.getUsername() == username);
    }

    /**
     * 
     * @returns {ObjUser} - User
     */
    getUserById(id) {
        return this.getAllUsers().find(user => user.getId() == id);
    }


    UpdateUserPassword(User, NewPassword) {
        return new Promise((resolve, reject) => {
            DB.query("UPDATE users SET user_pass=? WHERE user_id=?", [NewPassword, User.getId()]).then(() => {
                return this.reinit();
            }).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            })
        })
    }
}

const userManager = new UserManager();

module.exports = userManager;