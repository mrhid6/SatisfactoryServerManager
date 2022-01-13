const hbs = require('handlebars');
const path = require("path");
const fs = require("fs-extra");
const objectpath = require("object-path");

class Notification {
    constructor(eventName) {
        this._eventName = eventName;
        this._TemplateHtmlPath = path.join(__basedir, "notifications", this._eventName + ".hbs");
        this._html = "";

        this._data = {};
    }

    SetData(data) {
        this._data = data;
    }

    GetEventName() {
        return this._eventName;
    }

    get(key, defaultval) {
        let return_val = objectpath.get(this._data, key);
        if (return_val == null && defaultval != null) {
            this.set(key, defaultval);
        }
        return objectpath.get(this._data, key);
    }

    set(key, val) {
        objectpath.set(this._data, key, val);
    }

    build() {
        if (fs.existsSync(this._TemplateHtmlPath)) {
            const source = fs.readFileSync(this._TemplateHtmlPath, "utf8");
            const template = hbs.compile(source);
            this._html = template(this._data);
        }
    }

    applyJsonTemplate(template, backing) {
        for (var i in template) {
            var m = /^{(.+)}$/.exec(template[i]);
            if (m && backing[m[1]]) {
                // replace with a deep clone of the value from the backing model
                template[i] = JSON.parse(JSON.stringify(backing[m[1]]));
            } else if (template[i] && "object" == typeof template[i]) {
                // traverse down recursively
                applyTemplate(template[i], backing);
            }
        }
        return template;
    }
}

module.exports = Notification;