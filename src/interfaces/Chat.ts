import { Types } from "mongoose";

export interface IChat {
  authorId: Types.ObjectId;
  title: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
}
