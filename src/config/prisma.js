import { PrismaMssql } from "@prisma/adapter-mssql";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import dotenv from "dotenv";

dotenv.config();

const config = {
  server: process.env.DB_SERVER || "localhost",
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || "ClassroomWebsite",
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "1234",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const adapter = new PrismaMssql(config);
const prisma = new PrismaClient({ adapter });

export default prisma;
