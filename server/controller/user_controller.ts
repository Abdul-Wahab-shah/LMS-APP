require("dotenv").config();
import { Request, Response, NextFunction, response } from "express";
import userModel from "../model/user_model";
import ErrorHandler from "../utils/ErrorHandler";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import jwt, { Secret, JwtPayload } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { IUser } from "../model/user_model";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import  getUserById  from "../services/user.services";
import cloudinary from "cloudinary"

// register user

interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}
export const registrationUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const user: IRegistrationBody = { name, email, password };

      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;

      const data = { user: { name: user.name }, activationCode };

      // Log the template path for debugging
      const templatePath = path.join(__dirname, "../mails/activation_mail.ejs");
      console.log("Computed template path:", templatePath);

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "activation_mail.ejs",
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check your email ${user.email} to activate your account`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        console.error("Error sending email:", error);
        return next(new ErrorHandler("Failed to send activation email", 500));
      }
    } catch (error: any) {
      console.error("Error during registration:", error);
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
interface IActivationToken {
  token: string;
  activationCode: string;
}
export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );

  return { token, activationCode };
};
interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}
//   Activation user
export const activateUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      const { user, activationCode } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      // Check if user with the same email already exists
      const existingUser = await userModel.findOne({ email: user.email });
      if (existingUser) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      // Create new user in the database
      const newUser = await userModel.create({
        name: user.name,
        email: user.email,
        password: user.password,
      });

      // Respond with success message if activation and registration are successful
      res.status(200).json({
        success: true,
        message: "Account activated and registered successfully",
        user: newUser, // Optionally, you can include the created user in the response
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Login User

interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      // Check if either email or password is missing
      if (!email || !password) {
        return next(
          new ErrorHandler("Please provide both email and password", 400)
        );
      }

      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("Invalid email or password", 401));
      }

      const isPasswordMatch = await user.comparePassword(password);
      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid email or password", 401));
      }

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// logout user
export const logoutUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Clearing cookies...");
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });
      if (!req.user) {
        return next(
          new ErrorHandler("User not authenticated at logout controller", 400)
        );
      }
      const userId = req.user?._id || "";
      console.log("User:", req.user);
      await redis.del(userId);
      console.log("User:", req.user);
      res.status(200).json({
        success: true,
        message: "User Logout Successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateAccessToken = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token;

      if (!refresh_token) {
        return next(new ErrorHandler("Refresh token not found", 400));
      }

      let decoded: JwtPayload;
      try {
        decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload;
      } catch (err) {
        console.error("Failed to verify refresh token:", err); // Log verification error
        return next(new ErrorHandler("Invalid refresh token", 400));
      }

      console.log("Decoded Refresh Token:", decoded); // Log decoded token

      if (!decoded || !decoded.id) {
        return next(new ErrorHandler("Invalid refresh token", 400));
      }

      const session = await redis.get(decoded.id as string);

      if (!session) {
        return next(new ErrorHandler("Session not found. Please login again.", 400));
      }

      console.log("Session from Redis:", session); // Log session

      const user = JSON.stringify(session); // Parse the session

      const newAccessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        { expiresIn: "5m" }
      );

      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        { expiresIn: "3d" }
      );

      res.cookie("access_token", newAccessToken, accessTokenOptions);
      res.cookie("refresh_token", newRefreshToken, refreshTokenOptions);

      return res.status(200).json({
        success: true,
        message: "Access token updated successfully",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error: any) {
      console.error("Error updating access token:", error);
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get user info
export const getUserInfo = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // Parse the user object from JSON string to object
    const userObject = JSON.parse(req.user as unknown as string);
    console.log('User object:', userObject); // Log the parsed user object

    const userId = userObject._id; // Access _id from parsed object
    console.log('User ID:', userId); // Log the user ID

    if (!userId) {
      return next(new ErrorHandler('User ID is required', 400));
    }

    try {
      const userInfo = await getUserById(userId); // Fetch user info
      res.status(200).json({
        success: true,
        data: userInfo,
      });
    } catch (error: any) {
      next(new ErrorHandler(error.message, 400));
    }
  }
);

interface ISocialAuthBody {
  email: string;
  name: string;
  avatar: string;
}

// social auth
export const socialAuth = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthBody;
      const user = await userModel.findOne({ email });
      if (!user) {
        const newUser = await userModel.create({ email, name, avatar });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);


interface IUpdateUserInfo {
  name?: string,
  email?: string,
}

export const updateUserInfo = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
      const { name, email } = req.body as IUpdateUserInfo
      const userId = req.user._id
      const { _id } = req.user;

      console.log("userId :", req.user,userId,_id)
      console.log("user is exist")
      const user = await userModel.findById(userId)
      if (email && user) {
          const isExistEmail = await userModel.findOne({ email })
          if (isExistEmail) {
              return next(new ErrorHandler("User already exits", 400))
          }
          user.email = email
      }

      // Aapka current email shaniizr786rafique@gmail.com hai, jo req.user object mein stored hoga. Maan lo req.user kuch is tarah se hai:
      // Aap request body mein new email pak@gmail.com provide kar rahe hain:
      // Ab user object mein current user ki saari information mil jaati hai.
      // Code check karta hai ke provided new email (pak@gmail.com) already kisi aur user ke liye exist to nahi karta:
      // Agar isExistEmail null return karta hai, iska matlab pak@gmail.com kisi aur user ke liye exist nahi karta.

      if (name && user) {
          user.name = name
      }

      await user?.save();
      // set updated user into redis
      await redis.set(userId, JSON.stringify(user))

      res.status(200).json({
          success: true,
          user,
      })
  } catch (error: any) {
      return next(new ErrorHandler(error.message, 400))
    }
})

// update user password

interface IUpdateUserPassword{
  oldPassword:string,
  newPassword:string,
}

export const updaterPassword = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { oldPassword, newPassword } = req.body as IUpdateUserPassword

    if(!oldPassword || !newPassword) {
      return next(new ErrorHandler("Old password and new password are required", 400))
    }
   
    const user = await userModel.findById(req.user?._id).select("+password")
  
  
    if(user?.password ===undefined){
      return next(new ErrorHandler("User password not found", 400))
    
  }
  const isPasswordMatch = await user?.comparePassword(oldPassword)
    if(!isPasswordMatch){
      return next(new ErrorHandler("User old password is not matched", 400))

    }
    user.password =  newPassword

    await user?.save()
    await redis.set(req.user?._id,JSON.stringify(user))

    res.status(201).json({
      success:true,
      message: "User password updated successfully",
      user,
    })

  }
    catch(error:any){
      return next(new ErrorHandler(error.message, 400))
    }

})

interface IUpdateProfilePicture{
  avatar:string
}

// update profile picture

export const updateProfilePicture = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { avatar } = req.body as IUpdateProfilePicture
    const userId=req.user?._id
    const user = await userModel.findById(userId)

    if(avatar && user){
      // if user have one avatar then call it
      if(user?.avatar?.public_id){
        // first delete the old image

        await cloudinary.v2.uploader.destroy(user?.avatar?.public_id)

        const myCloud= await cloudinary.v2.uploader .upload(avatar,{
          folder:"avatar",
          width:150,
          
        });
        user.avatar={
          public_id:myCloud.public_id,
          url:myCloud.secure_url,
        };
      } else{
        const myCloud= await cloudinary.v2.uploader .upload(avatar,{
          folder:"avatar",
          width:150,
          
        });
        user.avatar={
          public_id:myCloud.public_id,
          url:myCloud.secure_url,
        };
      }
    }
    await user?.save()

    await redis.set(userId,JSON.stringify(user))
   
    res.status(201).json({
      success:true,
      message: "User profile picture updated successfully",
      user,
    })

  }
    catch(error:any){
      return next(new ErrorHandler(error.message, 400))
    }

  })