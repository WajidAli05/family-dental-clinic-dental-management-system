import mongoose from "mongoose";

const dbConnection = async () => {
  try {
    // Attach listeners once
    mongoose.connection.on("connected", () => {
      console.log("MongoDB: connected");
    });

    mongoose.connection.on("open", () => {
      console.log("MongoDB: connection open");
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB: disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB: reconnected");
    });

    mongoose.connection.on("disconnecting", () => {
      console.log("MongoDB: disconnecting");
    });

    mongoose.connection.on("close", () => {
      console.log("MongoDB: connection closed");
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB: error", err.message);
    });

    // Modern mongoose (v6+) — no deprecated options
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(
      `MongoDB connected: ${conn.connection.host}/${conn.connection.name}`
    );
  } catch (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  }
};

export default dbConnection;