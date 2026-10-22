/* Rendu de courriel adapté : styles inline, tableaux de présentation, données échappées. */
(() => {
  "use strict";
  function escape(value) {
    return String(value).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
  }
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const paragraph = `${font}font-size:16px;line-height:1.6;margin:0 0 16px;color:#161616;`;
  function body(doc) {
    MailDocument.validate(doc);
    const rows = doc.blocks.map(block => {
      if (block.type === "image") return `<tr><td style="padding:16px 24px;"><img src="${escape(block.image)}" alt="${escape(block.alt)}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;"></td></tr>`;
      if (block.type === "button") return `<tr><td style="padding:16px 24px 28px;"><a href="${escape(block.url)}" style="${font}display:inline-block;background:#000091;color:#fff;text-decoration:underline;font-size:16px;font-weight:bold;padding:14px 20px;">${escape(block.title)}</a></td></tr>`;
      return `<tr><td style="padding:20px 24px;">${block.title.trim() ? `<h2 style="${font}font-size:22px;line-height:1.4;color:#000091;margin:0 0 12px;">${escape(block.title)}</h2>` : ""}${block.body.split(/\n\n+/).map(p => `<p style="${paragraph}">${escape(p).replace(/\n/g, "<br>")}</p>`).join("")}${block.url ? `<p style="${paragraph}"><a href="${escape(block.url)}" style="color:#000091;">Consulter la source</a></p>` : ""}</td></tr>`;
    }).join("\n");
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f6f6;"><tr><td align="center" style="padding:20px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:white;border-top:5px solid #000091;">
<tr><td style="padding:24px;"><img src="${escape(doc.logo)}" width="76" height="66" alt="République française" style="display:block;border:0;"><p style="${paragraph}font-weight:bold;margin:16px 0 0;">${escape(doc.service)}</p></td></tr>
${doc.subject.trim() ? `<tr><td style="padding:24px;background:#ececfe;"><h1 style="${font}font-size:28px;line-height:1.4;color:#161616;margin:0;">${escape(doc.subject)}</h1></td></tr>` : ""}
${rows}
<tr><td style="padding:24px;background:#eee;border-top:1px solid #ddd;"><p style="${font}font-size:14px;line-height:1.6;color:#3a3a3a;margin:0;">${escape(doc.footer).replace(/\n/g, "<br>")}</p></td></tr>
</table></td></tr></table>`;
  }
  function html(doc) {
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(doc.subject)}</title></head><body style="margin:0;padding:0;">${body(doc)}</body></html>`;
  }
  function plain(doc) {
    return [doc.service, doc.subject, ...doc.blocks.map(b => b.type === "image" ? b.alt : [b.title, b.type === "button" ? "" : b.body, b.url].filter(Boolean).join("\n")), doc.footer].join("\n\n");
  }
  window.MailRender = Object.freeze({html, body, plain, escape});
})();
