const API_Proxy = require("./api_proxy");
const logger = require("./logger");

class Page_Users {
    constructor() {
        this._USERS = [];
        this._ROLES = [];
        this._PERMISSIONS = [];
    }

    init() {
        this.setupJqueryListeners();
        this.SetupEventHandlers();

        this.MainDisplayFunction();
    }

    SetupEventHandlers() {}

    setupJqueryListeners() {
        $("body")
            .on("click", "#btn-adduser", (e) => {
                const $btn = $(e.currentTarget);
                this.OpenAddUserModal($btn);
            })
            .on("click", "#btn-addrole", (e) => {
                const $btn = $(e.currentTarget);
                this.OpenAddRoleModal($btn);
            })
            .on("change", ".perm-category-checkbox", (e) => {
                e.preventDefault();
                const $btn = $(e.currentTarget);
                this.SelectCategoryCheckboxes($btn);
            })
            .on("change", ".perm-checkbox", (e) => {
                e.preventDefault();
                const $btn = $(e.currentTarget);
                this.CheckAllPermsChecked($btn);
            })
            .on("click", "#submit-add-role-btn", (e) => {
                e.preventDefault();
                this.SubmitAddRole();
            })
            .on("click", "#submit-add-user-btn", (e) => {
                e.preventDefault();
                this.SubmitAddUser();
            })
            .on("click", "#btn-addapikey", (e) => {
                const $btn = $(e.currentTarget);
                this.OpenAddAPIKeyModal($btn);
            })
            .on("click", "#submit-add-apikey-btn", (e) => {
                const $btn = $(e.currentTarget);
                this.SubmitAddApiKey();
            })
            .on("click", "#confirm-action", (e) => {
                const $btn = $(e.currentTarget);
                const action = $btn.attr("data-action");

                if (action == "revokeapikey") {
                    this.RevokeAPIKey($btn);
                }
            })
            .on("click", ".btn-revoke-apikey", (e) => {
                const $btn = $(e.currentTarget);
                window.openModal(
                    "/public/modals",
                    "server-action-confirm",
                    (modal) => {
                        modal
                            .find("#confirm-action")
                            .attr("data-action", "revokeapikey")
                            .attr(
                                "data-apikey-id",
                                $btn.attr("data-apikey-id")
                            );
                    }
                );
            })
            .on("click", ".btn-generateapikey", (e) => {
                e.preventDefault();
                const newAPIKey = this.GenerateAPIKey();
                $("#inp_apikey").val(newAPIKey);

                if (!navigator.clipboard) {
                    // use old commandExec() way
                } else {
                    navigator.clipboard
                        .writeText($("#inp_apikey").val())
                        .then(function () {
                            $("#inp_apikey").addClass("is-valid");
                            $("#inp_apikey")
                                .parent()
                                .parent()
                                .find(".valid-feedback")
                                .text("Copied to clipboard!")
                                .show();

                            $("#inp_apikey")
                                .parent()
                                .parent()
                                .addClass("has-success");

                            $("#submit-add-apikey-btn").prop("disabled", false);
                        });
                }
            });
    }

    MainDisplayFunction() {
        this.DisplayUsersTable();
        this.DisplayRolesTable();
        this.DisplayAPIKeysTable();
        this.GetPermissions();
    }

    DisplayUsersTable() {
        API_Proxy.get("info/users").then((res) => {
            const isDataTable = $.fn.dataTable.isDataTable("#users-table");
            const tableData = [];

            const users = res.data;
            this._USERS = users;

            users.forEach((user) => {
                const $btn_info = $("<button/>")
                    .addClass("btn btn-light btn-block configure-user")
                    .attr("data-user-id", user.id)
                    .html("<i class='fas fa-cog'></i>");

                const OpenUserStr = $btn_info.prop("outerHTML");

                tableData.push([
                    user.id,
                    user.username,
                    user.role.name,
                    OpenUserStr,
                ]);
            });

            if (isDataTable == false) {
                $("#users-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [[0, "desc"]],
                    columnDefs: [],
                    data: tableData,
                });
            } else {
                const datatable = $("#users-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        });
    }

    DisplayRolesTable() {
        API_Proxy.get("info/roles").then((res) => {
            const isDataTable = $.fn.dataTable.isDataTable("#roles-table");
            const tableData = [];

            const roles = res.data;
            this._ROLES = roles;

            roles.forEach((role) => {
                const $btn_info = $("<button/>")
                    .addClass("btn btn-light btn-block configure-role")
                    .attr("data-role-id", role.id)
                    .html("<i class='fas fa-cog'></i>");

                const OpenUserStr = $btn_info.prop("outerHTML");

                tableData.push([
                    role.id,
                    role.name,
                    role.permissions.length,
                    OpenUserStr,
                ]);
            });

            if (isDataTable == false) {
                $("#roles-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [[0, "desc"]],
                    columnDefs: [],
                    data: tableData,
                });
            } else {
                const datatable = $("#roles-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        });
    }

    DisplayAPIKeysTable() {
        API_Proxy.get("info/apikeys").then((res) => {
            const isDataTable = $.fn.dataTable.isDataTable("#apikeys-table");
            const tableData = [];

            const apikeys = res.data;

            apikeys.forEach((apikey) => {
                const $btn_info = $("<button/>")
                    .addClass("btn btn-danger btn-block btn-revoke-apikey")
                    .attr("data-apikey-id", apikey.id)
                    .html("<i class='fas fa-trash'></i>");

                const revokeApiStr = $btn_info.prop("outerHTML");
                const User = this._USERS.find(
                    (user) => user.id == apikey.user_id
                );
                tableData.push([
                    apikey.id,
                    User.username,
                    apikey.shortkey,
                    revokeApiStr,
                ]);
            });

            if (isDataTable == false) {
                $("#apikeys-table").DataTable({
                    paging: true,
                    searching: false,
                    info: false,
                    order: [[0, "desc"]],
                    columnDefs: [],
                    data: tableData,
                });
            } else {
                const datatable = $("#apikeys-table").DataTable();
                datatable.clear();
                datatable.rows.add(tableData);
                datatable.draw();
            }
        });
    }

    GetPermissions() {
        API_Proxy.get("info/permissions").then((res) => {
            if (res.result == "success") {
                this._PERMISSIONS = [];

                res.data.forEach((perm) => {
                    const fullPerm = perm;
                    const permSplit = perm.split(".");
                    permSplit.pop();
                    permSplit.push("*");
                    const WildcardPerm = permSplit.join(".");

                    if (this._PERMISSIONS.includes(WildcardPerm) == false) {
                        this._PERMISSIONS.push(WildcardPerm);
                    }

                    this._PERMISSIONS.push(fullPerm);
                });
            }
        });
    }

    OpenAddUserModal(btn) {
        window.openModal("/public/modals", "add-user-modal", (modal) => {
            const $roleSelect = modal.find("#sel_role");

            this._ROLES.forEach((role) => {
                $roleSelect.append(
                    `<option value='${role.id}'>${role.name}</option>`
                );
            });
        });
    }

    OpenAddRoleModal(btn) {
        window.openModal("/public/modals", "add-role-modal", (modal) => {
            const $permissionsaccordion = modal.find("#permissions-accordion");
            $permissionsaccordion.empty();

            const data = {};
            const categories = [];
            this._PERMISSIONS.forEach((perm) => {
                if (perm.includes(".*")) {
                    const permSplit = perm.split(".");
                    permSplit.pop();
                    const category = permSplit.join(".");

                    categories.push(perm);
                    data[`${category}`] = [];
                } else {
                    const permSplit = perm.split(".");
                    permSplit.pop();
                    const category = permSplit.join(".");
                    data[`${category}`].push(perm);
                }
            });

            for (const [key, value] of Object.entries(data)) {
                const $item = this.MakePermissionCategory(key, value);

                $permissionsaccordion.append($item);
            }
        });
    }

    MakePermissionCategory(category, perms) {
        //console.log(category, perms)

        const cleanCategory = category.replace(".", "-");

        const $item = $("<div/>").addClass("accordion-item");
        const $header = $("<h4/>")
            .addClass("accordion-header")
            .attr("id", `perm-${cleanCategory}`);
        $item.append($header);
        const $categoryCheckbox = $("<input/>")
            .addClass("form-check-input perm-category-checkbox")
            .attr("type", "checkbox")
            .attr("value", `${category}.*`)
            .attr("id", `category-checkbox-${cleanCategory}`);
        $header.append($categoryCheckbox);

        const $headerButton = $("<button/>")
            .addClass("accordion-button collapsed")
            .attr("type", "button")
            .attr("data-bs-toggle", "collapse")
            .attr("data-bs-target", `#perms-content-${cleanCategory}`)
            .attr("aria-expanded", "false")
            .attr("aria-controls", `perms-content-${cleanCategory}`);
        $header.append($headerButton);

        $headerButton.append(` ${category}.*`);

        const $content = $("<div/>")
            .addClass("accordion-collapse collapse")
            .attr("id", `perms-content-${cleanCategory}`)
            .attr("aria-labelledby", `perm-${cleanCategory}`)
            .attr("data-bs-parent", `permissions-accordion`);
        $item.append($content);

        const $contentBody = $("<div/>").addClass("accordion-body");
        $content.append($contentBody);

        for (let i = 0; i < perms.length; i++) {
            const perm = perms[i];
            const cleanPerm = perm.replace(".", "-");
            const $permCheckboxDiv = $("<div/>").addClass("form-check");
            $contentBody.append($permCheckboxDiv);

            const $permCheckbox = $("<input/>")
                .addClass("form-check-input perm-checkbox")
                .attr("type", "checkbox")
                .attr("value", `${perm}`)
                .attr("id", `perm-${cleanPerm}`);
            $permCheckboxDiv.append($permCheckbox);

            const $permCheckboxLabel = $("<label/>")
                .addClass("form-check-label")
                .attr("for", `perm-${cleanPerm}`);
            $permCheckboxLabel.text(perm);
            $permCheckboxDiv.append($permCheckboxLabel);
        }

        return $item;
    }

    SelectCategoryCheckboxes($el) {
        const $item = $el.parent().parent();
        $item.find(".perm-checkbox").prop("checked", $el.prop("checked"));
    }

    CheckAllPermsChecked($el) {
        const $item = $el.parent().parent().parent().parent();
        let canCheckCategory = true;
        $item.find(".perm-checkbox").each((index, input) => {
            const $input = $(input);
            if ($input.prop("checked") == false) {
                canCheckCategory = false;
            }
        });
        if (canCheckCategory) {
            $item.find(".perm-category-checkbox").prop("checked", true);
        } else {
            $item.find(".perm-category-checkbox").prop("checked", false);
        }
    }

    SubmitAddUser() {
        const Username = $("#inp_username").val();
        const RoleID = $("#sel_role").val();

        const postData = {
            username: Username,
            roleid: RoleID,
        };

        API_Proxy.postData("admin/adduser", postData)
            .then((res) => {
                console.log(res);
            })
            .catch((err) => {
                console.log(err);
            });
    }

    SubmitAddRole() {
        const $roleName = $("#inp_rolename");

        if ($roleName.val() == "") {
            $roleName.addClass("is-invalid");
            $roleName.parent().parent().addClass("has-danger");
            return;
        }

        $roleName.removeClass("is-invalid");
        $roleName.parent().parent().removeClass("has-danger");

        var selected = [];
        $("#permissions-accordion input:checked").each(function () {
            selected.push($(this).val());
        });

        const PermData = [];

        for (let i = 0; i < selected.length; i++) {
            const perm = selected[i];
            if (perm.includes("*") == false) {
                const permSplit = perm.split(".");
                permSplit.pop();
                const permPrefix = permSplit.join(".");
                if (selected.includes(`${permPrefix}.*`) == false) {
                    PermData.push(perm);
                }
            } else {
                PermData.push(perm);
            }
        }

        console.log(PermData);
    }

    OpenAddAPIKeyModal() {
        window.openModal("/public/modals", "add-apikey-modal", (modal) => {
            const $userSel = modal.find("#inp_apiuser");

            for (let i = 0; i < this._USERS.length; i++) {
                const user = this._USERS[i];
                $userSel.append(
                    `<option value='${user.id}'>${user.username}</option>`
                );
            }
        });
    }

    GenerateAPIKey() {
        const format = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
        var formatdata = format.split("-");

        var ret_str = "";

        for (var i = 0; i < formatdata.length; i++) {
            var d = formatdata[i];
            if (i > 0) {
                ret_str = ret_str + "-" + this.generateRandomString(d.length);
            } else {
                ret_str = ret_str + this.generateRandomString(d.length);
            }
        }

        formatdata = undefined;
        return `API-${ret_str}`;
    }

    generateRandomString(length) {
        var text = "";
        var possible =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < length; i++)
            text += possible.charAt(
                Math.floor(Math.random() * possible.length)
            );

        return text;
    }

    SubmitAddApiKey() {
        const userid = $("#inp_apiuser").val();
        const apiKey = $("#inp_apikey").val();

        if (userid == null || apiKey.trim() == "") {
            $("#inp_apikey").addClass("is-invalid");
            logger.error("Must Fill out new api key form!");
            return;
        }

        const postData = {
            userid: userid,
            apikey: apiKey,
        };

        API_Proxy.postData("admin/addapikey", postData).then((res) => {
            if (res.result == "success") {
                toastr.success("API Key Added!");
                $("#add-apikey-modal .btn-close").trigger("click");
                this.DisplayAPIKeysTable();
            } else {
                toastr.error("Failed To Add API Key!");
                logger.error(res.error);
            }
        });
    }

    RevokeAPIKey($btn) {
        const apikeyid = $btn.attr("data-apikey-id");

        API_Proxy.postData("admin/revokeapikey", { id: apikeyid }).then(
            (res) => {
                if (res.result == "success") {
                    toastr.success("API Key Revoked!");
                    $("#server-action-confirm .btn-close").trigger("click");
                    this.DisplayAPIKeysTable();
                } else {
                    toastr.error("Failed To Revoke API Key!");
                    logger.error(res.error);
                }
            }
        );
    }
}

const page = new Page_Users();

module.exports = page;
