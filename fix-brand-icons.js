const fs = require('fs');

// ─── SVG Facebook (azul #0866FF en light, blanco en dark) ───────────────────
const fbLight = `<svg style="color:#0866FF" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><path fill="#0866FF" d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>`;
const fbDark  = `<svg style="color:#FFFFFF" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><path fill="#FFFFFF" d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>`;

// ─── SVG Google "G" multicolor (igual en light y dark) ──────────────────────
const googleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img"><title>Google</title><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`;
const googleDark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img"><title>Google</title><path fill="#FFFFFF" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#FFFFFF" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FFFFFF" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#FFFFFF" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`;

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

const fbLightB64   = b64(fbLight);
const fbDarkB64    = b64(fbDark);
const googleB64    = b64(googleSvg);
const googleDkB64  = b64(googleDark);

// ─── Nuevo componente FacebookIcon (usando el ícono "f") ────────────────────
const newFacebookIcon = `export const FacebookIcon = ({ className = '', ...props }: BrandIconProps) => (
  <>
    <img 
      src="data:image/svg+xml;base64,${fbLightB64}" 
      className={\`dark:hidden \${className}\`} 
      alt="Facebook" 
      {...props} 
    />
    <img 
      src="data:image/svg+xml;base64,${fbDarkB64}" 
      className={\`hidden dark:block \${className}\`} 
      alt="Facebook" 
      {...props} 
    />
  </>
);`;

// ─── Nuevo componente GoogleIcon (usando el "G" multicolor) ─────────────────
const newGoogleIcon = `export const GoogleIcon = ({ className = '', ...props }: BrandIconProps) => (
  <>
    <img 
      src="data:image/svg+xml;base64,${googleB64}" 
      className={\`dark:hidden \${className}\`} 
      alt="Google" 
      {...props} 
    />
    <img 
      src="data:image/svg+xml;base64,${googleDkB64}" 
      className={\`hidden dark:block \${className}\`} 
      alt="Google" 
      {...props} 
    />
  </>
);`;

// ─── Actualizar BrandIcons.tsx ───────────────────────────────────────────────
const brandIconsPath = 'D:/Proyectos/FlowChart/components/ui/BrandIcons.tsx';
let content = fs.readFileSync(brandIconsPath, 'utf8');

// Reemplazar FacebookIcon existente
content = content.replace(
  /export const FacebookIcon[\s\S]*?}\s*\);/,
  newFacebookIcon
);

// Añadir GoogleIcon si no existe, o reemplazar
if (content.includes('export const GoogleIcon')) {
  content = content.replace(
    /export const GoogleIcon[\s\S]*?}\s*\);/,
    newGoogleIcon
  );
} else {
  // Añadir después de FacebookIcon
  content = content.replace(
    /(export const FacebookIcon[\s\S]*?}\s*\);)/,
    '$1\n\n' + newGoogleIcon
  );
}

fs.writeFileSync(brandIconsPath, content);
console.log('BrandIcons.tsx updated with FacebookIcon and GoogleIcon');

// ─── Actualizar login/page.tsx ───────────────────────────────────────────────
const loginPath = 'D:/Proyectos/FlowChart/app/login/page.tsx';
let login = fs.readFileSync(loginPath, 'utf8');

// Cambiar importación: MetaIcon -> FacebookIcon, GoogleAdsIcon -> GoogleIcon
login = login.replace(
  /import\s*\{[^}]*\}\s*from\s*["']@\/components\/ui\/BrandIcons["']/,
  'import { FacebookIcon, GoogleIcon, TikTokIcon } from "@/components/ui/BrandIcons"'
);

// Cambiar MetaIcon -> FacebookIcon en el JSX
login = login.replace(/<MetaIcon /g, '<FacebookIcon ');
// Cambiar GoogleAdsIcon -> GoogleIcon en el JSX
login = login.replace(/<GoogleAdsIcon /g, '<GoogleIcon ');

fs.writeFileSync(loginPath, login);
console.log('login/page.tsx updated: MetaIcon->FacebookIcon, GoogleAdsIcon->GoogleIcon');
