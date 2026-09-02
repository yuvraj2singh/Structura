import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text:   { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
  {
    board:     { type: mongoose.Schema.Types.ObjectId, ref: "Board",  required: true, index: true },
    author:    { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
    elementId: { type: String, default: null },   // canvas element id; null = board-level
    x:         { type: Number, default: 0 },      // canvas X position
    y:         { type: Number, default: 0 },      // canvas Y position
    text:      { type: String, required: true, maxlength: 2000 },
    resolved:  { type: Boolean, default: false, index: true },
    label:     { type: String, default: null },   // optional version label
    replies:   [replySchema],
  },
  { timestamps: true }
);

commentSchema.index({ board: 1, resolved: 1, createdAt: -1 });

export default mongoose.models.Comment ?? mongoose.model("Comment", commentSchema);
