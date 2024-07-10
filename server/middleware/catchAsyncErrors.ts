import { NextFunction, Request, Response } from "express";

export const catchAsyncError =
  (thefun: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(thefun(req, res, next)).catch(next);
  };
