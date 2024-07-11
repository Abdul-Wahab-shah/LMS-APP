require("dotenv").config()
import {Request,Response,NextFunction} from "express";
import userModel from "../model/user_model"
import ErrorHandler from "../utils/ErrorHandler"
import {catchAsyncError} from "../middleware/catchAsyncErrors"
import jwt,{Secret} from "jsonwebtoken"
import ejs from "ejs"
import path from "path"
import sendMail from "../utils/sendMail";


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

        // Check if email already exists in the database
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
            return next(new ErrorHandler("Email already exists", 400));
        }

        // Create a new user object based on the request body
        const user:IRegistrationBody = {
            name,
            email,
            password,
        };

         // Create an activation token
         const activationToken = createActivationToken(user);

         const activationCode=activationToken.activationCode;

         const data={user:{name:user.name},activationCode};
         const html =await ejs.renderFile(path.join(__dirname,"../mails/activation_mail.ejs"),data)

         try {
            await sendMail({
                email:user.email,
                subject:"Activate your account",
                template:"activate-mail.ejs",
                data,

            })

            res.status(201).json(
                {
                    success: true,
                    message: `Please check your email ${user.email} to activate your account`,
                    activationToken:activationToken.token,
                    
                }
            )
        } catch (error:any) {
             return next( new ErrorHandler(error.message,400))
            
         }  

    } catch (error:any) {
        return next( new ErrorHandler(error.message,400))
    }

    // send email activation link

})

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