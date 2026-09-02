import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import User from "@/models/User";
import { getAuthUser } from "@/lib/auth/jwt";
import nodemailer from "nodemailer";

// ── Optional email helper ─────────────────────────────
async function sendInviteEmail({ toEmail, toName, fromName, boardTitle, boardUrl }) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  // Skip email if SMTP isn't configured
  if (!smtpUser || smtpUser === "your-email@gmail.com" || !smtpPass || smtpPass === "your-app-password") {
    console.log(`[Invite] SMTP not configured — skipping email to ${toEmail}`);
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `Structura <${smtpUser}>`,
    to: toEmail,
    subject: `${fromName} invited you to collaborate on "${boardTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f0f10;color:#e4e4e7;border-radius:12px;">
        <h2 style="margin:0 0 8px;color:#fff;">You've been invited! 🎉</h2>
        <p style="color:#a1a1aa;margin:0 0 20px;">
          <strong style="color:#e4e4e7">${fromName}</strong> has invited you to collaborate on the board
          <strong style="color:#e4e4e7">"${boardTitle}"</strong> on Structura.
        </p>
        <a href="${boardUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Open Board →
        </a>
        <p style="margin-top:24px;font-size:12px;color:#71717a;">
          If you don't have a Structura account yet, you'll be prompted to create one.
        </p>
      </div>
    `,
  });

  return { sent: true };
}

// POST /api/boards/:id/invite
export async function POST(request, { params }) {
  try {
    const inviter = await getAuthUser();
    if (!inviter) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    const body = await request.json();
    const { email, permission = "editor" } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();

    await connectDB();

    // Load the board
    const board = await Board.findById(p.id);
    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

    // Only owner can invite
    if (String(board.owner) !== String(inviter.id)) {
      return NextResponse.json({ error: "Only the board owner can invite collaborators" }, { status: 403 });
    }

    // Can't invite yourself
    const inviterUser = await User.findById(inviter.id);
    if (inviterUser?.email === emailLower) {
      return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
    }

    // Look up the invitee
    const invitee = await User.findOne({ email: emailLower });

    if (invitee) {
      // Check already a collaborator
      const alreadyCollab = board.collaborators?.some(
        (c) => String(c.user) === String(invitee._id)
      );
      if (alreadyCollab) {
        return NextResponse.json({ error: `${emailLower} is already a collaborator` }, { status: 409 });
      }

      // Add to collaborators
      board.collaborators = board.collaborators || [];
      board.collaborators.push({ user: invitee._id, permission });
      await board.save();

      // Send email notification
      const boardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/board/${p.id}`;
      const emailResult = await sendInviteEmail({
        toEmail: emailLower,
        toName: invitee.name,
        fromName: inviterUser?.name || "A teammate",
        boardTitle: board.title,
        boardUrl,
      });

      return NextResponse.json({
        ok: true,
        message: emailResult.skipped
          ? `${invitee.name} added as collaborator. (Email skipped — SMTP not configured)`
          : `Invite sent to ${invitee.name}!`,
        collaborator: {
          id: invitee._id,
          name: invitee.name,
          email: invitee.email,
          avatar: invitee.avatar,
          permission,
        },
      });
    } else {
      // User doesn't have an account yet — send an invite-to-join email
      const boardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/register?invite=${p.id}&email=${encodeURIComponent(emailLower)}`;
      const emailResult = await sendInviteEmail({
        toEmail: emailLower,
        toName: "there",
        fromName: inviterUser?.name || "A teammate",
        boardTitle: board.title,
        boardUrl,
      });

      return NextResponse.json({
        ok: true,
        message: emailResult.skipped
          ? `No Structura account found for ${emailLower}. (Email skipped — SMTP not configured)`
          : `Invite email sent to ${emailLower}. They'll need to create an account.`,
        pending: true,
      });
    }
  } catch (err) {
    console.error("[POST /api/boards/:id/invite]", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

// GET /api/boards/:id/invite — list collaborators
export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    await connectDB();

    const board = await Board.findById(p.id)
      .populate("collaborators.user", "name email avatar")
      .lean();

    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

    const isOwner = String(board.owner) === String(user.id);
    const isCollab = board.collaborators?.some((c) => String(c.user?._id) === String(user.id));
    if (!isOwner && !isCollab && board.shareMode === "private") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ collaborators: board.collaborators || [] });
  } catch (err) {
    console.error("[GET /api/boards/:id/invite]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/boards/:id/invite — remove a collaborator
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const p = await params;
    const { userId } = await request.json();

    await connectDB();
    const board = await Board.findById(p.id);
    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });
    if (String(board.owner) !== String(user.id)) {
      return NextResponse.json({ error: "Only the owner can remove collaborators" }, { status: 403 });
    }

    board.collaborators = (board.collaborators || []).filter(
      (c) => String(c.user) !== String(userId)
    );
    await board.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/boards/:id/invite]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
