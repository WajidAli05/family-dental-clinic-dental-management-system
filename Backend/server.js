import express from "express";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

// Load environment variables
config();

import "./models/index.js";

// DB connection
import dbConnection from "./config/dbConnection.js";
import routesV1 from "./routes/index.js";


const app = express();

app.set("trust proxy", 1);

/* ✅ CORS MUST come BEFORE routes */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // Postman/curl
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-lab-id"],
};

app.use(cors(corsOptions));

/* ✅ Express v5 fix: DO NOT use "*" here */
app.options(/.*/, cors(corsOptions));

/* Security headers */
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

/* Parsers */
app.use(cookieParser());
app.use(express.json());

/* Routes */
app.use("/api/v1", routesV1);

/* DB connection */
dbConnection();

/* Start server */
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});