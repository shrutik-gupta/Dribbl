/* Image uploads are shrunk in the browser and stored as data URLs inside Firestore documents. */

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

/* Square 192px JPEG for profile photos */
export async function compressImage(file) {
  const img = await loadImage(file);
  const s = 192, c = document.createElement("canvas");
  c.width = s; c.height = s;
  const r = Math.max(s / img.width, s / img.height), w = img.width * r, h = img.height * r;
  c.getContext("2d").drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
  return c.toDataURL("image/jpeg", .8);
}

/* UPI QR codes keep their shape and stay sharp enough to scan */
export async function compressQR(file) {
  const img = await loadImage(file);
  const max = 520, r = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  let url = c.toDataURL("image/png");
  if (url.length > 180000) url = c.toDataURL("image/jpeg", .92);
  return url;
}
