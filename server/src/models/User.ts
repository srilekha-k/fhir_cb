// server/src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs"; // ⬅ add this

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword: (plain: string) => Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, "Invalid email"] },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

// Use the statically imported bcrypt
UserSchema.methods.comparePassword = async function (plain: string) {
  return bcrypt.compareSync(plain, this.passwordHash);
};

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
