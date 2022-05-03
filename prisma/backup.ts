import { Prisma, PrismaClient } from "@prisma/client";
import * as fs from "fs/promises";
import { env } from "process";
import { createLogger } from "winston";
import winston from "winston";
import { customCLIFormat } from "../src/Middleware/error/logger";

const { errors, combine, timestamp, colorize, json } = winston.format;

type ModelSelect<V = boolean> = {
  [k in Prisma.ModelName as Uncapitalize<k>]?: V;
};

const logger = createLogger({
  levels: winston.config.syslog.levels,
  format: combine(errors(), timestamp()),
  silent: env.BACKUP_INFO === "false",
  transports: [
    new winston.transports.Console({ level: "debug", format: combine(timestamp(), colorize(), customCLIFormat) }),
    new winston.transports.File({
      filename: "/app/backup.log",
      level: "debug",
      format: combine(timestamp(), json({ space: 2 })),
    }),
  ],
});

async function generatePrismaBackup(models: ModelSelect): Promise<{ [k in keyof ModelSelect]?: any }> {
  const prisma = new PrismaClient();

  const data: { [k in keyof ModelSelect]?: any } = {};

  for (const [k, v] of Object.entries(models) as [keyof ModelSelect, boolean][]) {
    if (v) {
      logger.info(`Extracting '${k}'...`);

      const _data = await (prisma[k] as any).findMany();

      data[k] = _data;

      logger.info(`Finished extracting '${k}'. ${_data.length} records retrieved!`);
    }
  }

  return data;
}

export const generateFullBackup = async () => {
  logger.info(`Starting full database backup...`);

  return generatePrismaBackup({
    admin: true,
    campaign: true,
    discipline: true,
    event: true,
    group: true,
    link: true,
    media: true,
    organisation: true,
    participant: true,
    role: true,
    roleSchema: true,
    team: true,
  });
};

export const writeFullBackup = async (path: string) => {
  const data = await generateFullBackup();

  logger.info(`Writing backup to file '${path}'`);
  await fs.writeFile(path, JSON.stringify(data));

  logger.info("Backup finished!");
};

export async function pushPrismaBackup(data: ModelSelect<any[]>) {
  const prisma = new PrismaClient();

  logger.info("Starting push...");

  for (const [k, v] of Object.entries(data)) {
    const deleteBatch = await (prisma as any)[k].deleteMany();

    logger.info(`Purged ${deleteBatch.count} records from '${k}'`);

    logger.info(`Pushing ${v.length} records to '${k}'`);

    await (prisma as any)[k].createMany({ data: v });
  }
}

export async function loadPrismaBackup(path: string) {
  logger.info(`Reading backup from file '${path}'`);
  let data: any = await fs.readFile(path, "utf-8");

  data = JSON.parse(data);

  await pushPrismaBackup(data);

  logger.info("Backup loaded successfully!");
}
