import { Request } from "express";
import { IUser } from "../models/user.model";

declare global {
    namespace Express{
        interface Request{
            user?: IUser
            // any additional properties can be added here to be accessible in routes and middleware
    
        }
    }
}