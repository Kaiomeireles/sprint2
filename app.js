"use strict";

const path = require("path");
const express = require("express");
const helmet = require("helmet");

const ROOT = __dirname;

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Azure App Service termina o TLS no front-end

  // HTTPS obrigatório em produção (o App Service também liga "HTTPS Only").
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] === "http") {
      return res.redirect(301, "https://" + req.headers.host + req.originalUrl);
    }
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://www.googletagmanager.com"],
          styleSrc: ["'self'", "https://fonts.googleapis.com"],
          fontSrc: ["https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https://www.google-analytics.com", "https://www.googletagmanager.com"],
          connectSrc: [
            "'self'",
            "https://docs.google.com",
            "https://www.google-analytics.com",
            "https://*.google-analytics.com",
            "https://*.analytics.google.com"
          ],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'", "https://wa.me"]
        }
      },
      strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true }
    })
  );

  // Verificação de saúde usada pelo App Service e pelo alerta de disponibilidade.
  app.get("/health", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ status: "ok", uptime: Math.round(process.uptime()) });
  });

  // Só estes caminhos são públicos. Código do servidor, package.json e .github nunca são servidos.
  app.get("/", (req, res) => res.sendFile(path.join(ROOT, "index.html")));
  app.get("/config.js", (req, res) => res.sendFile(path.join(ROOT, "config.js")));
  app.use("/css", express.static(path.join(ROOT, "css"), { dotfiles: "ignore" }));
  app.use("/js", express.static(path.join(ROOT, "js"), { dotfiles: "ignore" }));
  app.use("/docs", express.static(path.join(ROOT, "docs"), { dotfiles: "ignore" }));

  app.use((req, res) => res.status(404).type("text").send("Página não encontrada"));
  return app;
}

module.exports = { createApp };
