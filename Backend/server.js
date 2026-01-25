import express, { json } from "express";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

// Load environment variables
config();

// DB connection
import dbConnection from "./config/dbConnection.js";

const app = express();

/* Global middlewares */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
  })
);

/* Normal parsers (AFTER webhook!) */
app.use(cookieParser());
app.use(json());

/* DB connection */
dbConnection();

/* Start server */
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});