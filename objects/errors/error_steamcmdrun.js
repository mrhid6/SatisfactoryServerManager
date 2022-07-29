class SteamCMDError extends Error {
    constructor(exitCode) {
        // Auto-generate the error message and send it to the super class.
        // noinspection JSCheckFunctionSignatures
        super(getErrorMessage(exitCode));

        this.name = "SteamCmdError";
        this.exitCode = exitCode;
    }
}

function getErrorMessage(exitCode) {
    switch (exitCode) {
        case EXIT_CODES.NO_ERROR:
            return "No error";
        case EXIT_CODES.UNKNOWN_ERROR:
            return "An unknown error occurred";
        case EXIT_CODES.ALREADY_LOGGED_IN:
            return "A user was already logged into SteamCMD";
        case EXIT_CODES.NO_CONNECTION:
            return "SteamCMD cannot connect to the internet";
        case EXIT_CODES.INVALID_PASSWORD:
            return "Invalid password";
        case EXIT_CODES.FAILED_TO_INSTALL:
            return (
                "The application failed to install for some reason. Reasons " +
                "include: you do not own the application, you do not have enough " +
                "hard drive space, a network error occurred, or the application " +
                "is not available for your selected platform."
            );
        case EXIT_CODES.MISSING_PARAMETERS_OR_NOT_LOGGED_IN:
            return (
                "One of your commands has missing parameters or you are not " +
                "logged in"
            );
        case EXIT_CODES.STEAM_GUARD_CODE_REQUIRED:
            return "A Steam Guard code was required to log in";
        // It is still unknown what exit code 7 means. That's why the error
        // message is still the default one.
        case EXIT_CODES.INITIALIZED:
        default:
            return `An unknown error occurred. Exit code: ${exitCode}`;
    }
}

const EXIT_CODES = {
    /**
     * Indicates that SteamCMD exited normally.
     */
    NO_ERROR: 0,
    /**
     * Indicates that Steam CMD had to quit due to some unknown error. This can
     * also indicate that the process was forcefully terminated.
     */
    UNKNOWN_ERROR: 1,
    /**
     * Indicates that the user attempted to login while another user was already
     * logged in.
     */
    ALREADY_LOGGED_IN: 2,
    /**
     * Indicates that SteamCMD has no connection to the internet.
     */
    NO_CONNECTION: 3,
    /**
     * Indicates that an incorrect password was provided.
     */
    INVALID_PASSWORD: 5,
    /**
     * On Windows this is returned only on the first run after the Steam CMD
     * executable has been downloaded. It is unknown what this error code
     * actually means.
     */
    INITIALIZED: 7,
    /**
     * Indicates that the application that you tried to update failed to
     * install. This can happen if you don't own it, if you don't have enough
     * hard drive space, if a network error occurred, or if the application is
     * not available for your selected platform.
     */
    FAILED_TO_INSTALL: 8,
    /**
     * Indicates that a command had missing parameters or that the user is not
     * logged in.
     */
    MISSING_PARAMETERS_OR_NOT_LOGGED_IN: 10,
    /**
     * Indicated that a Steam guard code is required before the login can
     * finish.
     */
    STEAM_GUARD_CODE_REQUIRED: 63,
};

module.exports.EXIT_CODES = EXIT_CODES;
module.exports.SteamCMDError = SteamCMDError;
