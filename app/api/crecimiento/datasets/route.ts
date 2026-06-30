import { NextResponse } from "next/server";
import { withWorkspaceRole } from "@/lib/api-handler";
import prisma from "@/lib/prisma";

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const text = await file.text();
    const lines = text.split("\n");
    const headers = lines[0].split(",").map(h => h.trim());
    const rowCount = Math.max(0, lines.length - 1);

    const dataset = await prisma.ariaDataset.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: file.name,
        source: "csv",
        rowCount: rowCount,
        status: "ready"
      }
    });

    const columnsData = headers.map(h => ({
      datasetId: dataset.id,
      name: h,
      dataType: "string",
      isTarget: h.toLowerCase().includes("convertido") || h.toLowerCase().includes("target")
    }));

    await prisma.ariaDatasetColumn.createMany({
      data: columnsData
    });

    return NextResponse.json({
      id: dataset.id,
      name: dataset.name,
      rowCount: dataset.rowCount,
      columns: headers
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (req, ctx) => {
  try {
    const datasets = await prisma.ariaDataset.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(datasets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
