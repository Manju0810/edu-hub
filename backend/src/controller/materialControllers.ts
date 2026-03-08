import { Request, Response } from "express";
import { prisma } from "../prisma";
import { MaterialType, Role } from "@prisma/client";
import { CustomRequest } from "./courseControllers"; // Assuming it's exported from courseControllers

interface Material {
  materialId: string;
  courseId: string;
  title: string;
  description: string;
  URL?: string;
  contentType: MaterialType;
}

// Add Material
export const addMaterial = async (
  req: CustomRequest<object, Material>,
  res: Response,
) => {
  const { courseId, title, description, URL, contentType } = req.body;
    const role = req.user?.role
  try {
    if (role === Role.student) {
        return res
        .status(400)
        .json({ success: false, message: "Access denied" });
    }
    if (!courseId || !title || !description || !contentType) {
      return res
        .status(400)
        .json({ success: false, message: "Mandatory fields are missing" });
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { courseId },
    });
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const material = await prisma.material.create({
      data: {
        title,
        description,
        contentType,
        courseId,
        ...(URL && { URL }),
      },
      select: {
        materialId: true,
        courseId: true,
        title: true,
        description: true,
        uploadDate: true,
        URL: true,
        contentType: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Material added successfully",
      data: material,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: `Internal server error: ${error}` });
  }
};

// Get Material by Material Id
export const getMaterialByMaterialId = async (
  req: CustomRequest<{ materialId: string }>,
  res: Response,
) => {
  const { materialId } = req.params;
    const role = req.user?.role
  try {
    if (role === Role.student) {
        return res
        .status(400)
        .json({ success: false, message: "Access denied" });
    }
    const material = await prisma.material.findUnique({
      where: { materialId },
      select: {
        materialId: true,
        courseId: true,
        title: true,
        description: true,
        uploadDate: true,
        URL: true,
        contentType: true,
      },
    });

    if (!material) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    return res.status(200).json({
      success: true,
      data: material,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: `Internal server error: ${error}` });
  }
};

// Update Material by Material Id
export const updateMaterialByMaterialId = async (
  req: CustomRequest<{ materialId: string }, Partial<Material>>,
  res: Response,
) => {
  const { materialId } = req.params;
  const { title, description, URL, contentType } = req.body;
    const role = req.user?.role
  try {
    if (role === Role.student) {
        return res
        .status(400)
        .json({ success: false, message: "Access denied" });
    }
    const existingMaterial = await prisma.material.findUnique({
      where: { materialId },
    });

    if (!existingMaterial) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    const updatedMaterial = await prisma.material.update({
      where: { materialId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(URL !== undefined && { URL }),
        ...(contentType && { contentType }),
      },
      select: {
        materialId: true,
        courseId: true,
        title: true,
        description: true,
        uploadDate: true,
        URL: true,
        contentType: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Material updated successfully",
      data: updatedMaterial,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: `Internal server error: ${error}` });
  }
};

// Delete Material by Material Id
export const deleteMaterialByMaterialId = async (
  req: CustomRequest<{ materialId: string }>,
  res: Response,
) => {
  const { materialId } = req.params;
    const role = req.user?.role
  try {
    if (role === Role.student) {
        return res
        .status(400)
        .json({ success: false, message: "Access denied" });
    }
    const existingMaterial = await prisma.material.findUnique({
      where: { materialId },
    });

    if (!existingMaterial) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    await prisma.material.delete({
      where: { materialId },
    });

    return res.status(200).json({
      success: true,
      message: "Material deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: `Internal server error: ${error}` });
  }
};

// Get Materials by Course Id
export const getMaterialBycourseId = async (
  req: Request<{ courseId: string }>,
  res: Response,
) => {
  const { courseId } = req.params;

  try {
    const course = await prisma.course.findUnique({
      where: { courseId },
    });

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
    const materials = await prisma.material.findMany({
      where: { courseId },
      select: {
        materialId: true,
        courseId: true,
        title: true,
        description: true,
        uploadDate: true,
        URL: true,
        contentType: true,
      },
    });

    if (materials.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No materials found for this course" });
    }

    return res.status(200).json({
      success: true,
      data: materials,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: `Internal server error: ${error}` });
  }
};