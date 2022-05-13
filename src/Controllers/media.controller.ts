import { Request, response, Response } from "express";
import fs from "fs";
import isSvg from "is-svg";
import { fromBuffer as fileTypeFromBuffer } from "file-type";
import { AUTH_ERROR, createError, createInsufficientPermissionsError } from "./common";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import NotFoundError from "../Middleware/error/NotFoundError";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { generateInvalidBodyError, DataType,  } from "./common";
import { type } from "os";
import {unlink} from "fs/promises"


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

  if ( typeof req.body.description !== "string") {
    return res.status(400).json(
      generateInvalidBodyError({
        description: DataType.STRING
      })
    );
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

  if (fs.existsSync("media/" + fileName)) {
    return res.status(409).json(createError("The uploaded file already exists", {}, createMediaLinks(fileName)));
  }

  file.mv("media/" + fileName, console.error);

  //generate record
  const media = await prisma.media.create({
    data: {
      pid: fileName,
      description: req.body.description,
    },
    select: {
      pid: true,
      description: true,
    }
  })

  return res.status(201).json({
    type: "success",
    payload: { media }
  })
};

export const getAllMedia = async (req: Request, res: Response) => {
  const medias = await prisma.media.findMany({
    select: {
      description: true,
      events: true,
      disciplines: true,
      roles: true,
      pid: true,
      id: false,
    },
  });

  res.status(200).json({
    type: "success",
    payload: {
      medias,
    },
  });
};

interface CreateMediaBody {
  description?: string;
  location?: string;

  events?: string[];
  disciplines?: string[];
  roles?: string[];
}

interface MediaParams {
  eventPid?: string;
  disciplinePid?: string;
  rolePid?: string;
}

export const deleteMedia = async (req: Request, res: Response) => {
  if (req.auth?.permission_level != "ELEVATED"){
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;

  const location = "media/" + pid;

  if (fs.existsSync(location)) {
    await unlink(location);
  }

  try {
    await prisma.discipline.delete({ where: { pid }});
    return res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("discipline", pid);
    }

    throw e;
  }
};