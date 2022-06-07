import { Request, Response } from "express";

// Only called when no other route matches
export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({
    type: "error",
    payload: {
      message: `The ${req.method} HTTP method is not implemented for '${req.path}'`,
      _links: [
        {
          rel: "root",
          href: "/api",
        },
      ],
    },
  });
}

export function rootHandler(req: Request, res: Response) {
  return res.status(200).json({
    type: "success",
    payload: {
      message: "Detleph event API",
      detail: "This is the API for the Detleph event system",
    },
  });
}
