const path = require("path");

global.__basedir = path.resolve(path.join(__dirname, "../"));

const Notification = require("../objects/obj_notification");

const startupNotification = new Notification("ssm.startup");


const data = {
    "Title": "SSM Has Started!"
}

startupNotification.build(data);

console.log(startupNotification)