import { Request, Response } from "express";
import fs from "fs";
import isSvg from "is-svg";
import { fromBuffer as fileTypeFromBuffer } from "file-type";
import { AUTH_ERROR, createError, createInsufficientPermissionsError } from "./common";

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

  return res.status(201).json({
    type: "success",
    payload: {
      message: "The file was uploaded and created on the server",
    },
    _links: createMediaLinks(fileName),
  });
};
