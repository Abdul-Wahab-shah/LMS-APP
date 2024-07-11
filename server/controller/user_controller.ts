require("dotenv").config()
import {Request,Response,NextFunction} from "express";
import userModel from "../model/user_model"
import ErrorHandler from "../utils/ErrorHandler"
import {catchAsyncError} from "../middleware/catchAsyncErrors"
import jwt,{Secret} from "jsonwebtoken"
import ejs from "ejs"
import path from "path"
import sendMail from "../utils/sendMail";
import {IUser} from "../model/user_model"
import { sendToken } from "../utils/jwt";

// register user

interface IRegistrationBody{
    name:string,
    email:string,
    password:string,
    avatar?:string

}
export const registrationUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
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
      const templatePath = path.join(__dirname, '../mails/activation_mail.ejs');
      console.log('Computed template path:', templatePath);
  
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
        console.error('Error sending email:', error);
        return next(new ErrorHandler('Failed to send activation email', 500));
      }
    } catch (error: any) {
      console.error('Error during registration:', error);
      return next(new ErrorHandler(error.message, 400));
    }
  });
interface IActivationToken{
    token:string;
    activationCode:string;
}
export const createActivationToken=(user: any): IActivationToken=>{
    const activationCode=Math.floor(1000+Math.random()*9000).toString();


    const token= jwt.sign({
        user,
        activationCode
    }, process.env.ACTIVATION_SECRET as Secret,{
        expiresIn:"5m"
    })


    return {token,activationCode }
}
interface IActivationRequest {
    activation_token: string;
    activation_code: string;
  }
//   Activation user
  export const activateUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } = req.body as IActivationRequest;
  
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
  });

// Login User

interface ILoginRequest{
  "email":string,
  "password":string
}

export const loginUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as ILoginRequest;
  
    if(email || password){
      return next(new ErrorHandler("Please provide both email and password", 400));
    }

    const user = await userModel.findOne({ email }).select("+password");
  
    if (!user ||!(await user.comparePassword(password))) {
      return next(new ErrorHandler("Invalid email or password", 401));
    }
    const isPasswordMatch= await user.comparePassword(password
      );
    if(!isPasswordMatch){
      return next(new ErrorHandler("Invalid email or password", 401));
    }
    sendToken(user,200,res)

  
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }


})