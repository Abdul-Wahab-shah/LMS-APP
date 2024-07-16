import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import { generateLast12MothsData } from "../utils/analytics.generator";
import userModel from "../model/user.model";
import CourseModel from "../model/course.model";
import OrderModel from "../model/order.model";

// get users analytics --- only for admin
export const getUsersAnalytics = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await generateLast12MothsData(userModel);

      res.status(200).json({
        success: true,
        users,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get courses analytics --- only for admin
export const getCoursesAnalytics = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const courses = await generateLast12MothsData(CourseModel);
  
        res.status(200).json({
          success: true,
          courses,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }
    }
  );
  
  
// get order analytics --- only for admin
export const getOrderAnalytics = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orders = await generateLast12MothsData(OrderModel);
  
        res.status(200).json({
          success: true,
          orders,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }
    }
  );
  