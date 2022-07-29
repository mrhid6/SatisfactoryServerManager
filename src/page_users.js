const API_Proxy = require("./api_proxy");

class Page_Users {
    constructor() {
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
            });
    }

    MainDisplayFunction() {
        this.DisplayUsersTable();
        this.DisplayRolesTable();
        this.GetPermissions();
    }

    DisplayUsersTable() {
        API_Proxy.get("info/users").then((res) => {
            const isDataTable = $.fn.dataTable.isDataTable("#users-table");
            const tableData = [];

            const users = res.data;

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
}

const page = new Page_Users();

module.exports = page;
