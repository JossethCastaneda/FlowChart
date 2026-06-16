import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const result: Record<string, any> = {};
  
  // Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    result.database = "ok";
  } catch (err: any) {
    result.database = `error: ${err.message}`;
  }

  // Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    result.blob = "ok";
  } else {
    result.blob = "missing BLOB_READ_WRITE_TOKEN";
  }

  // Meta (Facebook / General)
  result.meta = {
    appId: process.env.NEXT_PUBLIC_META_APP_ID ? "ok" : "missing",
    appSecret: process.env.META_APP_SECRET ? "ok" : "missing",
    apiVersion: process.env.META_API_VERSION ? "ok" : "missing",
  };

  // Instagram Direct
  result.instagramDirect = {
    appId: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ? "ok" : "missing",
    appSecret: process.env.INSTAGRAM_APP_SECRET ? "ok" : "missing",
    redirectUri: process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI ? "ok" : "missing",
    scopes: process.env.NEXT_PUBLIC_INSTAGRAM_SCOPES ? "ok" : "missing",
  };

  // Scheduler & Workers
  result.scheduler = {
    cronSecret: process.env.CRON_SECRET ? "ok" : "missing",
    workerSecret: process.env.PUBLISH_WORKER_SECRET ? "ok" : "missing",
  };

  // QStash (cola de publicación programada)
  result.qstash = {
    token: process.env.QSTASH_TOKEN ? "ok" : "missing",
    // Sin claves de firma el worker cae al bearer y el failureCallback no autentica.
    signingKeys:
      process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY
        ? "ok"
        : "missing",
    workerBaseUrl:
      process.env.QSTASH_WORKER_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "default (https://sodare.xyz)",
  };

  // Security
  result.security = {
    encryptionKey: process.env.ENCRYPTION_KEY ? "ok" : "missing",
  };

  return NextResponse.json(result);
}
