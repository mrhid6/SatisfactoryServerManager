var fs = require("fs"),
    es = require("event-stream");
var fsR = require("fs-reverse");

function processLog() {
    var lineNr = 0;

    let fileCounter = 0;
    let tempFileContents = [];

    fsR("/tmp/log.log", {
        matcher: "\r",
    })
        .pipe(es.split())
        .pipe(
            es.mapSync(function (line) {
                console.log(line);
            })
        );

    var s = fsR("/tmp/log.log", {
        matcher: "\r",
    })
        .pipe(es.split())
        .pipe(
            es
                .mapSync(function (line) {
                    if (line != "") {
                        // pause the readstream
                        s.pause();

                        tempFileContents.push(line);
                        lineNr++;
                        if (lineNr % 1000 == 0) {
                            fileCounter += 1;
                            console.log(lineNr, fileCounter);
                            fs.writeFileSync(
                                `/tmp/logsplit_${fileCounter}.log`,
                                JSON.stringify(tempFileContents)
                            );
                            tempFileContents = [];
                        }

                        // resume the readstream, possibly from a callback
                        s.resume();
                    }
                })
                .on("error", function (err) {
                    console.log("Error while reading file.", err);
                })
                .on("end", function () {
                    console.log("Read entire file.");

                    if (tempFileContents.length > 0) {
                        fileCounter += 1;
                        console.log(lineNr, fileCounter);
                        fs.writeFileSync(
                            `/tmp/logsplit_${fileCounter}.log`,
                            JSON.stringify(tempFileContents)
                        );
                        tempFileContents = [];
                    }
                })
        );
}

function getLogLines(offset) {
    const fileNumber = Math.floor(offset / 1000) + 1;
    const logFile = `/tmp/logsplit_${fileNumber}.log`;

    if (fs.existsSync(logFile) == false) {
        return [];
    }

    const fileData = fs.readFileSync(logFile);
    try {
        const JsonData = JSON.parse(fileData);
        return JsonData;
    } catch (err) {}

    return [];
}
processLog();

/*const data = getLogLines(-1)

console.log(data);
*/
