require("dotenv").config();
import express,{NextFunction,Response,Request} from "express"   
import cors from "cors"
export const app = express()
import cookieParser from "cookie-parser";

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