import { Project, SyntaxKind, VariableDeclarationList } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths(["app/api/meta/**/route.ts", "app/api/publisher/**/route.ts"]);

let modifiedCount = 0;

for (const file of project.getSourceFiles()) {
  const text = file.getFullText();
  if (text.includes("validateBody")) continue; // Already processed

  const calls = file.getDescendantsOfKind(SyntaxKind.CallExpression);
  let changed = false;

  for (const call of calls) {
    if (call.getText() === "req.json()") {
      const awaitExpr = call.getParentIfKind(SyntaxKind.AwaitExpression);
      if (!awaitExpr) continue;

      const varDecl = awaitExpr.getParentIfKind(SyntaxKind.VariableDeclaration);
      const schemaKeys: string[] = [];

      if (varDecl) {
        // e.g. const body = await req.json();
        // Check if `body` is later destructured
        const nameNode = varDecl.getNameNode();
        if (nameNode.getKind() === SyntaxKind.Identifier) {
          const varName = nameNode.getText();
          // Find destructuring of varName
          const block = varDecl.getFirstAncestorByKind(SyntaxKind.Block);
          if (block) {
            const decls = block.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
            for (const d of decls) {
              const init = d.getInitializer();
              if (init && init.getText() === varName && d.getNameNode().getKind() === SyntaxKind.ObjectBindingPattern) {
                const binding = d.getNameNode().asKind(SyntaxKind.ObjectBindingPattern);
                if (binding) {
                  binding.getElements().forEach(el => {
                    schemaKeys.push(el.getNameNode().getText());
                  });
                }
              }
            }
          }
        } else if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
           // const { a, b } = await req.json();
           const binding = nameNode.asKind(SyntaxKind.ObjectBindingPattern);
           if (binding) {
              binding.getElements().forEach(el => {
                schemaKeys.push(el.getNameNode().getText());
              });
           }
        }
      }

      // Generate schema
      let schemaStr = "z.any()";
      if (schemaKeys.length > 0) {
         const objFields = schemaKeys.map(k => `${k}: z.any().optional()`).join(", ");
         schemaStr = `z.object({ ${objFields} })`;
      }

      // Replace await req.json() logic
      // We will replace the awaitExpr with a validateBody call
      const stmt = awaitExpr.getFirstAncestorByKind(SyntaxKind.VariableStatement) || awaitExpr.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
      if (stmt) {
        // Insert validate block before stmt
        const indent = "    ";
        
        const validateCode = `
${indent}const _validate = await validateBody(req, ${schemaStr});
${indent}if (!_validate.ok) return _validate.response;
${indent}const body = _validate.data;`;
        
        if (varDecl && varDecl.getNameNode().getKind() === SyntaxKind.Identifier) {
           // const body = await req.json() => replace entire statement
           stmt.replaceWithText(validateCode.trim());
        } else if (varDecl && varDecl.getNameNode().getKind() === SyntaxKind.ObjectBindingPattern) {
           // const { a, b } = await req.json() => replace with validate, then const { a, b } = body;
           const bindingTxt = varDecl.getNameNode().getText();
           stmt.replaceWithText(validateCode.trim() + `\n${indent}const ${bindingTxt} = body;`);
        } else {
           // Not assigned? Just replace
           stmt.replaceWithText(validateCode.trim());
        }
        changed = true;
      }
    }
  }

  if (changed) {
    // Add imports
    if (!file.getImportDeclaration("zod")) {
      file.addImportDeclaration({
        namedImports: ["z"],
        moduleSpecifier: "zod"
      });
    }
    if (!file.getImportDeclaration(decl => decl.getModuleSpecifierValue() === "@/lib/validate")) {
      file.addImportDeclaration({
        namedImports: ["validateBody"],
        moduleSpecifier: "@/lib/validate"
      });
    }
    file.saveSync();
    modifiedCount++;
  }
}

console.log("Modified " + modifiedCount + " files.");
