import { Types } from "mongoose";

export interface IChatFile {
  chatId: Types.ObjectId;
  authorId: Types.ObjectId;
  name: string;
  type: string;
  size: number;
  s3Key: string;
  createdAt: Date;
}
