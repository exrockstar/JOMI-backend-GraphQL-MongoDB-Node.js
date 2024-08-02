import dotenv from "dotenv";
dotenv.config(); // Load all environment variables first

import express from "express";
import mongoose from "mongoose";
import "reflect-metadata";
import { getApolloServer } from "./api/apollo-server";
import cookieParser from "cookie-parser";
import cors from "cors";
import { logger } from "./logger";
import { initializeJobs } from "./jobs";
import { SiteSettingService } from "./services/SiteSettingService";
import { connectGridFS } from "./utils/gridfs";
import { amplitudeInit } from "./amplitude/amplitude";

const port = process.env.PORT || 4000;

const main = async () => {
  await mongoose.connect(process.env.MONGO_URL as string);
  const gridFSBucket = await connectGridFS();
  await SiteSettingService.initialize();
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(
    cors({
      credentials: true,
      origin: [
        "http://localhost:3000",
        "https://jomi2.vercel.app",
        /jomi\.com$/,
        /jomi.vercel.app$/,
      ],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Forwarded-For",
        "X-Client-IP",
      ],
    }),
  );
  app.get("/download/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const downloadStream = gridFSBucket.openDownloadStreamByName(filename);
      downloadStream.on("file", (file) => {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${file.filename}`,
        );
      });

      downloadStream.on("error", () => {
        res.status(404).json({ message: "File not found" });
      });

      downloadStream.pipe(res);
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  const server = await getApolloServer();
  await server.start();
  server.applyMiddleware({
    app,
    cors: false,
  });

  app.set("trust proxy", 1);
  const instance = app.listen({ port }, () => {
    logger.info(`🚀  Server ready at http://localhost:4000/graphql`);
    initializeJobs();
  });

  process.on("beforeExit", (code) => {
    logger.info(`Process will exit with code ${code}`);
    instance.close(() => {
      logger.info("Http server closed.");
      process.exit(1);
    });
  });

  process.on("exit", (code) => {
    logger.info(`Process exited with code ${code}`);
  });

  process.on("SIGTERM", (signal) => {
    logger.info(`Process ${process.pid} received a SIGTERM signal ${signal}`);
    process.exit(0);
  });

  process.on("SIGINT", (signal) => {
    logger.info(`Process ${process.pid} has been interrupted ${signal}`);
    process.exit(0);
  });

  process.on("uncaughtException", (err) => {
    logger.error(`uncauseException ${err.message}`, {
      stack: err.stack,
    });
  });

  process.on("unhandledRejection", (reason) => {
    logger.error(`unhandledRejection ${reason}`);
    instance.close(() => {
      logger.info("Http server closed.");
      process.exit(1);
    });
  });

  amplitudeInit();
};

main();
