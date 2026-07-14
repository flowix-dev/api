import { Model } from "mongoose";
import { UserRole } from "../types/UserRole";

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  credits: number;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserVirtuals {}

export type UserModel = Model<IUser, unknown, IUserMethods>;
