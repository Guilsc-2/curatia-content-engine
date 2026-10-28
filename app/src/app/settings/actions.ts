"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase";

import { authorizationFor, requireOnboardedSession } from "@/lib/session";

import { assertWorkspaceWrite } from "@/lib/authorization";

export async function saveSettings(formData: FormData) {

const session = await requireOnboardedSession();

const workspace = session.workspaces[0];

if (!workspace) throw new Error("Workspace required.");

assertWorkspaceWrite(authorizationFor(session, workspace.id));

const admin = getSupabaseAdmin();

const displayName = String(formData.get("displayName") ?? "").trim();

const roleTitle = String(formData.get("roleTitle") ?? "").trim();

const bio = String(formData.get("bio") ?? "").trim();

const avatarKey = String(formData.get("avatarKey") ?? "circuit");

const customInterests = String(formData.get("customInterests") ?? "").split(",").map((v) => v.trim()).filter(Boolean);

const interests = [...new Set([...formData.getAll("interests").map(String), ...customInterests])];

const channels = formData.getAll("channels").map(String);

const primaryChannel = String(formData.get("primaryChannel") ?? "");

if (!displayName || interests.length === 0) throw new Error("Display name and at least one Discovery Interest are required.");

const { error: profileError } = await admin.from("profiles").update({
	display_name: displayName,
	role_title: roleTitle || null,
	bio: bio || null,
	avatar_key: avatarKey
}).eq("user_id", session.userId);

if (profileError) throw new Error(profileError.message);

const { error: disableInterestsError } = await admin.from("discovery_interests")

.update({ active: false }).eq("workspace_id", workspace.id);

if (disableInterestsError) throw new Error(disableInterestsError.message);

// Revalidate the path to reflect the changes on the client side.
revalidatePath("/settings");

}
