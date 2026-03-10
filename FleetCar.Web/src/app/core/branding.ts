export const fleetCarBranding = {
  name: 'FleetCar',
  tagline: 'Car rental management system',
  address: '123 Main Str Victorial Falls',
  phone: '+273774700574',
  email: 'tedwellzwane34@gmail.com'
} as const;

export const fleetCarLogoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 64" fill="none">
  <rect width="180" height="64" rx="20" fill="#ffffff"/>
  <path d="M18 38c0-7.18 5.82-13 13-13h44.4c6.48 0 12.62-2.88 16.78-7.86l3.4-4.08c1.52-1.82 3.77-2.86 6.14-2.86H130c8.84 0 16 7.16 16 16v12H18z" fill="#1f6fff"/>
  <path d="M42 22h34.8c4.18 0 8.18-1.72 11.02-4.76l4.98-5.34H72.68A15 15 0 0 0 61 17.52L42 22z" fill="#f59e0b"/>
  <circle cx="48" cy="41" r="8" fill="#142033"/>
  <circle cx="48" cy="41" r="3.2" fill="#ffffff"/>
  <circle cx="118" cy="41" r="8" fill="#142033"/>
  <circle cx="118" cy="41" r="3.2" fill="#ffffff"/>
  <path d="M100 17h19.6c5.74 0 10.4 4.66 10.4 10.4V30h-38l8-13z" fill="#60a5fa"/>
  <path d="M25 38h121" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
  <path d="M104 20h22" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
</svg>
`.trim();

export const fleetCarLogoDataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fleetCarLogoSvg)}`;
