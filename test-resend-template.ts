async function test() {
  const emailPayload = {
    from: "SODARE <onboarding@resend.dev>",
    to: ["test@sodare.xyz"],
    template: {
      id: "tmpl_123",
      variables: {
        WORKSPACE_NAME: "Sodare"
      }
    }
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer re_123456789`,
    },
    body: JSON.stringify(emailPayload),
  });

  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}

test();
