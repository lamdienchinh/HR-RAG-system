import { type Request, type Response } from "express";
import {
  findUserByUsername,
  verifyPassword,
  generateToken,
} from "../lib/auth.js";
import { sendError } from "../helpers/apiHelpers.js";

export const login = async (request: Request, response: Response) => {
  try {
    const { username, password } = request.body as {
      username?: unknown;
      password?: unknown;
    };
    if (typeof username !== "string" || typeof password !== "string") {
      sendError(response, new Error("username and password are required"));
      return;
    }
    const user = await findUserByUsername(username.trim());
    if (!user) {
      sendError(response, new Error("Invalid username or password"), 401);
      return;
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      sendError(response, new Error("Invalid username or password"), 401);
      return;
    }
    const authUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
    const token = generateToken(authUser);
    response.json({ token, user: authUser });
  } catch (error) {
    sendError(response, error);
  }
};

export const getMe = (request: Request, response: Response) => {
  response.json({ user: request.user });
};
