import mongoose from "mongoose";

const collaboratorSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  permission: { type: String, enum: ["viewer", "editor"], default: "viewer" },
  addedAt:    { type: Date, default: Date.now },
}, { _id: false });

const boardSchema = new mongoose.Schema(
  {
    title:      { type: String, default: "Untitled Board", maxlength: 120 },
    owner:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    elements:   { type: mongoose.Schema.Types.Mixed, default: [] }, // array of element objects
    collaborators: [collaboratorSchema],
    shareMode:  { type: String, enum: ["private", "link", "link-view", "link-edit"], default: "private" },
    shareToken: { type: String, default: null },  // for link sharing
    thumbnail:  { type: String, default: null },  // Board preview image URL / data
    tags:       [{ type: String, maxlength: 30 }],
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

boardSchema.index({ owner: 1, updatedAt: -1 });
boardSchema.index({ "collaborators.user": 1 });
boardSchema.index({ shareToken: 1 }, { sparse: true });

export default mongoose.models.Board ?? mongoose.model("Board", boardSchema);
