require("dotenv").config();
import express,{NextFunction,Response,Request} from "express"   
import cors from "cors"
export const app = express()
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middleware/error";
import userRouter from "./route/user_route"
import { isAuthenticated } from "./middleware/auth";
import { getUserInfo } from "./controller/user_controller";

// body parser

app.use(express.json({limit:"50mb"}))


// cookie parser
app.use(cookieParser());


// cors => cross origin resourse sharing 
app.use(
    cors({
        origin:process.env.ORIGIN,
       
    })
)

// routes

app.use("/api/v1",userRouter)
app.use(isAuthenticated); // Use the authentication middleware

app.get('/user', getUserInfo);

// testing Api
app.get("/test",(req:Request,res:Response,next:NextFunction) =>{
    res.status(200).json({
        success:true,
        message:"Api is working"

    });
} )

// unknown route
app.all("*",(req:Request,res:Response,next:NextFunction)=>{
    const err=new Error(`Route ${req.originalUrl} not found`) as any;
    err.status=404;
    next(err);
})

app.use(ErrorMiddleware)