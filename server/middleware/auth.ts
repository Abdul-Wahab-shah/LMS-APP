require("dotenv").config()
import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";
// import { S } from "@upstash/redis/zmscore-80635339";


export const isAuthenticated = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    const access_token: string = req.cookies.access_token
    // console.log("accessToken", access_token);

    if (!access_token) {
        // console.log("Cookies:", req.cookies);
        return next(new ErrorHandler("Please login to access the resources", 400))
    }
    const decoded = jwt.decode(access_token) as JwtPayload

    console.log("Decoded Token :", decoded);
  
    if (!decoded) {
        return next(new ErrorHandler("access token is not invalid ", 400))
    }
    const user = await redis.get(decoded.id);
    // console.log("User from Redis:", user);
    if (!user) {
         return next(new ErrorHandler("User not found on redis", 400))
    }

    console.log("🚀 ~ isAuthenticated ~ user:", user)
   
    req.user = user  // // Yahan user property set ki gayi hai jo custom.d.ts file me express k request object k ander add ke hoe ha
    next()
})

// validate user role
export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!roles.includes(req.user?.role || "")) {
        return next(
          new ErrorHandler(
            `Role: ${req.user?.role} is not allowed to access this resource`,
            403
          )
        );
      }
      next();
    };
  };