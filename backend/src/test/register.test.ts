import request from "supertest";
import { app } from "../app";
import { prismaMock } from "./singleton";

describe("Register Endpoint Tests", () => {
  test("should register user with valid data", async () => {
    prismaMock.user.create.mockResolvedValue({
      email: "test@example.com",
      username: "testuser",
      mobileNumber: "1234567890",
      role: "student",
      userId: "",
      profileImage: null,
      password: "",
      createdAt: new Date(),
    });
    const response = await request(app).post("/api/auth/register").send({
      username: "testuser",
      mobileNumber: "1234567890",
      email: "test@example.com",
      password: "Password123",
      role: "student",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe("test@example.com");
  });

  test("should return validation error for invalid email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testuser",
      mobileNumber: "1234567890",
      email: "invalid-email",
      password: "Password123",
      role: "student",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation Error");
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: "email",
      message: "Invalid email address",
    });
  });

  test("should return validation error for short password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testuser",
      mobileNumber: "1234567890",
      email: "test@example.com",
      password: "123",
      role: "student",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation Error");
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: "password",
      message: "Password must be at least 8 characters",
    });
  });

  test("should return validation error for missing role", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testuser",
      mobileNumber: "1234567890",
      email: "test@example.com",
      password: "Password123",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation Error");
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: "role",
      message: "Role must be either 'student' or 'educator'",
    });
  });

  test("should return validation error for missing username", async () => {
    const response = await request(app).post("/api/auth/register").send({
      mobileNumber: "1234567890",
      email: "test@example.com",
      password: "Password123",
      role: "student",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation Error");
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: "username",
      message: "Invalid input: expected string, received undefined",
    });
  });

  test("should return validation error for missing mobileNumber", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testuser",
      email: "test@example.com",
      password: "Password123",
      role: "student",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation Error");
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: "mobileNumber",
      message: "Invalid input: expected string, received undefined",
    });
  });

  test("should return validation error for missing email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testuser",
      mobileNumber: "1234567890",
      password: "Password123",
      role: "student",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation Error");
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: "email",
      message: "Invalid input: expected string, received undefined",
    });
  });

  test("should return validation error for missing password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testuser",
      mobileNumber: "1234567890",
      email: "test@example.com",
      role: "student",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation Error");
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: "password",
      message: "Invalid input: expected string, received undefined",
    });
  });

  test("should return validation error for invalid role", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testuser",
      mobileNumber: "1234567890",
      email: "test@example.com",
      password: "Password123",
      role: "invalid",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation Error");
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: "role",
      message: "Role must be either 'student' or 'educator'",
    });
  });
});
