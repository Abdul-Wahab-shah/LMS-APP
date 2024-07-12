require("dotenv").config()
import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";


export const isAuthenticated = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    const access_token = req.cookies.access_token
    console.log("accessToken", access_token);

    if (!access_token) {
        console.log("Cookies:", req.cookies);
        return next(new ErrorHandler("Please login to access the resources", 400))
    }

    const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload
    console.log("Decoded Token:", decoded.id);
    // agr token match nhi krta tb
    if (!decoded) {
        return next(new ErrorHandler("access token is not invalid ", 400))
    }
    const user = await redis.get(decoded.id);
    console.log("User from Redis:", user);
    if (!user) {
        return next(new ErrorHandler("User not found on redis", 400))
    }
   
    req.user = JSON.stringify(user)  // // Yahan user property set ki gayi hai jo custom.d.ts file me express k request object k ander add ke hoe ha
    next()
})

