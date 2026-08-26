import dotenv from "dotenv";

dotenv.config();

import app from "./app";
import connectDB from "./config/db";

const PORT = Number(process.env.PORT) || 5050;

const startServer = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required. Add it to server/.env.");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required. Add it to server/.env.");
  }

  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

startServer().catch((error: unknown) => {
  console.error(
    "Unable to start the server:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
