const ObjUserRole = require("./obj_user_role");

class ObjUser {
    constructor() {
        /** @type {Number} - User ID */
        this._id = -1;
        /** @type {String} - Username */
        this._username = "";
        /** @type {String} - Password */
        this._password = "";
        /** @type {Number} - Role ID */
        this._role_id = -1;
        /** @type {ObjUserRole} - Role */
        this._role = null;
    }

    /**
     * 
     * @param {Object} data SQL data
     */
    parseDBData(data) {

        this._id = data.user_id;
        this._username = data.user_name;
        this._password = data.user_pass;
        this._role_id = data.user_role_id;
    }

    /**
     * Gets the User ID
     * @returns {Number} id
     */
    getId() {
        return this._id;
    }

    /**
     * 
     * @returns {String} - Username
     */
    getUsername() {
        return this._username;
    }

    /**
     * 
     * @returns {String} - Password
     */
    getPassword() {
        return this._password;
    }

    /**
     * Gets the User Role ID
     * @returns {Number} id
     */
    getRoleId() {
        return this._role_id;
    }


    /**
     * 
     * @returns {ObjUserRole} User Role
     */
    getRole() {
        return this._role;
    }

    /**
     * 
     * @param {ObjUserRole} Role 
     */
    SetRole(Role) {
        this._role = Role;
    }
    /**
     * 
     * @param {String} RequiredPermission 
     * @returns {Boolean} - Has Requested Permission
     */
    HasPermission(RequiredPermission) {
        const Role = this.getRole();
        return Role.HasPermission(RequiredPermission);
    }


    getWebJson() {
        return {
            id: this.getId(),
            username: this.getUsername(),
            role: this.getRole().getWebJson()
        }
    }


}

module.exports = ObjUser;