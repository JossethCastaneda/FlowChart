import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function test() {
  const emailPayload = {
    from: process.env.RESEND_FROM_EMAIL || "SODARE <onboarding@resend.dev>",
    to: ["test@sodare.xyz"],
  };

  const templateId = process.env.RESEND_TEMPLATE_WORKSPACE_INVITE;
  if (templateId) {
    (emailPayload as any).template = {
      id: templateId,
      variables: {
        WORKSPACE_NAME: "Sodare",
        INVITE_URL: "http://localhost/invite/123",
        ROLE: "MEMBER",
      },
    };
  } else {
    (emailPayload as any).subject = "Test";
    (emailPayload as any).html = "<p>Test</p>";
  }

  console.log("Sending payload:", JSON.stringify(emailPayload, null, 2));

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify(emailPayload),
  });

  if (!res.ok) {
    console.error("Resend error:", await res.text());
  } else {
    console.log("Success:", await res.json());
  }
}

test();
