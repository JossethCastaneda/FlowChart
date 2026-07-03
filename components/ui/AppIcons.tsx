import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

// Meta Ads / Meta Platforms
export const MetaIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path fillRule="evenodd" d="M8.217 5.243C9.145 3.988 10.171 3 11.483 3 13.96 3 16 6.153 16.001 9.907c0 2.29-.986 3.725-2.757 3.725-1.543 0-2.395-.866-3.924-3.424l-.667-1.123-.118-.197a55 55 0 0 0-.53-.877l-1.178 2.08c-1.673 2.925-2.615 3.541-3.923 3.541C1.086 13.632 0 12.217 0 9.973 0 6.388 1.995 3 4.598 3q.477-.001.924.122c.31.086.611.22.913.407.577.359 1.154.915 1.782 1.714m1.516 2.224q-.378-.615-.727-1.133L9 6.326c.845-1.305 1.543-1.954 2.372-1.954 1.723 0 3.102 2.537 3.102 5.653 0 1.188-.39 1.877-1.195 1.877-.773 0-1.142-.51-2.61-2.87zM4.846 4.756c.725.1 1.385.634 2.34 2.001A212 212 0 0 0 5.551 9.3c-1.357 2.126-1.826 2.603-2.581 2.603-.777 0-1.24-.682-1.24-1.9 0-2.602 1.298-5.264 2.846-5.264q.137 0 .27.018"/>
  </svg>
);

// Google Ads (Official Tri-color logo)
export const GoogleAdsIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 250.8 312.8"
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path fill="#3C8BD9" d="M85.9,28.6c2.4-6.3,5.7-12.1,10.6-16.8c19.6-19.1,52-14.3,65.3,9.7c10,18.2,20.6,36,30.9,54 c17.2,29.9,34.6,59.8,51.6,89.8c14.3,25.1-1.2,56.8-29.6,61.1c-17.4,2.6-33.7-5.4-42.7-21c-15.1-26.3-30.3-52.6-45.4-78.8 c-0.3-0.6-0.7-1.1-1.1-1.6c-1.6-1.3-2.3-3.2-3.3-4.9c-6.7-11.8-13.6-23.5-20.3-35.2c-4.3-7.6-8.8-15.1-13.1-22.7 c-3.9-6.8-5.7-14.2-5.5-22C83.6,36.2,84.1,32.2,85.9,28.6"/>
    <path fill="#FABC04" d="M85.9,28.6c-0.9,3.6-1.7,7.2-1.9,11c-0.3,8.4,1.8,16.2,6,23.5C101,82,112,101,122.9,120c1,1.7,1.8,3.4,2.8,5 c-6,10.4-12,20.7-18.1,31.1c-8.4,14.5-16.8,29.1-25.3,43.6c-0.4,0-0.5-0.2-0.6-0.5c-0.1-0.8,0.2-1.5,0.4-2.3 c4.1-15,0.7-28.3-9.6-39.7c-6.3-6.9-14.3-10.8-23.5-12.1c-12-1.7-22.6,1.4-32.1,8.9c-1.7,1.3-2.8,3.2-4.8,4.2 c-0.4,0-0.6-0.2-0.7-0.5c4.8-8.3,9.5-16.6,14.3-24.9C45.5,98.4,65.3,64,85.2,29.7C85.4,29.3,85.7,29,85.9,28.6"/>
    <path fill="#34A852" d="M11.8,158c1.9-1.7,3.7-3.5,5.7-5.1c24.3-19.2,60.8-5.3,66.1,25.1c1.3,7.3,0.6,14.3-1.6,21.3 c-0.1,0.6-0.2,1.1-0.4,1.7c-0.9,1.6-1.7,3.3-2.7,4.9c-8.9,14.7-22,22-39.2,20.9C20,225.4,4.5,210.6,1.8,191 c-1.3-9.5,0.6-18.4,5.5-26.6c1-1.8,2.2-3.4,3.3-5.2C11.1,158.8,10.9,158,11.8,158"/>
  </svg>
);

// TikTok Ads
export const TikTokAdsIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.28 6.28 0 00-6.28 6.28 6.28 6.28 0 006.28 6.28 6.28 6.28 0 006.28-6.28V8.87a8.2 8.2 0 004.78 1.53V7a4.84 4.84 0 01-.96-.31z"/>
  </svg>
);

// WhatsApp Business
export const WhatsAppIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Telegram
export const TelegramIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.12.82-2.52 10.6-2.64 11.23-.08.43-.24.58-.39.6-.33.03-.58-.22-.9-.43-.5-.33-.78-.53-1.27-.85-.57-.37-.2-.57.12-1.1.09-.14 1.58-1.45 1.87-1.57.04-.02.08-.07.08-.12 0-.05-.03-.09-.08-.08-.07.01-1.12.71-3.16 2.09-.3.2-.56.3-.79.3-.25-.01-.73-.15-1.09-.27-.44-.14-.79-.22-.76-.47.02-.13.2-.26.54-.39 2.15-.93 3.59-1.55 4.31-1.85 1.25-.51 1.51-.6 1.68-.6.04 0 .12.01.18.06.05.04.09.11.1.2.02.13.01.3-.01.47z"/>
  </svg>
);

// LinkedIn
export const LinkedInIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

// X (formerly Twitter)
export const XIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// HubSpot
export const HubSpotIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984v-.066A2.198 2.198 0 0017.235.838h-.066a2.198 2.198 0 00-2.196 2.196v.066c0 .867.51 1.615 1.244 1.97v2.862a5.85 5.85 0 00-2.692 1.308l-7.15-5.558a2.396 2.396 0 00.075-.575A2.41 2.41 0 004.04.697a2.41 2.41 0 00-2.41 2.41 2.41 2.41 0 002.41 2.41c.47 0 .905-.14 1.275-.374l7.03 5.467a5.876 5.876 0 00-.91 3.143c0 1.162.34 2.244.92 3.158l-2.17 2.17a1.932 1.932 0 00-.57-.094 1.974 1.974 0 00-1.974 1.974 1.974 1.974 0 001.974 1.974 1.974 1.974 0 001.974-1.974c0-.2-.032-.39-.087-.572l2.126-2.126a5.882 5.882 0 003.542 1.183c3.254 0 5.892-2.638 5.892-5.892a5.882 5.882 0 00-5.892-5.892 5.86 5.86 0 00-1.74.27zM17.2 17.606a2.82 2.82 0 01-2.823-2.823 2.82 2.82 0 012.823-2.823 2.82 2.82 0 012.823 2.823 2.82 2.82 0 01-2.823 2.823z"/>
  </svg>
);

// Google Analytics 4
export const GA4Icon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path fill="#F9AB00" d="M22.84 2.998v17.004a3 3 0 01-2.998 2.998 3 3 0 01-2.998-2.998V2.998A3 3 0 0119.842 0a3 3 0 012.998 2.998z"/>
    <path fill="#E37400" d="M12.5 9.002v10.998A3 3 0 019.502 23a3 3 0 01-2.998-2.998V9.002A3 3 0 019.502 6.004a3 3 0 012.998 2.998z"/>
    <circle cx="3.498" cy="19.502" r="3.498" fill="#E37400"/>
  </svg>
);

// Google Tag Manager
export const GTMIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path fill="#8AB4F8" d="M12 0L1.608 6v12L12 24l10.392-6V6L12 0z"/>
    <path fill="#4285F4" d="M12 0L1.608 6l4.5 2.6L12 5.2l5.892 3.4 4.5-2.6L12 0zM17.892 8.6V20.6l4.5-2.6V6l-4.5 2.6z"/>
    <path fill="#3367D6" d="M6.108 8.6L1.608 6v12l4.5 2.6V8.6z"/>
    <path fill="#ffffff" d="M12 18.8l-5.892-3.4V8.6L12 12l5.892-3.4v6.8L12 18.8z"/>
  </svg>
);

// Messenger
export const MessengerIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.889-3.259-6.559 6.963z"/>
  </svg>
);

// Instagram
export const InstagramIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

// Botmaker
export const BotmakerIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path fill="#1E40AF" d="M12 2C6.48 2 2 6.03 2 11c0 2.91 1.54 5.51 3.97 7.09L5 22l4.31-2.15c.87.23 1.78.36 2.69.36 5.52 0 10-4.03 10-9s-4.48-9-10-9z"/>
    <path fill="#FFFFFF" d="M9 7h3c1.38 0 2.5 1.12 2.5 2.5c0 .87-.45 1.63-1.13 2.07c.88.39 1.63 1.18 1.63 2.43c0 1.38-1.12 2.5-2.5 2.5H9V7zm2 4c.55 0 1-.45 1-1s-.45-1-1-1h-1v2h1zm0 4.5c.55 0 1-.45 1-1s-.45-1-1-1h-1v2h1z"/>
    <circle cx="15.5" cy="8.5" r="0.8" fill="#FFFFFF"/>
    <circle cx="17.5" cy="10.5" r="0.8" fill="#FFFFFF"/>
  </svg>
);

// Cari AI
export const CariAIIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="24" height="24" rx="12" fill="#0B7A5C"/>
    <path fill="#FFFFFF" fillOpacity="0.6" d="M8 8c0 .83 1.79 1.5 4 1.5s4-.67 4-1.5S14.21 6.5 12 6.5S8 7.17 8 8zm0 3.25c0 .83 1.79 1.5 4 1.5s4-.67 4-1.5V9.5c0 .83-1.79 1.5-4 1.5s-4-.67-4-1.5v1.75zm0 3.25c0 .83 1.79 1.5 4 1.5s4-.67 4-1.5V12.75c0 .83-1.79 1.5-4 1.5s-4-.67-4-1.5V14.5z"/>
    <circle cx="12" cy="7.5" r="1.2" fill="#FFFFFF"/>
    <circle cx="16" cy="11.5" r="1.2" fill="#FFFFFF"/>
    <circle cx="8" cy="11.5" r="1.2" fill="#FFFFFF"/>
    <circle cx="12" cy="15.5" r="1.2" fill="#FFFFFF"/>
    <line x1="12" y1="7.5" x2="16" y2="11.5" stroke="#FFFFFF" strokeWidth="0.8"/>
    <line x1="12" y1="7.5" x2="8" y2="11.5" stroke="#FFFFFF" strokeWidth="0.8"/>
    <line x1="8" y1="11.5" x2="12" y2="15.5" stroke="#FFFFFF" strokeWidth="0.8"/>
    <line x1="16" y1="11.5" x2="12" y2="15.5" stroke="#FFFFFF" strokeWidth="0.8"/>
  </svg>
);

// Sodare Brand Logo
export const SodareIcon: React.FC<IconProps> = ({ size = 20, ...props }) => (
  <svg
    viewBox="0 0 40 40"
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient id="sodareGradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5b9bff" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <path fill="url(#sodareGradIcon)" d="M20 2C10.06 2 2 10.06 2 20s8.06 18 18 18s18-8.06 18-18S29.94 2 20 2zm6.2 24.3c-2.4 2.4-5.6 3.7-9 3.7c-3.1 0-5.8-1.1-7.8-2.9c.9-.9 1.8-1.8 2.7-2.7c1.3.9 3.1 1.6 5.1 1.6c4.5 0 8.1-3.6 8.1-8.1s-3.6-8.1-8.1-8.1c-2.4 0-4.6 1.1-6.1 2.8c.8.9 1.6 1.7 2.4 2.5c.9-1 2.2-1.7 3.7-1.7c2.5 0 4.5 2 4.5 4.5s-2 4.5-4.5 4.5c-.8 0-1.5-.2-2.1-.6L9 21.8C9.6 26.4 14.4 30 20 30c5.6 0 10.4-3.6 11-8.2l-4.8 2.5z"/>
  </svg>
);

// Map of all app icons for easy dynamic loading
export const APP_ICONS: Record<string, React.FC<IconProps>> = {
  meta: MetaIcon,
  facebook: MetaIcon,
  google: GoogleAdsIcon,
  google_ads: GoogleAdsIcon,
  tiktok: TikTokAdsIcon,
  tiktok_ads: TikTokAdsIcon,
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
  linkedin: LinkedInIcon,
  linkedin_ads: LinkedInIcon,
  x: XIcon,
  x_ads: XIcon,
  hubspot: HubSpotIcon,
  ga4: GA4Icon,
  google_analytics: GA4Icon,
  gtm: GTMIcon,
  google_tag: GTMIcon,
  messenger: MessengerIcon,
  instagram: InstagramIcon,
  botmaker: BotmakerIcon,
  cari: CariAIIcon,
  cari_ai: CariAIIcon,
  sodare: SodareIcon,
};

// Helper to get platform icon component dynamically
export function getPlatformIcon(platformId: string): React.FC<IconProps> | null {
  if (!platformId) return null;
  const cleanId = platformId.toLowerCase().trim();
  return APP_ICONS[cleanId] || null;
}
