import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true, maxlength: 80 },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },          // null for OAuth users
    avatar:       { type: String, default: null },
    provider:     { type: String, default: "email", enum: ["email", "google", "github"] },
    googleId:     { type: String, default: null },
    githubId:     { type: String, default: null },
    isVerified:   { type: Boolean, default: false },
    verifyToken:  { type: String, default: null },
    resetToken:   { type: String, default: null },
    resetTokenExp:{ type: Date,   default: null },
  },
  { timestamps: true }
);

/** Hash password before save */
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash") || !this.passwordHash) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

/** Compare plain password to hash */
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/** Safe public representation — never return hash */
userSchema.methods.toPublic = function () {
  return {
    id:         this._id,
    name:       this.name,
    email:      this.email,
    avatar:     this.avatar,
    provider:   this.provider,
    isVerified: this.isVerified,
    createdAt:  this.createdAt,
  };
};

export default mongoose.models.User ?? mongoose.model("User", userSchema);
