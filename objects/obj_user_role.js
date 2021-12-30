class ObjUserRole {
    constructor() {
        this._id = -1;
        this._name = "";
        this._permissions = [];
    }

    /**
     * 
     * @param {Object} data SQL data
     */
    parseDBData(data) {
        this._id = data.role_id;
        this._name = data.role_name;

    }

    /**
     * 
     * @param {Array} Permissions 
     */
    SetPermissions(Permissions) {
        this._permissions = Permissions;
    }

    /**
     * 
     * @param {String} RequiredPermission 
     * @returns {Boolean} - Has Permissions Requested
     */

    HasPermission(RequiredPermission) {
        return (this._permissions.includes(RequiredPermission));
    }
}

module.exports = ObjUserRole;