const notice157Original = MailBuilder.notice;
MailBuilder.notice = (message, since) => {
  if (String(message).startsWith("Courriel copié en HTML et texte.")) {
    setTimeout(() => notice157Original(message, since), 250);
  } else notice157Original(message, since);
};