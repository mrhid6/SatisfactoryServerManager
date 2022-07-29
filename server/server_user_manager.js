const CryptoJS = require("crypto-js");

const Config = require("../server/server_config");
const DB = require("../server/server_db");
const logger = require("../server/server_logger");
const ObjUser = require("../objects/obj_user");
const ObjUserRole = require("../objects/obj_user_role");

class UserManager {
    constructor() {
        /** @type {Array.<ObjUser>} */
        this._USERS = [];

        /** @type {Array.<ObjUserRole>} */
        this._ROLES = [];
    }

    init() {
        this.reinit();
    }

    reinit() {
        return new Promise((resolve, reject) => {
            this.GetAllUsersFromDB()
                .then((users) => {
                    this._USERS = users;
                    return this.GetAllRoles();
                })
                .then((roles) => {
                    this._ROLES = roles;
                    resolve();
                });
        });
    }

    GetAllUsersFromDB() {
        return new Promise((resolve, reject) => {
            DB.query("SELECT * FROM users")
                .then((rows) => {
                    const USERS = [];
                    const UserRolePromises = [];

                    rows.forEach((row) => {
                        const User = new ObjUser();
                        User.parseDBData(row);
                        UserRolePromises.push(
                            this.GetDBRoleByID(User.getRoleId())
                        );
                        USERS.push(User);
                    });

                    Promise.all(UserRolePromises).then((values) => {
                        for (let i = 0; i < values.length; i++) {
                            const role = values[i];
                            USERS[i].SetRole(role);
                        }
                        resolve(USERS);
                    });
                })
                .catch((err) => {
                    console.log(err);
                });
        });
    }

    GetAllRoles() {
        return new Promise((resolve, reject) => {
            DB.query("SELECT * FROM roles").then((roleRows) => {
                const ROLES = [];
                const rolesPromises = [];
                roleRows.forEach((roleRow) => {
                    rolesPromises.push(this.GetDBRoleByID(roleRow.role_id));
                });

                Promise.all(rolesPromises).then((values) => {
                    for (let i = 0; i < values.length; i++) {
                        const role = values[i];
                        ROLES.push(role);
                    }

                    resolve(ROLES);
                });
            });
        });
    }

    GetDBRoleByID(RoleID) {
        return new Promise((resolve, reject) => {
            DB.querySingle("SELECT * FROM roles WHERE role_id=?", [
                RoleID,
            ]).then((roleRow) => {
                const Role = new ObjUserRole();
                Role.parseDBData(roleRow);

                const perms = JSON.parse(roleRow.role_permissions);
                const permPromises = [];

                perms.forEach((perm) => {
                    perm = perm.replace("*", "%");
                    permPromises.push(this.GetPermissions(perm));
                });

                Promise.all(permPromises).then((values) => {
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
                });
            });
        });
    }

    GetPermissions(PermissionShort) {
        return new Promise((resolve, reject) => {
            const Permissions = [];
            DB.query("SELECT * FROM permissions WHERE perm_name LIKE ?", [
                PermissionShort,
            ]).then((permRows) => {
                permRows.forEach((permRow) => {
                    if (Permissions.includes(permRow.perm_name) == false) {
                        Permissions.push(permRow.perm_name);
                    }
                });

                resolve(Permissions);
            });
        });
    }

    /**
     *
     * @returns {Array.<ObjUserRole>} - User Array
     */
    getAllUserRoles() {
        return this._ROLES;
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
    getUserByUsername(username) {
        return this.getAllUsers().find(
            (user) => user.getUsername() == username
        );
    }

    /**
     *
     * @returns {ObjUser} - User
     */
    getUserById(id) {
        return this.getAllUsers().find((user) => user.getId() == id);
    }

    API_GetAllUsers() {
        return new Promise((resolve, reject) => {
            const users = [];
            this.getAllUsers().forEach((user) => {
                users.push(user.getWebJson());
            });

            resolve(users);
        });
    }

    API_GetAllRoles() {
        return new Promise((resolve, reject) => {
            const roles = [];
            this.getAllUserRoles().forEach((role) => {
                roles.push(role.getWebJson());
            });

            resolve(roles);
        });
    }

    API_GetAllUsers() {
        return new Promise((resolve, reject) => {
            const users = [];
            this.getAllUsers().forEach((user) => {
                users.push(user.getWebJson());
            });

            resolve(users);
        });
    }

    API_GetAllPermissions() {
        return new Promise((resolve, reject) => {
            this.GetPermissions("%").then((perms) => {
                resolve(perms);
            });
        });
    }

    UpdateUserPassword(User, NewPassword) {
        return new Promise((resolve, reject) => {
            DB.queryRun("UPDATE users SET user_pass=? WHERE user_id=?", [
                NewPassword,
                User.getId(),
            ])
                .then(() => {
                    return this.reinit();
                })
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    API_CreateUser(data) {
        return new Promise((resolve, reject) => {
            const ExistingUser = this.getUserByUsername(data.username);
            if (ExistingUser != null) {
                reject(new Error("User already exists!"));
                return;
            }

            const defaultpasshash = CryptoJS.MD5(
                `SSM:${data.username}-ssm`
            ).toString();

            DB.queryRun(
                "INSERT INTO users(user_name, user_pass, user_role_id) VALUES (?,?,?)",
                [data.username, defaultpasshash, data.roleid]
            )
                .then(() => {
                    return this.reinit();
                })
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }
}

const userManager = new UserManager();

module.exports = userManager;
