import { Request, Response } from "express";

export const register = (req: Request, res: Response) => {

    res.status(201).json({success: true, message: "User registration successful", data: {}})
}