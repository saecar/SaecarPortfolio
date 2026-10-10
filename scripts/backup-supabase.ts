import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function runBackup() {
  console.log("📦 Starting Supabase backup...");
  const dateStr = new Date().toISOString().slice(0, 10);
  const backupDir = path.join(process.cwd(), "backups");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Fetch all projects
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("*")
    .order("id", { ascending: true });

  if (projectsError) {
    console.error("❌ Failed fetching projects:", projectsError.message);
    process.exit(1);
  }

  const backupData = {
    timestamp: new Date().toISOString(),
    version: "1.0",
    totalProjects: projects?.length || 0,
    projects: projects || [],
  };

  const fileName = `projects-${dateStr}.json`;
  const filePath = path.join(backupDir, fileName);
  const latestPath = path.join(backupDir, "latest.json");

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");
  fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2), "utf-8");

  console.log(`✅ Backup successfully saved to ${filePath} (${projects?.length || 0} projects)`);

  // Optional: Try uploading to Supabase Storage bucket 'backups' if available
  try {
    const { error: uploadError } = await supabase.storage
      .from("backups")
      .upload(fileName, fs.readFileSync(filePath), {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      console.warn("ℹ️ Supabase Storage 'backups' bucket upload skipped:", uploadError.message);
    } else {
      console.log(`☁️ Backup uploaded to Supabase Storage: backups/${fileName}`);
    }
  } catch (err: any) {
    console.warn("ℹ️ Storage backup skipped:", err.message);
  }
}

async function runRestore(targetFile?: string) {
  const backupDir = path.join(process.cwd(), "backups");
  const fileToRestore = targetFile
    ? path.resolve(targetFile)
    : path.join(backupDir, "latest.json");

  if (!fs.existsSync(fileToRestore)) {
    console.error(`❌ Backup file not found: ${fileToRestore}`);
    process.exit(1);
  }

  console.log(`🔄 Restoring from: ${fileToRestore}`);
  const rawContent = fs.readFileSync(fileToRestore, "utf-8");
  const parsed = JSON.parse(rawContent);

  const projects = parsed.projects || [];
  if (!Array.isArray(projects) || projects.length === 0) {
    console.warn("⚠️ No projects found in backup file.");
    return;
  }

  let restoredCount = 0;
  for (const proj of projects) {
    const { error } = await supabase.from("projects").upsert(proj, { onConflict: "slug" });
    if (error) {
      console.error(`❌ Failed restoring project ${proj.slug}:`, error.message);
    } else {
      restoredCount++;
    }
  }

  console.log(`🎉 Restore completed: ${restoredCount}/${projects.length} projects upserted.`);
}

async function main() {
  const args = process.argv.slice(2);
  const isRestore = args.includes("--restore");

  if (isRestore) {
    const restoreIndex = args.indexOf("--restore");
    const specifiedFile = args[restoreIndex + 1];
    await runRestore(specifiedFile);
  } else {
    await runBackup();
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
