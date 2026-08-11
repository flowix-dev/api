import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../utils/jwt";

declare module "express" {
  interface Request {
    user?: TokenPayload;
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.cookies?.accessToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) {
    res.status(401).json({ message: "Authorization token is required" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
