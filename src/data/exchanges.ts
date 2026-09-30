// Referans linkleri env'den; tanımlı değilse varsayılan linkler kullanılır.
export const exchanges = [
  {
    name: 'Binance',
    url: import.meta.env.PUBLIC_BINANCE_URL ?? 'https://www.binance.com/en/copy-trading/lead-details/4965482140792366337?ref=1116146315',
    logo: '/assets/logos/binance.png',
  },
  {
    name: 'Bybit',
    url: import.meta.env.PUBLIC_BYBIT_URL ?? 'https://bybit.onelink.me/EhY6/8h2m7q19',
    logo: '/assets/logos/bybit.png',
  },
];
