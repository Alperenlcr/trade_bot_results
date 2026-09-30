// Ayrı modül: App.tsx (istemci) import ettiğinde i18n sözlükleri pakete girmesin.
// ||: deploy.yml tanımsız GitHub değişkenini boş metin olarak geçirir.
export const contactUrl = import.meta.env.PUBLIC_CONTACT_URL || 'mailto:info@executortrading.com';
