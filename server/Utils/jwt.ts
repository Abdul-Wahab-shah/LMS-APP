require("dotenv").config();
import { Response } from "express";
import { redis } from "./redis";
import { IUser } from "../model/user.model";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

// Parse environment variables with fallback values
const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || "300", 10);
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || "1200", 10);

// Options for cookies
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "none", // Ensure this is suitable for your needs
  secure: process.env.NODE_ENV === "production", // Use true in production
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "none", // Ensure this is suitable for your needs
  secure: process.env.NODE_ENV === "production", // Use true in production
};

export const sendToken = async (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  // Store user session in Redis
  // await redis.set(user._id, JSON.stringify(user));
  const sessionData = { _id: user._id.toString() };
await redis.set(sessionData._id, JSON.stringify(sessionData));


  // Set cookies in the response
  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);
  
  // console.log("Access Token Cookie Set:", accessToken);
  // console.log("Refresh Token Cookie Set:", refreshToken);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
    refreshToken,
  });
};
