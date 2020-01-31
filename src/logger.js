const Logger = {};

Logger.TYPES = {
    LOG: 0,
    INFO: 1,
    SUCCESS: 2,
    WARNING: 3,
    ERROR: 4,
    DEBUG: 5,
    RESET: 6
}

Logger.LEVEL = Logger.TYPES.DEBUG;

Logger.STYLES = [
    "padding: 2px 8px; margin-right:8px; background:#cccccc; color:#000; font-weight:bold; border:1px solid #000;",
    "padding: 2px 8px; margin-right:8px; background:#008cba; color:#fff; font-weight:bold; border:1px solid #000;",
    "padding: 2px 8px; margin-right:8px; background:#43ac6a; color:#fff; font-weight:bold; border:1px solid #3c9a5f;",
    "padding: 2px 8px; margin-right:8px; background:#E99002; color:#fff; font-weight:bold; border:1px solid #d08002;",
    "padding: 2px 8px; margin-right:8px; background:#F04124; color:#fff; font-weight:bold; border:1px solid #ea2f10;",
    "padding: 2px 8px; margin-right:8px; background:#003aba; color:#fff; font-weight:bold; border:1px solid #000;",
    ""
]

Logger.init = () => {
    Logger.displayBanner();
}

Logger.displayBanner = () => {
    Logger.BannerMessage = `
%c #-----------------------------# 
 #      _____ _____ __  __     # 
 #     / ____/ ____|  \\/  |    # 
 #    | (___| (___ | \\  / |    # 
 #     \\___ \\\\___ \\| |\\/| |    # 
 #     ____) |___) | |  | |    # 
 #    |_____/_____/|_|  |_|    # 
 #-----------------------------# 
 # Satisfactory Server Manager # 
 #-----------------------------# 
`

    console.log(Logger.BannerMessage, "background:#008cba;color:#fff;font-weight:bold");
}

Logger.getLoggerTypeString = (LoggerType) => {
    switch (LoggerType) {
        case 0:
            return "LOG"
        case 1:
            return "INFO"
        case 2:
            return "SUCCESS"
        case 3:
            return "WARN"
        case 4:
            return "ERROR"
        case 5:
            return "DEBUG"
    }
}

Logger.toLog = (LoggerType, Message) => {
    if (LoggerType == null) return;

    if (LoggerType > Logger.LEVEL) return;

    const style = Logger.STYLES[LoggerType];
    const resetStyle = Logger.STYLES[Logger.TYPES.RESET];
    const typeString = Logger.getLoggerTypeString(LoggerType);

    console.log("%c" + typeString + "%c" + Message, style, resetStyle);
}

Logger.log = (Message) => {
    Logger.toLog(Logger.TYPES.LOG, Message);
}

Logger.info = (Message) => {
    Logger.toLog(Logger.TYPES.INFO, Message);
}

Logger.success = (Message) => {
    Logger.toLog(Logger.TYPES.SUCCESS, Message);
}

Logger.warning = (Message) => {
    Logger.toLog(Logger.TYPES.WARNING, Message);
}

Logger.error = (Message) => {
    Logger.toLog(Logger.TYPES.ERROR, Message);
}

Logger.debug = (Message) => {
    Logger.toLog(Logger.TYPES.DEBUG, Message);
}

module.exports = Logger;