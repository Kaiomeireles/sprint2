"use strict";

// Application Insights: a connection string vem de variável de ambiente (nunca do código).
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  require("applicationinsights").setup().start();
}

const { createApp } = require("./app");

const port = process.env.PORT || 8080;
createApp().listen(port, () => console.log("Leva Eu ouvindo na porta " + port));
