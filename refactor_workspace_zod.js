const { Project } = require("ts-morph");

const project = new Project({ tsConfigFilePath: "tsconfig.json" });

const files = [
  { path: 'app/api/workspace/integrations/route.ts', schema: 'z.object({ provider: z.string().min(1, "provider requerido") })', extract: 'const { provider } = result.data;' },
  { path: 'app/api/workspace/members/status/route.ts', schema: 'z.object({ status: z.enum(["ONLINE", "OFFLINE", "AWAY", "BUSY", "DO_NOT_DISTURB"]) })', extract: 'const { status } = result.data;' },
  { path: 'app/api/workspace/route.ts', schema: 'z.object({ name: z.string().min(2, "Name required") })', extract: 'const { name } = result.data;' },
  { path: 'app/api/workspace/switch/route.ts', schema: 'z.object({ workspaceId: z.string().min(1, "Workspace ID required") })', extract: 'const { workspaceId } = result.data;' },
  { path: 'app/api/workspace/[workspaceId]/invite/route.ts', schema: 'z.object({ email: z.string().email("Email inválido"), role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER") })', extract: 'const { email, role } = result.data;' },
  { path: 'app/api/workspace/[workspaceId]/members/role/route.ts', schema: 'z.object({ userId: z.string().min(1), role: z.enum(["OWNER", "ADMIN", "MEMBER"]) })', extract: 'const { userId, role } = result.data;' },
  { path: 'app/api/workspace/[workspaceId]/members/route.ts', schema: 'z.object({ userId: z.string().min(1, "Missing userId") })', extract: 'const { userId } = result.data;' },
  { path: 'app/api/workspace/[workspaceId]/route.ts', schema: 'z.object({ name: z.string().min(1, "Name required") })', extract: 'const { name } = result.data;' }
];

for (const { path, schema, extract } of files) {
  const sf = project.getSourceFile(path);
  if (!sf) continue;

  sf.addImportDeclaration({ namedImports: ["z"], moduleSpecifier: "zod" });
  sf.addImportDeclaration({ namedImports: ["validateBody"], moduleSpecifier: "@/lib/validate" });

  sf.addVariableStatement({
    isExported: false,
    declarations: [{ name: "RequestSchema", initializer: schema }]
  });

  const posts = sf.getFunctions().filter(f => f.getName() === "POST" || f.getName() === "PUT" || f.getName() === "PATCH" || f.getName() === "DELETE");
  for (const post of posts) {
    const bodyText = post.getBodyText();
    if (bodyText.includes("await req.json()")) {
      // Very naive string replacement
      let newBody = bodyText.replace(/const body = await req\.json\(\)\.catch\(\(\) => null\);/g, '');
      newBody = newBody.replace(/const body = await req\.json\(\);/g, '');
      newBody = newBody.replace(/const { [^}]+ } = body;/g, '');
      newBody = newBody.replace(/const { [^}]+ } = await req\.json\(\);/g, '');
      newBody = newBody.replace(/if \(![^}]+\) \{\n\s*return NextResponse\.json\([^)]+\);\n\s*\}/g, '');
      
      const validationCode = `
      const result = await validateBody(req, RequestSchema);
      if (!result.ok) return result.response;
      ${extract}
      `;
      // Prepend it right after `try {` or at start if no try
      if (newBody.includes('try {')) {
        newBody = newBody.replace('try {', 'try {' + validationCode);
      } else {
        newBody = validationCode + newBody;
      }
      post.setBodyText(newBody);
    }
  }
}

project.saveSync();
console.log("Applied Zod validation to workspace endpoints");
