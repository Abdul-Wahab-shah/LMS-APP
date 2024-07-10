import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";

export const ErrorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "internal server error";

  // Wrong mongodb error message
  if (err.name == "CastError") {
    const message = `Resourse not found. Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // duplicate key error
  if (err.code == 11000) {
    const message = `Duplicate ${Object.keys(err.keyvalue)} entered`;
    err = new ErrorHandler(message, 400);
  }

  // wrong jwt error

  if (err.name == "TokenExpiredError") {
    const message = "Token expired. Please login again";
    err = new ErrorHandler(message, 400);
  }

  res.status(err.statusCode).json({ success: false, message: err.message });
};
