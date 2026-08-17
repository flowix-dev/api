import jwt from "jsonwebtoken";
import { Types } from "mongoose";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error(
    "ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET environment variables are required"
  );
}

const accessSecret: string = ACCESS_TOKEN_SECRET;
const refreshSecret: string = REFRESH_TOKEN_SECRET;

export interface TokenPayload {
  userId: string;
}

export function signAccessToken(userId: Types.ObjectId | string): string {
  return jwt.sign({ userId: userId.toString() } satisfies TokenPayload, accessSecret, {
    expiresIn: "15m",
  });
}

export function signRefreshToken(userId: Types.ObjectId | string): string {
  return jwt.sign({ userId: userId.toString() } satisfies TokenPayload, refreshSecret, {
    expiresIn: "7d",
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, accessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, refreshSecret) as TokenPayload;
}
