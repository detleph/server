import { Request, Response } from "express";
import fs from "fs";
import isSvg from "is-svg";
import { fromBuffer as fileTypeFromBuffer } from "file-type";
import { AUTH_ERROR, createError, createInsufficientPermissionsError } from "./common";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import NotFoundError from "../Middleware/error/NotFoundError";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { generateInvalidBodyError, DataType } from "./common";
import { unlink } from "fs/promises";
import ForwardableError from "../Middleware/error/ForwardableError";

require("express-async-errors");

function createMediaLinks(fileName: string) {
  return [{ rel: "self", type: "GET", href: `/api/media/${fileName}` }];
}

export const uploadImage = async (req: Request, res: Response) => {
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json(AUTH_ERROR);
  }

  if (!(req.auth.permission_level === "ELEVATED")) {
    return res.status(403).json(createInsufficientPermissionsError());
  }

  let description = "Sample images";

  const meta = req.body.meta;

  if (meta) {
    try {
      const { description: desc } = JSON.parse(meta);

      if (typeof desc === "string") description = desc;
    } catch (e) {
      if (e instanceof SyntaxError) {
        return res.status(400).json({
          type: "error",
          payload: {
            message: "'meta' could not be parsed",
            schema: { mutlipart: { file: "binary file", meta: { ["description?"]: "string" } } },
          },
        });
      }

      throw e;
    }
  }

  if (!req.files || !("file" in req.files)) {
    return res.json({
      type: "error",
      payload: {
        message: "The format of the data was not valid",
        schema: {
          multipart: {
            file: "binary file",
          },
        },
      },
    });
  }

  const file = req.files.file;

  if (Array.isArray(file)) {
    return res.status(500).json({
      type: "failure",
      payload: {
        message: "Invalid application state",
      },
    });
  }

  if (file.size > 1024 * 1024) {
    // Maybe resize (express-fileupload seems to support this)
    return res.status(413).json(createError("The uploaded image is too large", { max_size: "1 MB" }));
  }

  const fileIsSvg = isSvg(file.data);
  const fileType = await fileTypeFromBuffer(file.data); // Could be optimized

  if (!(fileType && ["image/jpeg", "image/png"].includes(fileType.mime))) {
    if (!fileIsSvg)
      return res
        .status(415)
        .json(
          createError(
            "The uploaded image does not satisfy the MIME type constraints (Only image/jpeg, image/png and SVG files are accepted)"
          )
        );
  }

  const fileName = file.md5 + (fileIsSvg ? ".svg" : "." + fileType?.ext);

  try {
    const media = await prisma.media.create({
      data: {
        pid: fileName,
        description: description,
      },
      select: {
        pid: true,
        description: true,
      },
    });

    if (!fs.existsSync("media/" + fileName)) {
      file.mv("media/" + fileName, console.error);
    }

    return res.status(201).json({
      type: "success",
      payload: { media },
    });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ForwardableError(409, `The image with the the hash and extenstion ${fileName} already exists!`);
    }

    throw e;
  }
};

export const getAllMedia = async (req: Request, res: Response) => {
  const medias = await prisma.media.findMany({
    select: {
      description: true,
      events: { select: { pid: true } },
      disciplines: { select: { pid: true } },
      roles: { select: { pid: true } },
      pid: true,
      id: false,
    },
  });

  res.status(200).json({
    type: "success",
    payload: {
      media: medias,
    },
  });
};

export const getMediaMeta = async (req: Request, res: Response) => {
  const pid = req.params.pid;

  const meta = await prisma.media.findUnique({ where: { pid }, select: { pid: true, description: true } });

  if (!meta) {
    throw new NotFoundError("media", pid);
  }

  return res.status(200).json({
    type: "success",
    payload: {
      meta,
    },
  });
};

export const deleteMedia = async (req: Request, res: Response) => {
  if (req.auth?.permission_level != "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;

  const location = "media/" + pid;

  if (fs.existsSync(location)) {
    await unlink(location);
  }

  try {
    await prisma.media.delete({ where: { pid } });
    return res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("media", pid);
    }

    throw e;
  }
};

export const linkMedia = async (req: Request<{ pid: string }, {}, { mediaPid: string }>, res: Response) => {
  if (req.auth?.permission_level != "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;
  const { mediaPid } = req.body;
  const tableToUpdate = req.originalUrl.split("/");

  if (typeof mediaPid !== "string") {
    return res.status(400).json(
      generateInvalidBodyError({
        mediaPid: DataType.UUID,
      })
    );
  }

  const updatedRec = await getPrismaUpdateFKT(tableToUpdate[2])({
    where: { pid },
    data: {
      visual: { connect: { pid: mediaPid } },
    },
  });

  if (!updatedRec) {
    throw new NotFoundError(tableToUpdate[2], pid);
  }

  return res.status(200).json({
    type: "success",
    payload: {},
  });
};

export const unlinkMedia = async (req: Request<{ pid: string; mediaPid: string }>, res: Response) => {
  if (req.auth?.permission_level != "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid, mediaPid } = req.params;
  const tableToUpdate = req.originalUrl.split("/");

  try {
    await getPrismaUpdateFKT(tableToUpdate[2])({
      where: { pid },
      data: { visual: { disconnect: { pid: mediaPid } } },
    });
    return res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError(tableToUpdate[2], pid);
    }

    throw e;
  }
};

function getPrismaUpdateFKT(tableToUpdate: string): Function {
  switch (tableToUpdate) {
    case "events":
      return prisma.event.update;
    case "disciplines":
      return prisma.discipline.update;
    default:
      return prisma.roleSchema.update;
  }
}
