import { CookieOptions, Request, Response } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AuthPayload } from "../middleware/auth";

dotenv.config();

interface Query {
  page?: string;
  limit?: string;
  sortBy?: "username" | "email";
  order?: "asc" | "desc";
  search?: string;
}

//Request<Params, ResBody, ReqBody, ReqQuery> //TQuery means  if no query is provided then it will be defaults to {}
export interface CustomRequest<
  TParams = object,
  TBody = object,
  TQuery = object,
> extends Request<TParams, object, TBody, TQuery> {
  user?: AuthPayload;
}

const jwt_secret = process.env.JWT_SECRET!;
const saltRounds = 12;
const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: true,
  maxAge: 24 * 60 * 60 * 1000,
};

const generateToken = (payload: string | object | Buffer<ArrayBufferLike>) => {
  return jwt.sign(payload, jwt_secret, { expiresIn: "1h" });
};

export const register = async (req: Request, res: Response) => {
  const { username, mobileNumber, profileImage, email, password, role } =
    req.body;

  try {
    if (!email || !password || !role || !username || !mobileNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Mandatory fields are missing" });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: role as Role,
        mobileNumber,
        profileImage,
      },
      select: {
        userId: true,
        username: true,
        email: true,
        role: true,
        mobileNumber: true,
        profileImage: true,
        createdAt: true,
      }, // No password in response
    });

    const payload = { userId: user.userId, email: user.email, role: user.role };
    const token = generateToken(payload);
    res.cookie("token", token, cookieOptions);
    return res
      .status(200)
      .json({ success: true, message: "User registered successfully", user });
  } catch (error) {
    console.error(error);
    return res
      .status(400)
      .json({ success: false, message: `Error in registering user: ${error}` });
  } finally {
    await prisma.$disconnect();
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Mandatory fields are missing" });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(400).json({ success: false, message: "No user found" });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "password invalid" });
    }
    const payload = { userId: user.userId, email: user.email, role: user.role };
    const token = generateToken(payload);

    res.cookie("token", token, cookieOptions);
    return res
      .status(200)
      .json({ success: true, message: "User logged in successfully", user });
  } catch (error) {
    console.error(error);
    return res
      .status(400)
      .json({ success: false, message: `Error in user login: ${error}` });
  } finally {
    await prisma.$disconnect();
  }
};

export const getAllStudents = async (
  req: CustomRequest<object, object, Query>,
  res: Response,
) => {
  try {
    const requestedBy = req.user?.role === Role.educator;
    if (!requestedBy) {
      return res
        .status(400)
        .json({ success: false, message: "Access is denied" });
    }
    const {
      page = 1,
      limit = 10,
      sortBy = "username",
      order = "asc",
      search,
    } = req.query;
    const skip = Number(limit) * Number(page) - Number(limit);
    const take = Number(limit);
    const sortField = sortBy === "username" ? "username" : "email";
    const sortOrder = order === "asc" ? "asc" : "desc";

    const students = await prisma.user.findMany({
      where: {
        role: Role.student,
        ...(search && {
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      skip,
      take,
      orderBy: { [sortField]: sortOrder },
      select: {
        userId: true,
        username: true,
        email: true,
        mobileNumber: true,
      },
    });

    const count = students.length;
    return res.status(200).json({
      success: true,
      message: "Students fetched successfully",
      students,
      count,
    });
  } catch (error) {
    console.error("Error in fetching students:", error);
    return res
      .status(400)
      .json({ success: false, message: "Failed to fetch students" });
  } finally {
    await prisma.$disconnect();
  }
};
