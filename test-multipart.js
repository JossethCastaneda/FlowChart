function buildMultipart(fields, fileBuffer, filename, contentType) {
  const boundary = "----WebKitFormBoundarySodare" + Math.random().toString(16).slice(2);
  let head = "";
  for (const [key, value] of Object.entries(fields)) {
    head += --\r\n;
    head += Content-Disposition: form-data; name=""\r\n\r\n;
    head += ${value}\r\n;
  }
  head += --\r\n;
  head += Content-Disposition: form-data; name="source"; filename=""\r\n;
  head += Content-Type: \r\n\r\n;
  const tail = \r\n----\r\n;
  const bodyBuffer = Buffer.concat([
    Buffer.from(head, "utf-8"),
    fileBuffer,
    Buffer.from(tail, "utf-8")
  ]);
  return { bodyBuffer, boundary };
}
console.log(buildMultipart({ message: "Hello" }, Buffer.from("test"), "test.jpg", "image/jpeg").boundary);
