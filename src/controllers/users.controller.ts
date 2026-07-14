import { Request, Response } from "express";
import { User } from "../models/User";

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const { firstName, lastName } = req.body;

    const updateData: Record<string, string> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: "No fields to update" });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({ message: "Profile updated successfully", user });
  } catch {
    res.status(500).json({ message: "Failed to update profile" });
  }
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findByIdAndDelete(req.user!.userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({ message: "Account deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete account" });
  }
}
