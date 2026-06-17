import mongoose, { Schema, Document, model } from "mongoose";
import crypto from "bcryptjs";

export enum Gender {
  MALE = "Male",
  FEMALE = "Female",
  DIVERS = "Divers",
  NO_ANSWER = "Prefer not to say",
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  password: string;
  gender: Gender;
  isAdmin: boolean;
  apiKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  isCorrectPassword(pass: string): Promise<Boolean>;
}

type userModel = mongoose.Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    password: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
      default: Gender.NO_ANSWER,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    apiKey: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const hashedPassword = await crypto.hash(this.password, 10);
    this.password = hashedPassword;
  }
});

userSchema.method(
  "isCorrectPassword",
  async function (password: string): Promise<Boolean> {
    if (this.isModified()) {
      throw new Error("Password is not correct");
    }
    return await crypto.compare(password, this.password);
  },
);

export const User = model<IUser, userModel>("User", userSchema);
