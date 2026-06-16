const fs = require('fs');

let content = fs.readFileSync('app/api/publisher/publish/route.ts', 'utf8');

const oldLogic = `    // Try publisher_facebook token first, fallback to meta, then social
    let accessToken = await getMetaAccessToken(req, "publisher_facebook");
    if (!accessToken) accessToken = await getMetaAccessToken(req, "publisher");
    if (!accessToken) accessToken = await getMetaAccessToken(req, "social");
    if (!accessToken) accessToken = await getMetaAccessToken(req);

    if (!accessToken) {
      return NextResponse.json(
        { error: "No hay cuenta de Facebook conectada. Ve al Publisher y conecta tu cuenta de Facebook." },
        { status: 401 }
      );
    }

    // Fetch ALL pages with pagination (user may have 100+)
    let pages: any[] = [];
    let nextPagesUrl: string | null = \`https://graph.facebook.com/\${META_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100\`;
    while (nextPagesUrl) {
      const pagesRes = await metaFetch(nextPagesUrl, accessToken);
      const pagesJson = await pagesRes.json();
      if (pagesJson.error) {
        console.error("[PUBLISHER] Error fetching pages:", JSON.stringify(pagesJson.error));
        break;
      }
      pages = [...pages, ...(pagesJson.data || [])];
      // Strip access_token from paging.next — metaFetch adds Bearer header
      const rawNext = pagesJson.paging?.next || null;
      if (rawNext) {
        try {
          const u = new URL(rawNext);
          u.searchParams.delete("access_token");
          nextPagesUrl = u.toString();
        } catch {
          nextPagesUrl = null;
        }
      } else {
        nextPagesUrl = null;
      }
    }

    if (pages.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron páginas de Facebook. Verifica permisos." },
        { status: 400 }
      );
    }

    let targetPage = pages[0];
    if (post.pageId) {
      const found = pages.find((p: any) => p.id === post.pageId);
      if (found) targetPage = found;
    } else if (post.pageName) {
      const found = pages.find((p: any) => p.name === post.pageName);
      if (found) targetPage = found;
    }

    const pageToken = targetPage.access_token;
    const pageId = targetPage.id;
    const igUserId = targetPage.instagram_business_account?.id;

    // ── Log key state for debugging ──
    console.log("[PUBLISHER] postId:", postId, "channels:", post.channels, "pageId:", pageId, "pageToken present:", !!pageToken, "igUserId:", igUserId || "none");`;

const newLogic = `    let fbAccessToken = await getMetaAccessToken(req, "publisher_facebook");
    if (!fbAccessToken) fbAccessToken = await getMetaAccessToken(req, "publisher");
    if (!fbAccessToken) fbAccessToken = await getMetaAccessToken(req, "social");
    if (!fbAccessToken) fbAccessToken = await getMetaAccessToken(req);

    let igAccessToken = await getMetaAccessToken(req, "publisher_instagram");
    if (!igAccessToken) igAccessToken = fbAccessToken;

    async function fetchTargetPage(token: string) {
      let pages: any[] = [];
      let nextPagesUrl: string | null = \`https://graph.facebook.com/\${META_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100\`;
      while (nextPagesUrl) {
        const pagesRes = await metaFetch(nextPagesUrl, token);
        const pagesJson = await pagesRes.json();
        if (pagesJson.error) {
          console.error("[PUBLISHER] Error fetching pages:", JSON.stringify(pagesJson.error));
          break;
        }
        pages = [...pages, ...(pagesJson.data || [])];
        const rawNext = pagesJson.paging?.next || null;
        if (rawNext) {
          try {
            const u = new URL(rawNext);
            u.searchParams.delete("access_token");
            nextPagesUrl = u.toString();
          } catch { nextPagesUrl = null; }
        } else {
          nextPagesUrl = null;
        }
      }
      if (pages.length === 0) return null;
      let target = pages[0];
      if (post?.pageId) {
        const found = pages.find((p: any) => p.id === post.pageId);
        if (found) target = found;
      } else if (post?.pageName) {
        const found = pages.find((p: any) => p.name === post.pageName);
        if (found) target = found;
      }
      return target;
    }

    let fbPageToken = "";
    let igPageToken = "";
    let fbPageId = "";
    let igPageId = "";
    let igUserId = "";
    let targetPageName = "";

    if (post.channels.includes("facebook")) {
      if (!fbAccessToken) {
        return NextResponse.json({ error: "No hay cuenta de Facebook conectada. Ve a Integraciones y conecta tu cuenta." }, { status: 401 });
      }
      const target = await fetchTargetPage(fbAccessToken);
      if (!target) return NextResponse.json({ error: "No se encontraron páginas de Facebook. Verifica permisos." }, { status: 400 });
      fbPageToken = target.access_token;
      fbPageId = target.id;
      targetPageName = target.name;
    }

    if (post.channels.includes("instagram")) {
      if (!igAccessToken) {
        return NextResponse.json({ error: "No hay cuenta de Instagram conectada. Ve a Integraciones y conecta tu cuenta." }, { status: 401 });
      }
      const target = await fetchTargetPage(igAccessToken);
      if (!target) return NextResponse.json({ error: "No se encontraron cuentas de Instagram. Verifica permisos." }, { status: 400 });
      igPageToken = target.access_token;
      igPageId = target.id;
      igUserId = target.instagram_business_account?.id;
      if (!targetPageName) targetPageName = target.name;
      if (!igUserId) {
        return NextResponse.json({ error: "La página seleccionada no tiene una cuenta de Instagram Business vinculada." }, { status: 400 });
      }
    }

    const pageToken = fbPageToken || igPageToken;
    const pageId = fbPageId || igPageId;
    
    // Update targetPage for the db update step
    const targetPage = { name: targetPageName, id: pageId };

    // ── Log key state for debugging ──
    console.log("[PUBLISHER] postId:", postId, "channels:", post.channels, "fbPageId:", fbPageId, "igPageId:", igPageId, "igUserId:", igUserId || "none");`;

content = content.replace(oldLogic, newLogic);

const oldFb = `    // ── Publish to Facebook ──
    if (post.channels.includes("facebook")) {
      try {`;

const newFb = `    // ── Publish to Facebook ──
    if (post.channels.includes("facebook")) {
      const pageToken = fbPageToken;
      const pageId = fbPageId;
      try {`;

content = content.replace(oldFb, newFb);

const oldIg = `    // ── Publish to Instagram ──
    if (post.channels.includes("instagram") && igUserId && post.status !== "Scheduled") {
      try {`;

const newIg = `    // ── Publish to Instagram ──
    if (post.channels.includes("instagram") && igUserId && post.status !== "Scheduled") {
      const pageToken = igPageToken;
      const pageId = igPageId;
      try {`;

content = content.replace(oldIg, newIg);

fs.writeFileSync('app/api/publisher/publish/route.ts', content, 'utf8');
console.log('Patched');
