const logger = require("./logger");

const EventEmitter = require("events");
const { stringify } = require("querystring");

class PageCache extends EventEmitter {
    constructor() {
        super();

        this.AgentList = [];
        this.ActiveAgent = null;
        this.SMLVersions = [];
        this.FicsitMods = GetLocalStorage("FicsitMods", []);
        this.InstalledMods = [];
    }

    setAgentsList(agentList) {
        this.AgentList = agentList;
        this.setActiveAgent(getCookie("currentAgentId"));
        this.emit("setagentslist");
    }

    getAgentsList() {
        return this.AgentList;
    }

    setActiveAgent(id) {
        if (id == null) {
            return;
        }

        const Agent = this.getAgentsList().find((agent) => agent.id == id);

        if (Agent == null && this.getAgentsList().length > 0) {
            this.ActiveAgent = this.getAgentsList()[0];
            setCookie("currentAgentId", this.ActiveAgent.id, 10);
            this.emit("setactiveagent");
            return;
        } else if (Agent == null) {
            return;
        }

        if (this.ActiveAgent != null && this.ActiveAgent.id == Agent.id) {
            return;
        }

        setCookie("currentAgentId", id, 10);

        this.ActiveAgent = Agent;
        this.emit("setactiveagent");
    }

    getActiveAgent() {
        return this.ActiveAgent;
    }

    setSMLVersions(versions) {
        this.SMLVersions = versions;
        this.emit("setsmlversions");
    }

    getSMLVersions() {
        return this.SMLVersions;
    }

    setFicsitMods(mods) {
        this.FicsitMods = mods;

        const StorageData = {
            data: this.FicsitMods,
        };

        StoreInLocalStorage("FicsitMods", StorageData, 1);
        this.emit("setficsitmods");
    }

    getFicsitMods() {
        return this.FicsitMods;
    }

    getAgentInstalledMods() {
        return this.InstalledMods;
    }

    SetAgentInstalledMods(mods) {
        this.InstalledMods = mods;
        this.emit("setinstalledmods");
    }
}

function StoreInLocalStorage(Key, Data, ExpiryHrs) {
    var date = new Date();
    date.setTime(date.getTime() + ExpiryHrs * 60 * 60 * 1000);
    Data.expiry = date.getTime();

    const DataStr = JSON.stringify(Data);

    localStorage.setItem(Key, DataStr);
}

function RemoveLocalStorage(Key) {
    localStorage.removeItem(Key);
}

function GetLocalStorage(Key, defaultReturn) {
    const LSdata = localStorage.getItem(Key);
    const data = JSON.parse(LSdata);

    if (data == null) {
        return defaultReturn;
    }

    var date = new Date();
    if (date.getTime() > data.expiry) {
        RemoveLocalStorage(Key);
        return defaultReturn;
    }

    return data.data;
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

const pageCache = new PageCache();

module.exports = pageCache;
