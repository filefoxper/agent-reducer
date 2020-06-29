if (process.env.NODE_ENV === "production") {
    module.exports = require("./dist/agent-reducer.min.js");
} else {
    module.exports = require("./dist/agent-reducer.js");
}