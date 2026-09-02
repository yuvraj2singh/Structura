import mongoose from "mongoose";

const versionSchema = new mongoose.Schema(
  {
    board:     { type: mongoose.Schema.Types.ObjectId, ref: "Board", required: true },
    elements:  { type: mongoose.Schema.Types.Mixed, default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    label:     { type: String, default: null },  // optional user label
    auto:      { type: Boolean, default: true }, // auto-saved vs manual
  },
  { timestamps: true }
);

versionSchema.index({ board: 1, createdAt: -1 });

export default mongoose.models.BoardVersion ?? mongoose.model("BoardVersion", versionSchema);
