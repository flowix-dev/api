import { model, Schema, HydratedDocument } from "mongoose";
import bcrypt from "bcrypt";
import { UserRole } from "../types/UserRole";
import { IUser, IUserMethods, UserModel as UserModelType } from "../interfaces/User";

const SALT_ROUNDS = 12;

const userSchema = new Schema<IUser, UserModelType>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: "Invalid role: {VALUE}",
      },
      default: UserRole.USER,
    },
    puterToken: {
      type: String,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre<HydratedDocument<IUser, IUserMethods>>("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser, UserModelType>("User", userSchema);
