const fs = require('fs');
async function test() {
  const fd = new FormData();
  const buffer = fs.readFileSync('C:/Users/josse/.gemini/antigravity/brain/8ae36e11-8094-48f0-a0cc-5d1c21c80e7c/media__1780283634304.png'); // This is not exactly correct path, let's just make a dummy 1x1 image
  
  const base64Pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXYzh8+PB/AAffA0nNPuPnAAAAAElFTkSuQmCC";
  const b = Buffer.from(base64Pixel, 'base64');
  const blob = new Blob([b], { type: 'image/png' });
  fd.append('source', blob, 'upload.png');
  // Need a valid pageToken to actually test.
}
test();
